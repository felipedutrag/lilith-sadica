// scripts/auto-commit-gemini.js
// Faz commit automático usando mensagem gerada pela Gemini API

const { execSync } = require('child_process');
const https = require('https');

require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY não encontrado no .env');
    process.exit(1);
}

function getGitDiff() {
    try {
        return execSync('git diff --cached', { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }); // 50MB buffer
    } catch (error) {
        console.error('Erro ao obter diff do git:', error.message);
        process.exit(1);
    }
}

function getGitStat() {
    try {
        return execSync('git diff --cached --stat', { encoding: 'utf8', maxBuffer: 1024 * 1024 });
    } catch { return ''; }
}

async function getCommitMessage(diff) {
    // Truncar diff para não estourar o contexto da Gemini (máx ~8000 chars)
    const MAX_DIFF = 8000;
    const stat = getGitStat();
    const truncated = diff.length > MAX_DIFF;
    const diffSnippet = truncated ? diff.slice(0, MAX_DIFF) + '\n...[diff truncado]' : diff;
    const prompt = `Generate a short, clear, and objective git commit message (max 60 characters), with NO comments before or after, for the following code changes. Always use the imperative mood in English (e.g., add, remove, fix, adjust, update, implement, refactor). Respond ONLY with the commit message itself, without quotes, without prefixes, and without any explanation. English only:\n\nFiles changed:\n${stat}\n\nDiff:\n${diffSnippet}`;

    if (GEMINI_API_KEY) {
        try {
            return await fetchGemini(prompt);
        } catch (e) {
            console.error('Erro ao chamar Gemini:', e.message);
            throw e;
        }
    }

    throw new Error('Nenhuma API key válida para commit message.');
}

function fetchGemini(prompt) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            contents: [
                {
                    parts: [{ text: prompt }]
                }
            ],
            systemInstruction: {
                parts: [{ text: "You are a commit git generator. Generate the commit message in english." }]
            },
            generationConfig: {
                maxOutputTokens: 100,
                temperature: 0.2
            }
        });

        const options = {
            hostname: 'generativelanguage.googleapis.com',
            path: `/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };

        const req = https.request(options, res => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    if (json.error) {
                        console.error('Erro da Gemini API:', json.error.message);
                        return reject(new Error(json.error.message));
                    }
                    if (!json.candidates || !json.candidates[0] || !json.candidates[0].content || !json.candidates[0].content.parts[0]) {
                        console.error('Resposta bruta da Gemini:', body);
                        return reject(new Error('Resposta inválida da Gemini'));
                    }
                    const msg = json.candidates[0].content.parts[0].text.trim();
                    resolve(msg.replace(/^"|"$/g, ''));
                } catch (e) {
                    console.error('Resposta bruta da Gemini:', body);
                    reject(new Error('Erro ao processar resposta da Gemini: ' + e.message));
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function main() {
    // Adicionar todas as mudanças
    console.log('Adicionando mudanças ao staging...');
    execSync('git add .');

    // Verificar se há mudanças staged
    try {
        const stagedChanges = execSync('git diff --cached --name-only', { encoding: 'utf8' }).trim();
        if (!stagedChanges) {
            console.log('Nenhuma mudança staged para commitar.');
            return;
        }
        console.log('Mudanças staged:', stagedChanges.split('\n').length, 'arquivo(s)');
    } catch (error) {
        console.log('Erro ao verificar mudanças staged:', error.message);
        return;
    }

    const diff = getGitDiff();
    if (!diff.trim()) {
        console.log('Nenhuma mudança para commitar.');
        return;
    }
    console.log('Gerando mensagem de commit via Gemini...');
    const commitMsg = await getCommitMessage(diff);
    execSync(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`);
    console.log('Commit realizado com mensagem:', commitMsg);

    // Fazer push automático
    try {
        console.log('Fazendo push para o repositório remoto...');

        // Verificar se há um branch remoto configurado
        let pushCommand = 'git push';
        try {
            const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
            pushCommand = `git push origin ${currentBranch}`;
            console.log(`Push para o branch: ${currentBranch}`);
        } catch (branchError) {
            // Se não houver upstream configurado, usar push padrão
            console.log('Branch remoto não configurado, usando push padrão...');
        }

        execSync(pushCommand);
        console.log('✅ Push realizado com sucesso!');
    } catch (pushError) {
        console.log('⚠️  Aviso: Não foi possível fazer push automático.');
        console.log('💡 Execute manualmente: git push');
        if (pushError.message) {
            console.log('📝 Erro:', pushError.message.split('\n')[0]);
        }
    }
}

main().catch(e => {
    console.error('Erro:', e);
    process.exit(1);
});