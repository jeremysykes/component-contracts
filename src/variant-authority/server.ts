#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readManifest, writeManifest, manifestExists } from "./registry.js";
import { isVariantManifest } from "../shared/schemas.js";
import type { VariantManifest } from "../shared/schemas.js";
import { ManifestNotFoundError } from "../shared/errors.js";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const server = new Server(
  { name: "variant-authority", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

// ── Tool definitions ──────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "get_manifest",
      description:
        "Returns the full variant manifest for a component: variant definitions, slots, tokens, authority map, and timestamps.",
      inputSchema: {
        type: "object" as const,
        properties: {
          component: {
            type: "string",
            description: "The component name (e.g. Button, Select)",
          },
        },
        required: ["component"],
      },
    },
    {
      name: "set_manifest",
      description:
        "Writes or updates the registry entry for a component. Validates the manifest before writing.",
      inputSchema: {
        type: "object" as const,
        properties: {
          component: {
            type: "string",
            description: "The component name",
          },
          manifest: {
            type: "object",
            description: "The full VariantManifest object to write",
          },
        },
        required: ["component", "manifest"],
      },
    },
    {
      name: "get_usage",
      description:
        "Scans the current working directory for files that import the given component and returns a list of consumer file paths.",
      inputSchema: {
        type: "object" as const,
        properties: {
          component: {
            type: "string",
            description: "The component name to search for",
          },
        },
        required: ["component"],
      },
    },
    {
      name: "diff_manifests",
      description:
        "Diffs two manifest versions and classifies changes as major, minor, or patch.",
      inputSchema: {
        type: "object" as const,
        properties: {
          component: {
            type: "string",
            description: "The component name (for labeling)",
          },
          before: {
            type: "object",
            description: "The previous VariantManifest",
          },
          after: {
            type: "object",
            description: "The new VariantManifest",
          },
        },
        required: ["component", "before", "after"],
      },
    },
    {
      name: "validate_usage",
      description:
        "Validates a usage object against the manifest: checks variant values, required slots, and component-level deprecation. Returns pass or fail with a list of violations.",
      inputSchema: {
        type: "object" as const,
        properties: {
          component: {
            type: "string",
            description: "The component name",
          },
          usage: {
            type: "object",
            description:
              "The usage object to validate — variant values and slot names",
          },
        },
        required: ["component", "usage"],
      },
    },
  ],
}));

// ── Tool implementations ──────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "get_manifest": {
      const component = args?.component as string;
      try {
        const manifest = await readManifest(component);
        return {
          content: [
            { type: "text", text: JSON.stringify(manifest, null, 2) },
          ],
        };
      } catch (err) {
        if (err instanceof ManifestNotFoundError) {
          return {
            content: [{ type: "text", text: err.message }],
            isError: true,
          };
        }
        throw err;
      }
    }

    case "set_manifest": {
      const component = args?.component as string;
      const manifest = args?.manifest as Record<string, unknown>;

      if (!isVariantManifest(manifest)) {
        return {
          content: [
            {
              type: "text",
              text: "Invalid manifest: does not conform to VariantManifest schema. Ensure component, version, figmaFileKey, figmaNodeId, variants, slots, tokens, authority, createdAt, and updatedAt are present and correctly typed.",
            },
          ],
          isError: true,
        };
      }

      // Preserve createdAt from existing manifest if it exists
      let createdAt = manifest.createdAt;
      if (await manifestExists(component)) {
        try {
          const existing = await readManifest(component);
          if (existing.createdAt) {
            createdAt = existing.createdAt;
          }
        } catch {
          // If read fails, use the provided createdAt
        }
      }

      const fullManifest: VariantManifest = {
        ...manifest,
        component,
        createdAt,
        updatedAt: new Date().toISOString(),
      };
      await writeManifest(component, fullManifest);
      return {
        content: [
          {
            type: "text",
            text: `Manifest for "${component}" written successfully.`,
          },
        ],
      };
    }

    case "get_usage": {
      const component = args?.component as string;
      const consumers = await scanForUsage(component, process.cwd());
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { component, consumers, count: consumers.length },
              null,
              2
            ),
          },
        ],
      };
    }

    case "diff_manifests": {
      const component = args?.component as string;
      const before = args?.before as VariantManifest;
      const after = args?.after as VariantManifest;
      const result = diffManifests(component, before, after);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }

    case "validate_usage": {
      const component = args?.component as string;
      const usage = args?.usage as Record<string, unknown>;

      if (!(await manifestExists(component))) {
        return {
          content: [
            {
              type: "text",
              text: `Manifest not found for component: ${component}`,
            },
          ],
          isError: true,
        };
      }

      const manifest = await readManifest(component);
      const result = validateUsage(manifest, usage);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }

    default:
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
      };
  }
});

// ── Helpers ───────────────────────────────────────────────────────────

