import os
import json
import asyncio
from pathlib import Path
import uuid
from typing import AsyncGenerator
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from google.antigravity import Agent, LocalAgentConfig
from google.antigravity import types as ag_types

env_path = Path(__file__).resolve().parent.parent / ".env"
if env_path.exists():
    load_dotenv(env_path)

BASE_DIR = Path(
    os.getenv("AGENT_WORKSPACE", str(Path(__file__).resolve().parent.parent / "workspace"))
).resolve()
BASE_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Lilith Agent Engine")
file_lock = asyncio.Lock()

SYSTEM_PROMPT = (
    "Você é Lilith, uma assistente de codificação especializada em editar "
    "arquivos de projetos JavaScript/TypeScript/Next.js.\n\n"
    "REGRAS:\n"
    f"1. Você opera estritamente dentro da pasta '{BASE_DIR}'.\n"
    "2. Use ler_arquivo para ler arquivos, editar_arquivo para escrever/modificar, e executar_comando para rodar comandos de terminal (você está em um ambiente Windows, use sintaxe PowerShell).\n"
    "3. ANTES de chamar qualquer ferramenta, você DEVE explicar em voz alta o "
    "que vai fazer, por que e qual será o próximo passo. Exemplo: "
    "'Vou ler o arquivo X para entender a estrutura atual...' ou "
    "'Agora vou editar o arquivo Y substituindo a função Z...'.\n"
    "4. NUNCA chame uma ferramenta sem antes narrar o que será feito.\n"
    "5. Se encontrar um erro, narre IMEDIATAMENTE o erro e peça instruções.\n"
    "6. Se o usuário pedir uma alteração complexa, primeiro leia o arquivo, "
    "depois explique o plano, depois aplique a edição.\n"
    "7. Responda em português, de forma clara e natural.\n"
    "8. CRÍTICO: Ao usar executar_comando (especialmente npx, npm, etc.), você DEVE usar flags não interativas (como -y, --yes, --template) para evitar que o comando trave esperando input do usuário. NUNCA execute comandos interativos."
)


def validar_caminho(caminho: str) -> Path:
    resolved = (BASE_DIR / caminho).resolve()
    try:
        resolved.relative_to(BASE_DIR)
    except ValueError:
        raise PermissionError(
            f"Acesso negado: '{caminho}' está fora do workspace '{BASE_DIR}'."
        )
    return resolved


async def ler_arquivo(caminho: str) -> str:
    caminho_resolvido = validar_caminho(caminho)
    async with file_lock:
        if not caminho_resolvido.exists():
            return f"Arquivo '{caminho}' não encontrado."
        if not caminho_resolvido.is_file():
            return f"'{caminho}' não é um arquivo."
        return caminho_resolvido.read_text(encoding="utf-8")


async def editar_arquivo(caminho: str, novo_conteudo: str) -> str:
    caminho_resolvido = validar_caminho(caminho)
    async with file_lock:
        caminho_resolvido.parent.mkdir(parents=True, exist_ok=True)
        caminho_resolvido.write_text(novo_conteudo, encoding="utf-8")
    return f"Arquivo '{caminho}' salvo com sucesso."


async def executar_comando(comando: str) -> str:
    async with file_lock:
        process = await asyncio.create_subprocess_exec(
            "powershell.exe", "-Command", comando,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=BASE_DIR
        )
        stdout, stderr = await process.communicate()
        output = stdout.decode('utf-8', errors='replace') + stderr.decode('utf-8', errors='replace')
        return output if output else "Comando executado com sucesso (sem saída)."


class ExecuteRequest(BaseModel):
    input: str


agent_instance = None
agent_lock = asyncio.Lock()


async def get_agent() -> Agent:
    global agent_instance
    if agent_instance is None:
        config = LocalAgentConfig(
            system_instructions=SYSTEM_PROMPT,
            model="gemini-3.5-flash",
            tools=[ler_arquivo, editar_arquivo, executar_comando],
            workspaces=[str(BASE_DIR)],
        )
        agent_instance = Agent(config)
        await agent_instance.__aenter__()
    return agent_instance


