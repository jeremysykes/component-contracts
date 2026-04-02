import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { join } from "node:path";
import type { VariantManifest } from "../shared/schemas.js";
import {
  ManifestNotFoundError,
  InvalidManifestError,
} from "../shared/errors.js";

const REGISTRY_DIR = ".variant-authority";

function manifestPath(component: string): string {
  return join(process.cwd(), REGISTRY_DIR, `${component}.manifest.json`);
}

export async function manifestExists(component: string): Promise<boolean> {
  try {
    await access(manifestPath(component));
    return true;
  } catch {
    return false;
  }
}

export async function readManifest(
  component: string
): Promise<VariantManifest> {
  const filePath = manifestPath(component);

  let raw: string;
  try {
    raw = await readFile(filePath, "utf-8");
  } catch {
    throw new ManifestNotFoundError(component);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new InvalidManifestError(
      `Invalid JSON in manifest for component: ${component}`
    );
  }

  return parsed as VariantManifest;
}

export async function writeManifest(
  component: string,
  manifest: VariantManifest
): Promise<void> {
  const dirPath = join(process.cwd(), REGISTRY_DIR);
  await mkdir(dirPath, { recursive: true });

  const filePath = manifestPath(component);
  await writeFile(filePath, JSON.stringify(manifest, null, 2) + "\n", "utf-8");
}
