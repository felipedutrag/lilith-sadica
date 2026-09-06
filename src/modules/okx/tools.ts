import path from 'path';
import { spawn } from 'child_process';
import { ToolAction } from '@/types';

export const executarComandoOkx: ToolAction = async (args, ctx) => {
  return new Promise((resolve) => {
    const { comando } = args;
    // We assume the OKX CLI is available in the telegram-bot folder for now, 
    // or we might need to build it in the new project.
    // Let's point to the telegram-bot dist for now as a fallback.
    const distCliPath = path.join(process.cwd(), '..', 'telegram-bot', 'dist', 'okx-cli', 'index.js');

    const cmdParts = comando.trim().split(/\s+/);

    const child = spawn(process.execPath, [distCliPath, ...cmdParts], {
      cwd: process.cwd(),
      shell: false,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data: Buffer) => { stdout += data.toString(); });
    child.stderr?.on('data', (data: Buffer) => { stderr += data.toString(); });

    child.on('close', (code: number | null) => {
      const cleanStderr = stderr.split('\n')
        .filter((l: string) => !l.includes('Update available') && l.trim().length > 0)
        .join('\n');

      if (code !== 0 && !stdout.trim() && cleanStderr) {
        resolve({ status: 'error', erro: cleanStderr.trim() });
        return;
      }
      resolve({ status: 'success', output: (stdout + cleanStderr).trim() });
    });

    child.on('error', (err: Error) => {
      resolve({ status: 'error', erro: err.message });
    });

    setTimeout(() => {
      try { child.kill(); } catch {}
      resolve({ status: 'error', erro: 'Timeout: 30s.' });
    }, 30_000);
  });
};

export const okxTools = {
  executar_comando_okx: executarComandoOkx,
};

export const okxToolDeclarations = [
  {
    name: "executar_comando_okx",
    description: "Executa comandos na CLI da OKX de forma SILENCIOSA.",
    parameters: {
      type: "OBJECT",
      properties: {
        comando: { type: "STRING" }
      },
      required: ["comando"]
    }
  }
];



