import { ToolAction } from '@/types';

// Global browser instance to avoid launching a new one every time
let browser: any = null;
let page: any = null;

async function getBrowserPage(): Promise<any> {
  if (!browser) {
    const puppeteer = (await import('puppeteer')).default;
    browser = await puppeteer.launch({
      headless: true, // Use headless=true to not pop up windows randomly on the server
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }
  if (!page) {
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
  }
  return page;
}

export const navigateUrl: ToolAction = async (args) => {
  try {
    const { url } = args;
    if (!url) throw new Error("A URL é obrigatória");
    
    // Ensure URL has http/https protocol
    const finalUrl = url.startsWith('http') ? url : `https://${url}`;
    
    const p = await getBrowserPage();
    await p.goto(finalUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    const title = await p.title();
    return { status: 'SUCESSO', mensagem: `Navegou para ${finalUrl}. Título da página: ${title}` };
  } catch (error: any) {
    return { status: 'ERRO', erro: error.message };
  }
};

export const extractContent: ToolAction = async (args) => {
  try {
    const p = await getBrowserPage();
    
    // Extrai o texto da página de forma simplificada
    const textContent = await p.evaluate(() => {
      // Remove scripts and styles before extracting text
      document.querySelectorAll('script, style').forEach(el => el.remove());
      return document.body.innerText.substring(0, 5000); // Limita o tamanho para evitar estourar o limite de tokens
    });

    return { status: 'SUCESSO', conteudo: textContent };
  } catch (error: any) {
    return { status: 'ERRO', erro: error.message };
  }
};

export const clickElement: ToolAction = async (args) => {
  try {
    const { seletor } = args;
    if (!seletor) throw new Error("O seletor é obrigatório");
    
    const p = await getBrowserPage();
    await p.waitForSelector(seletor, { timeout: 5000 });
    await p.click(seletor);
    
    // Esperar um pouco para a página carregar caso haja navegação
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return { status: 'SUCESSO', mensagem: `Elemento ${seletor} clicado com sucesso.` };
  } catch (error: any) {
    return { status: 'ERRO', erro: error.message };
  }
};

export const closeBrowser: ToolAction = async () => {
  try {
    if (browser) {
      await browser.close();
      browser = null;
      page = null;
    }
    return { status: 'SUCESSO', mensagem: 'Navegador fechado.' };
  } catch (error: any) {
    return { status: 'ERRO', erro: error.message };
  }
};

export const browserTools = {
  navigate_url: navigateUrl,
  extract_content: extractContent,
  click_element: clickElement,
  close_browser: closeBrowser,
};

export const browserToolDeclarations = [
  {
    name: "navigate_url",
    description: "Navega o navegador interno (Puppeteer) para uma URL específica.",
    parameters: {
      type: "OBJECT",
      properties: {
        url: { type: "STRING", description: "URL para acessar, ex: 'google.com' ou 'https://github.com'" }
      },
      required: ["url"]
    }
  },
  {
    name: "extract_content",
    description: "Extrai o texto legível da página atualmente aberta no navegador interno (limitado a 5000 caracteres).",
    parameters: {
      type: "OBJECT",
      properties: {}
    }
  },
  {
    name: "click_element",
    description: "Clica em um elemento na página atualmente aberta usando um seletor CSS.",
    parameters: {
      type: "OBJECT",
      properties: {
        seletor: { type: "STRING", description: "Seletor CSS do elemento para clicar, ex: '#submit-btn' ou '.login-link'" }
      },
      required: ["seletor"]
    }
  },
  {
    name: "close_browser",
    description: "Fecha o navegador interno, limpando a sessão atual.",
    parameters: {
      type: "OBJECT",
      properties: {}
    }
  }
];
