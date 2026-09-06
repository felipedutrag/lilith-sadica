import { readTomlProfile } from './toml';
import { signOkxPayload, getNow } from './signature';

export interface OkxRestClientConfig {
  apiKey: string;
  secretKey: string;
  passphrase: string;
  baseUrl: string;
  demo: boolean;
}

export class OkxRestClient {
  private config: OkxRestClientConfig;

  constructor(config: OkxRestClientConfig) {
    this.config = config;
  }

  private async request(method: string, path: string, body: any = null) {
    const timestamp = getNow();
    const bodyJson = body ? JSON.stringify(body) : "";
    const signature = signOkxPayload(`${timestamp}${method.toUpperCase()}${path}${bodyJson}`, this.config.secretKey);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'OK-ACCESS-KEY': this.config.apiKey,
      'OK-ACCESS-SIGN': signature,
      'OK-ACCESS-PASSPHRASE': this.config.passphrase,
      'OK-ACCESS-TIMESTAMP': timestamp,
    };

    if (this.config.demo) {
      headers['x-simulated-trading'] = '1';
    }

    const url = `${this.config.baseUrl}${path}`;
    const response = await fetch(url, {
      method,
      headers,
      body: body ? bodyJson : undefined,
    });

    const data = await response.json();
    if (data.code !== '0') {
      throw new Error(data.msg || `OKX Error ${data.code}`);
    }

    return data;
  }

  public async privateGet(path: string, query: Record<string, string> = {}) {
    const queryString = new URLSearchParams(query).toString();
    const fullPath = queryString ? `${path}?${queryString}` : path;
    return this.request('GET', fullPath);
  }

  public async privatePost(path: string, body: any = {}) {
    return this.request('POST', path, body);
  }

  public async publicGet(path: string, query: Record<string, string> = {}) {
    const queryString = new URLSearchParams(query).toString();
    const fullPath = queryString ? `${path}?${queryString}` : path;
    const url = `${this.config.baseUrl}${fullPath}`;
    const response = await fetch(url);
    return response.json();
  }
}

export async function loadOkxConfig(profileName: string): Promise<OkxRestClientConfig> {
  const profile = readTomlProfile(profileName);
  
  const apiKey = process.env.OKX_API_KEY || profile.api_key;
  const secretKey = process.env.OKX_SECRET_KEY || profile.secret_key;
  const passphrase = process.env.OKX_PASSPHRASE || profile.passphrase;

  if (!apiKey || !secretKey || !passphrase) {
    throw new Error(`Missing OKX credentials for profile ${profileName}`);
  }

  return {
    apiKey,
    secretKey,
    passphrase,
    baseUrl: profile.base_url || 'https://www.okx.com',
    demo: profile.demo ?? true,
  };
}

export const getOkxClient = async (isDemo: boolean = true) => {
  const profileName = isDemo ? "lilith-demo" : "lilith-live";
  const config = await loadOkxConfig(profileName);
  return { client: new OkxRestClient(config), config };
};
