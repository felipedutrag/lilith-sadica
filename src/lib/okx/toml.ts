import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { parse, stringify } from "smol-toml";

export interface OkxProfile {
  api_key?: string;
  secret_key?: string;
  passphrase?: string;
  base_url?: string;
  timeout_ms?: number;
  demo?: boolean;
  site?: string;
  proxy_url?: string;
}

export interface OkxTomlConfig {
  default_profile?: string;
  profiles: Record<string, OkxProfile>;
}

export function configFilePath(): string {
  return join(homedir(), ".okx", "config.toml");
}

export function readFullConfig(): OkxTomlConfig {
  const path = configFilePath();
  if (!existsSync(path)) return { profiles: {} };
  const raw = readFileSync(path, "utf-8");
  try {
    return parse(raw) as unknown as OkxTomlConfig;
  } catch (err) {
    throw new Error(`Failed to parse ${path}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export function readTomlProfile(profileName?: string): OkxProfile {
  const config = readFullConfig();
  const name = profileName ?? config.default_profile ?? "default";
  return config.profiles?.[name] ?? {};
}

const CONFIG_HEADER =
  "# OKX Trade Kit Configuration\n" +
  "# If editing manually, wrap values containing special chars in quotes:\n" +
  "#   passphrase = 'value'       (if value contains # \\ \")\n" +
  "#   passphrase = \"value\"       (if value contains ')\n" +
  "#   passphrase = '''value'''   (if value contains both)\n\n";

export function writeFullConfig(config: OkxTomlConfig): void {
  const path = configFilePath();
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(path, CONFIG_HEADER + stringify(config as unknown as Record<string, unknown>), "utf-8");
}
