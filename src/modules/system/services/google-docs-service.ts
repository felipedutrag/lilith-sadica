import axios from 'axios';
import { env } from '@/lib/env';

const GOOGLE_CLIENT_ID = env.GOOGLE_ADS_CLIENT_ID || env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = env.GOOGLE_ADS_CLIENT_SECRET || env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REFRESH_TOKEN = env.GOOGLE_DOCS_REFRESH_TOKEN || env.GOOGLE_ADS_REFRESH_TOKEN;

export async function getGoogleAccessToken(): Promise<string> {
  if (!GOOGLE_REFRESH_TOKEN) {
    throw new Error('Nenhum refresh token do Google configurado no arquivo .env.');
  }

  try {
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    });

    const accessToken = response.data.access_token;
    if (!accessToken) {
      throw new Error('Token de acesso não encontrado no payload de retorno.');
    }
    return accessToken;
  } catch (error: any) {
    const detail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
    throw new Error(`Falha ao obter token do Google: ${detail}`);
  }
}

export async function listGoogleDocs(): Promise<any[]> {
  const token = await getGoogleAccessToken();
  try {
    const response = await axios.get('https://www.googleapis.com/drive/v3/files', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        q: "mimeType = 'application/vnd.google-apps.document' and trashed = false",
        fields: 'files(id, name, webViewLink, modifiedTime)',
        pageSize: 30,
      },
    });
    return response.data.files || [];
  } catch (error: any) {
    const detail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
    throw new Error(`Falha ao listar documentos do Google Drive: ${detail}`);
  }
}

const DOCS_TEMPLATE_ID = '107UqCFLxqm1Lr9E0IpsEaVVBA84Cl7BAx3Xbtt06om8';

export async function exportToGoogleDocs(title: string, content: string): Promise<{ url: string; docId: string }> {
  const token = await getGoogleAccessToken();

  // 1. Copy the template
  const copyRes = await axios.post(
    `https://www.googleapis.com/drive/v3/files/${DOCS_TEMPLATE_ID}/copy`,
    { name: title },
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
  );
  const newDocId = copyRes.data.id;

  // 2. Get total length of the new doc
  const docRes = await axios.get(`https://docs.googleapis.com/v1/documents/${newDocId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const totalLength = docRes.data.body?.content?.at(-1)?.endIndex ?? 1;

  // 3. Insert content at the end
  const requests = [
    {
      insertText: {
        location: { index: totalLength - 1 },
        text: '\n' + content,
      },
    },
  ];

  await axios.post(
    `https://docs.googleapis.com/v1/documents/${newDocId}:batchUpdate`,
    { requests },
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
  );

  return {
    url: `https://docs.google.com/document/d/${newDocId}/edit`,
    docId: newDocId,
  };
}

export async function getGoogleDocText(documentId: string): Promise<string> {
  const token = await getGoogleAccessToken();
  try {
    const response = await axios.get(`https://docs.googleapis.com/v1/documents/${documentId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const body = response.data.body;
    let text = '';
    if (body && body.content) {
      for (const element of body.content) {
        if (element.paragraph && element.paragraph.elements) {
          for (const part of element.paragraph.elements) {
            if (part.textRun && part.textRun.content) {
              text += part.textRun.content;
            }
          }
        }
      }
    }
    return text;
  } catch (error: any) {
    const detail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
    throw new Error(`Falha ao ler documento ${documentId}: ${detail}`);
  }
}
