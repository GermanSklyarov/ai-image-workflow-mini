import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const parseEnvLine = (line: string): [string, string] | undefined => {
  const trimmed = line.trim();

  if (!trimmed || trimmed.startsWith("#")) {
    return undefined;
  }

  const separatorIndex = trimmed.indexOf("=");

  if (separatorIndex === -1) {
    return undefined;
  }

  const key = trimmed.slice(0, separatorIndex).trim();
  const rawValue = trimmed.slice(separatorIndex + 1).trim();
  const value = rawValue.replace(/^["']|["']$/g, "");

  return key ? [key, value] : undefined;
};

export const loadEnvFiles = () => {
  for (const envPath of [join(process.cwd(), ".env"), join(process.cwd(), "../../.env")]) {
    if (!existsSync(envPath)) {
      continue;
    }

    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const parsed = parseEnvLine(line);

      if (parsed && process.env[parsed[0]] === undefined) {
        process.env[parsed[0]] = parsed[1];
      }
    }
  }
};

export interface BackendEnv {
  stabilityApiKey?: string;
}

export const readBackendEnv = (): BackendEnv => {
  const stabilityApiKey = process.env.STABILITY_API_KEY?.trim();

  return stabilityApiKey ? { stabilityApiKey } : {};
};