async function scanForUsage(
  component: string,
  dir: string
): Promise<string[]> {
  const results: string[] = [];
  const SKIP = new Set([
    "node_modules",
    ".git",
    "dist",
    ".variant-authority",
    ".next",
  ]);
  const EXTENSIONS = new Set([
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".mts",
  ]);

  async function walk(currentDir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (SKIP.has(entry.name)) continue;
      const fullPath = join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        const ext = entry.name.slice(entry.name.lastIndexOf("."));
        if (!EXTENSIONS.has(ext)) continue;

        try {
          const content = await readFile(fullPath, "utf-8");
          const importPattern = new RegExp(
            `(?:import\\s+.*\\b${component}\\b|from\\s+['"][^'"]*${component}[^'"]*['"]|require\\(['"][^'"]*${component}[^'"]*['"]\\))`,
            "m"
          );
          if (importPattern.test(content)) {
            results.push(relative(process.cwd(), fullPath));
          }
        } catch {
          // skip unreadable files
        }
      }
    }
  }

  await walk(dir);
  return results.sort();
}

interface DiffChange {
  type: "added" | "removed" | "changed";
  path: string;
  detail: string;
}

interface DiffResult {
  component: string;
  classification: "major" | "minor" | "patch";
  changes: DiffChange[];
}

function diffManifests(
  component: string,
  before: VariantManifest,
  after: VariantManifest
): DiffResult {
  const changes: DiffChange[] = [];
  let hasMajor = false;
  let hasMinor = false;

  // ── Variant groups ──────────────────────────────────────────────────
  const allVariantKeys = new Set([
    ...Object.keys(before.variants || {}),
    ...Object.keys(after.variants || {}),
  ]);

  for (const key of allVariantKeys) {
    const bGroup = before.variants?.[key];
    const aGroup = after.variants?.[key];

    if (!bGroup && aGroup) {
      changes.push({
        type: "added",
        path: `variants.${key}`,
        detail: `New variant group with values: ${aGroup.values.join(", ")}`,
      });
      hasMinor = true;
    } else if (bGroup && !aGroup) {
      changes.push({
        type: "removed",
        path: `variants.${key}`,
        detail: `Removed variant group (had values: ${bGroup.values.join(", ")})`,
      });
      hasMajor = true;
    } else if (bGroup && aGroup) {
      // Removed values (breaking)
      const removedValues = bGroup.values.filter(
        (v) => !aGroup.values.includes(v)
      );
      if (removedValues.length > 0) {
        changes.push({
          type: "removed",
          path: `variants.${key}.values`,
          detail: `Removed values: ${removedValues.join(", ")}`,
        });
        hasMajor = true;
      }
      // Added values (minor)
      const addedValues = aGroup.values.filter(
        (v) => !bGroup.values.includes(v)
      );
      if (addedValues.length > 0) {
        changes.push({
          type: "added",
          path: `variants.${key}.values`,
          detail: `Added values: ${addedValues.join(", ")}`,
        });
        hasMinor = true;
      }
      // Default value change
      if (bGroup.defaultValue !== aGroup.defaultValue) {
        changes.push({
          type: "changed",
          path: `variants.${key}.defaultValue`,
          detail: `${bGroup.defaultValue} → ${aGroup.defaultValue}`,
        });
        hasMajor = true;
      }
      // Type change
      if (bGroup.type !== aGroup.type) {
        changes.push({
          type: "changed",
          path: `variants.${key}.type`,
          detail: `${bGroup.type} → ${aGroup.type}`,
        });
        hasMajor = true;
      }
    }
  }

  // ── Slots ───────────────────────────────────────────────────────────
  const beforeSlotNames = new Set(
    (before.slots || []).map((s) => s.name)
  );
  const afterSlotNames = new Set(
    (after.slots || []).map((s) => s.name)
  );

  for (const slot of after.slots || []) {
    if (!beforeSlotNames.has(slot.name)) {
      changes.push({
        type: "added",
        path: `slots.${slot.name}`,
        detail: `New slot (required: ${slot.required})`,
      });
      if (slot.required) hasMajor = true;
      else hasMinor = true;
    }
  }

  for (const slot of before.slots || []) {
    if (!afterSlotNames.has(slot.name)) {
      changes.push({
        type: "removed",
        path: `slots.${slot.name}`,
        detail: `Removed slot (was required: ${slot.required})`,
      });
      hasMajor = true;
    }
  }

  // Check changed required flag on existing slots
  for (const aSlot of after.slots || []) {
    if (beforeSlotNames.has(aSlot.name)) {
      const bSlot = (before.slots || []).find((s) => s.name === aSlot.name);
      if (bSlot && bSlot.required !== aSlot.required) {
        changes.push({
          type: "changed",
          path: `slots.${aSlot.name}.required`,
          detail: `${bSlot.required} → ${aSlot.required}`,
        });
        if (aSlot.required) hasMajor = true;
        else hasMinor = true;
      }
    }
  }

  // ── Tokens ──────────────────────────────────────────────────────────
  const allTokenKeys = new Set([
    ...Object.keys(before.tokens || {}),
    ...Object.keys(after.tokens || {}),
  ]);

  for (const key of allTokenKeys) {
    const bToken = before.tokens?.[key];
    const aToken = after.tokens?.[key];

    if (!bToken && aToken) {
      changes.push({
        type: "added",
        path: `tokens.${key}`,
        detail: `New token binding: figmaValue=${aToken.figmaValue}, codeValue=${aToken.codeValue}`,
      });
      hasMinor = true;
    } else if (bToken && !aToken) {
      changes.push({
        type: "removed",
        path: `tokens.${key}`,
        detail: `Removed token binding (was figmaValue=${bToken.figmaValue}, codeValue=${bToken.codeValue})`,
      });
      hasMajor = true;
    } else if (bToken && aToken) {
      if (bToken.figmaValue !== aToken.figmaValue) {
        changes.push({
          type: "changed",
          path: `tokens.${key}.figmaValue`,
          detail: `${bToken.figmaValue} → ${aToken.figmaValue}`,
        });
        hasMinor = true;
      }
      if (bToken.codeValue !== aToken.codeValue) {
        changes.push({
          type: "changed",
          path: `tokens.${key}.codeValue`,
          detail: `${bToken.codeValue} → ${aToken.codeValue}`,
        });
        hasMinor = true;
      }
    }
  }

  // ── Authority ───────────────────────────────────────────────────────
  const bAuth = before.authority;
  const aAuth = after.authority;

  if (bAuth && aAuth) {
    if (bAuth.structure !== aAuth.structure) {
      changes.push({
        type: "changed",
        path: "authority.structure",
        detail: `${bAuth.structure} → ${aAuth.structure}`,
      });
      hasMajor = true;
    }
    if (bAuth.visual !== aAuth.visual) {
      changes.push({
        type: "changed",
        path: "authority.visual",
        detail: `${bAuth.visual} → ${aAuth.visual}`,
      });
      hasMajor = true;
    }
    if (bAuth.conflictStrategy !== aAuth.conflictStrategy) {
      changes.push({
        type: "changed",
        path: "authority.conflictStrategy",
        detail: `${bAuth.conflictStrategy} → ${aAuth.conflictStrategy}`,
      });
      hasMajor = true;
    }
  } else if (!bAuth && aAuth) {
    changes.push({
      type: "added",
      path: "authority",
      detail: `Authority map added: structure=${aAuth.structure}, visual=${aAuth.visual}, conflictStrategy=${aAuth.conflictStrategy}`,
    });
    hasMajor = true;
  } else if (bAuth && !aAuth) {
    changes.push({
      type: "removed",
      path: "authority",
      detail: `Authority map removed`,
    });
    hasMajor = true;
  }

  // ── Component-level deprecated ──────────────────────────────────────
  const bDeprecated = before.deprecated?.deprecated === true;
  const aDeprecated = after.deprecated?.deprecated === true;

  if (!bDeprecated && aDeprecated) {
    changes.push({
      type: "added",
      path: "deprecated",
      detail: `Component marked as deprecated (replacedBy: ${after.deprecated?.replacedBy ?? "unknown"})`,
    });
    hasMajor = true;
  } else if (bDeprecated && !aDeprecated) {
    changes.push({
      type: "removed",
      path: "deprecated",
      detail: `Component deprecation removed`,
    });
    hasMinor = true;
  }

  let classification: "major" | "minor" | "patch";
  if (hasMajor) classification = "major";
  else if (hasMinor) classification = "minor";
  else classification = "patch";

  return { component, classification, changes };
}

