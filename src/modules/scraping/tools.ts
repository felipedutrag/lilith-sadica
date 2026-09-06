import puppeteer from 'puppeteer';
import { ToolAction } from '@/types';
import fs from 'fs';
import os from 'os';
import path from 'path';

const SCRAPING_OUTPUT_LIMIT = 15000;

function getExecutablePath(): string | undefined {
  if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  if (os.platform() === 'win32') {
    const commonPaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(os.homedir(), 'AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'),
    ];
    for (const p of commonPaths) {
      if (fs.existsSync(p)) return p;
    }
  }
  return undefined;
}

export const realizarScraping: ToolAction = async (args, ctx) => {
  const { url, seletor = 'body', esperar_por } = args;
  if (!url || !url.startsWith('http')) return { status: 'error', message: 'URL inválida.' };

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: getExecutablePath(),
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    if (esperar_por) await page.waitForSelector(esperar_por, { timeout: 10000 });

    const conteudo = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      if (sel === 'body') {
        const clone = el.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('script, style, nav, footer, iframe, noscript').forEach(s => s.remove());
        return clone.innerText.trim();
      }
      return (el as HTMLElement).innerText.trim();
    }, seletor);

    if (!conteudo) return { status: 'success', message: 'Sem conteúdo.' };
    return { status: 'success', output: conteudo.substring(0, SCRAPING_OUTPUT_LIMIT) };
  } catch (error: any) {
    return { status: 'error', message: error.message };
  } finally {
    if (browser) await browser.close();
  }
};

export const scrapingTools = {
  realizar_scraping: realizarScraping,
};

export const scrapingToolDeclarations = [
  {
    name: "realizar_scraping",
    description: "Acessa uma URL e extrai o conteúdo textual.",
    parameters: {
      type: "OBJECT",
      properties: {
        url: { type: "STRING" },
        seletor: { type: "STRING" },
        esperar_por: { type: "STRING" }
      },
      required: ["url"]
    }
  }
];