async def stream_agent(input_text: str) -> AsyncGenerator[str, None]:
    # print(f"\n[AGENT: Sync] Execução iniciada. Prompt: {input_text}")
    try:
        async with agent_lock:
            agent = await get_agent()
            response = await agent.chat(input_text)
            async for chunk in response.chunks:
                if isinstance(chunk, ag_types.Text):
                    # print(f"[AGENT: Texto] {chunk.text}")
                    yield f"data: {json.dumps({'type': 'narracao', 'content': chunk.text, 'chunk': chunk.text})}\n\n"
                elif isinstance(chunk, ag_types.ToolCall):
                    # print(f"[AGENT: Ferramenta Iniciada] {chunk.name} - {chunk.args}")
                    yield f"data: {json.dumps({'type': 'ferramenta', 'nome': chunk.name, 'args': chunk.args, 'status': 'executando'})}\n\n"
                    if chunk.name == "editar_arquivo":
                        caminho = chunk.args.get("caminho", "")
                        yield f"data: {json.dumps({'type': 'narracao', 'content': f'Editando o arquivo {caminho}...', 'chunk': f'Editando {caminho}...'})}\n\n"
                    elif chunk.name == "ler_arquivo":
                        caminho = chunk.args.get("caminho", "")
                        yield f"data: {json.dumps({'type': 'narracao', 'content': f'Lendo o arquivo {caminho}...', 'chunk': f'Lendo {caminho}...'})}\n\n"
                    elif chunk.name == "executar_comando":
                        comando = chunk.args.get("comando", "")
                        yield f"data: {json.dumps({'type': 'narracao', 'content': f'Executando comando no terminal: {comando}', 'chunk': f'Comando {comando}'})}\n\n"
                    else:
                        yield f"data: {json.dumps({'type': 'narracao', 'content': f'Usando ferramenta {chunk.name}...', 'chunk': f'Usando {chunk.name}...'})}\n\n"
                elif isinstance(chunk, ag_types.ToolResult):
                    if chunk.error:
                        pass # print(f"[AGENT: Ferramenta Erro] {chunk.name}: {chunk.error}")
                    else:
                        pass # print(f"[AGENT: Ferramenta Concluída] {chunk.name}")
                    status = 'erro' if chunk.error else 'concluido'
                    msg = chunk.error or ''
                    yield f"data: {json.dumps({'type': 'ferramenta', 'nome': chunk.name, 'status': status, 'mensagem': msg})}\n\n"
                    if chunk.error:
                        yield f"data: {json.dumps({'type': 'narracao', 'content': f'Erro ao executar {chunk.name}: {chunk.error}', 'chunk': ''})}\n\n"
                    else:
                        yield f"data: {json.dumps({'type': 'narracao', 'content': f'{chunk.name} concluído com sucesso.', 'chunk': ''})}\n\n"
                elif isinstance(chunk, ag_types.Thought):
                    # print(f"[AGENT: Pensando] {chunk.text}")
                    yield f"data: {json.dumps({'type': 'pensamento', 'content': chunk.text})}\n\n"
        # print(f"[AGENT: Sync] Execução concluída.")
        yield f"data: {json.dumps({'type': 'fim'})}\n\n"
        yield "data: [DONE]\n\n"
    except Exception as e:
        # print(f"[AGENT: Sync] Erro: {e}")
        yield f"data: {json.dumps({'type': 'erro', 'content': str(e)})}\n\n"
        yield "data: [DONE]\n\n"


@app.post("/execute")
async def execute(req: ExecuteRequest):
    return StreamingResponse(
        stream_agent(req.input),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


active_tasks = {}

async def run_agent_task(task_id: str, input_text: str):
    print(f"\n[AGENT: Async] Task {task_id} iniciada. Prompt: {input_text}")
    tasks = active_tasks
    tasks[task_id] = {"status": "running", "logs": "", "result": None}
    try:
        async with agent_lock:
            agent = await get_agent()
            response = await agent.chat(input_text)
            async for chunk in response.chunks:
                if isinstance(chunk, ag_types.Text):
                    print(f"[AGENT: Texto] {chunk.text}")
                    tasks[task_id]["logs"] += chunk.text + "\n"
                elif isinstance(chunk, ag_types.ToolCall):
                    print(f"[AGENT: Ferramenta Iniciada] {chunk.name} - {chunk.args}")
                    if chunk.name == "editar_arquivo":
                        caminho = chunk.args.get("caminho", "")
                        tasks[task_id]["logs"] += f"Editando o arquivo {caminho}...\n"
                    elif chunk.name == "ler_arquivo":
                        caminho = chunk.args.get("caminho", "")
                        tasks[task_id]["logs"] += f"Lendo o arquivo {caminho}...\n"
                    elif chunk.name == "executar_comando":
                        comando = chunk.args.get("comando", "")
                        tasks[task_id]["logs"] += f"Executando comando: {comando}...\n"
                    else:
                        tasks[task_id]["logs"] += f"Usando ferramenta {chunk.name}...\n"
                elif isinstance(chunk, ag_types.ToolResult):
                    if chunk.error:
                        print(f"[AGENT: Ferramenta Erro] {chunk.name}: {chunk.error}")
                        tasks[task_id]["logs"] += f"Erro em {chunk.name}: {chunk.error}\n"
                    else:
                        print(f"[AGENT: Ferramenta Concluída] {chunk.name}")
                        tasks[task_id]["logs"] += f"{chunk.name} concluído com sucesso.\n"
                elif isinstance(chunk, ag_types.Thought):
                    print(f"[AGENT: Pensando] {chunk.text}")
                    pass
        
        print(f"[AGENT: Async] Task {task_id} concluída com sucesso.")
        tasks[task_id]["status"] = "completed"
        tasks[task_id]["result"] = tasks[task_id]["logs"][-2000:]
    except Exception as e:
        print(f"[AGENT: Async] Erro na task {task_id}: {e}")
        tasks[task_id]["status"] = "error"
        tasks[task_id]["result"] = str(e)


@app.post("/execute_async")
async def execute_async(req: ExecuteRequest):
    task_id = str(uuid.uuid4())
    print(f"\n[API] Recebida requisição async. Gerado task_id: {task_id}")
    asyncio.create_task(run_agent_task(task_id, req.input))
    return {"task_id": task_id, "status": "started", "message": "Execução iniciada em background."}


@app.get("/status/{task_id}")
async def get_status(task_id: str):
    if task_id not in active_tasks:
        raise HTTPException(status_code=404, detail="Task não encontrada.")
    task = active_tasks[task_id]
    
    response = {
        "status": task["status"],
        "recent_logs": task["logs"][-2000:]  # Retorna só os últimos 2000 chars de logs
    }
    
    if task["status"] in ["completed", "error"]:
        response["result"] = task["result"]
        
    return response


@app.get("/health")
async def health():
    return {"status": "ok", "workspace": str(BASE_DIR)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