interface ValidationResult {
  status: "pass" | "fail";
  component: string;
  violations: string[];
}

function validateUsage(
  manifest: VariantManifest,
  usage: Record<string, unknown>
): ValidationResult {
  const violations: string[] = [];

  // Component-level deprecation warning
  if (manifest.deprecated?.deprecated === true) {
    const replacement = manifest.deprecated.replacedBy;
    violations.push(
      `Component "${manifest.component}" is deprecated${replacement ? `. Use "${replacement}" instead` : ""}`
    );
  }

  // Check variant values
  const variants = usage.variants as Record<string, unknown> | undefined;
  if (variants && typeof variants === "object") {
    for (const [key, value] of Object.entries(variants)) {
      const variantGroup = manifest.variants[key];
      if (!variantGroup) {
        violations.push(
          `Unknown variant "${key}". Available variants: ${Object.keys(manifest.variants).join(", ")}`
        );
        continue;
      }
      if (
        typeof value === "string" &&
        !variantGroup.values.includes(value)
      ) {
        violations.push(
          `Invalid value "${value}" for variant "${key}". Allowed: ${variantGroup.values.join(", ")}`
        );
      }
    }
  }

  // Check required slots
  const providedSlots = usage.slots as string[] | undefined;
  const providedSlotSet = new Set(providedSlots || []);
  for (const slot of manifest.slots) {
    if (slot.required && !providedSlotSet.has(slot.name)) {
      violations.push(
        `Missing required slot: "${slot.name}"`
      );
    }
  }

  return {
    status: violations.length === 0 ? "pass" : "fail",
    component: manifest.component,
    violations,
  };
}

// ── Start ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("variant-authority server failed to start:", err);
  process.exit(1);
});
