import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";

const RAW_DIR = path.join(process.cwd(), "data", "raw");

export async function loadCsv<T = Record<string, string>>(
  filename: string
): Promise<T[]> {
  const content = await readFile(path.join(RAW_DIR, filename), "utf-8");
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
  }) as T[];
}

export function num(value: string | undefined, fallback = 0): number {
  if (value === undefined || value === "" || value === "NA") return fallback;
  const n = Number(value);
  return Number.isNaN(n) ? fallback : n;
}

export function bool01(value: string | undefined): boolean {
  return value === "1" || value === "TRUE" || value === "true";
}
