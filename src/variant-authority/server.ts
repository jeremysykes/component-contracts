#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readManifest, writeManifest, manifestExists } from "./registry.js";
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
        "Returns the full variant manifest for a component: allowed values, deprecated variants, migration paths, last-updated timestamp.",
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
      description: "Writes or updates the registry entry for a component.",
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
      name: "deprecate_variant",
      description:
        "Marks a variant value as deprecated and records the migration path.",
      inputSchema: {
        type: "object" as const,
        properties: {
          component: {
            type: "string",
            description: "The component name",
          },
          variant: {
            type: "string",
            description:
              "The variant group name (e.g. size, intent)",
          },
          value: {
            type: "string",
            description: "The variant value to deprecate (e.g. sm, danger)",
          },
          replacement: {
            type: "string",
            description:
              "The replacement value to migrate to (e.g. small, destructive)",
          },
        },
        required: ["component", "variant", "value", "replacement"],
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
      name: "validate_props",
      description:
        "Validates a props object against the manifest variants. Returns pass or fail with a list of violations.",
      inputSchema: {
        type: "object" as const,
        properties: {
          component: {
            type: "string",
            description: "The component name",
          },
          props: {
            type: "object",
            description: "The props object to validate",
          },
        },
        required: ["component", "props"],
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
      const manifest = args?.manifest as VariantManifest;
      const fullManifest: VariantManifest = {
        ...manifest,
        component,
        lastUpdated: new Date().toISOString(),
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

    case "deprecate_variant": {
      const component = args?.component as string;
      const variantGroup = args?.variant as string;
      const value = args?.value as string;
      const replacement = args?.replacement as string;

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
      const group = manifest.variants[variantGroup];
      if (!group) {
        return {
          content: [
            {
              type: "text",
              text: `Variant group "${variantGroup}" not found in ${component} manifest.`,
            },
          ],
          isError: true,
        };
      }

      if (!group.values.includes(value)) {
        return {
          content: [
            {
              type: "text",
              text: `Value "${value}" not found in variant group "${variantGroup}".`,
            },
          ],
          isError: true,
        };
      }

      if (!group.deprecated) group.deprecated = [];
      if (!group.deprecated.includes(value)) group.deprecated.push(value);

      if (!group.migrations) group.migrations = {};
      group.migrations[value] = replacement;

      manifest.lastUpdated = new Date().toISOString();
      await writeManifest(component, manifest);

      return {
        content: [
          {
            type: "text",
            text: `Variant "${variantGroup}.${value}" deprecated in ${component}. Migration: ${value} → ${replacement}`,
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

    case "validate_props": {
      const component = args?.component as string;
      const props = args?.props as Record<string, unknown>;

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
      const result = validateProps(manifest, props);
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
          // Match import statements or require calls referencing the component
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

  // Status change
  if (before.status !== after.status) {
    changes.push({
      type: "changed",
      path: "status",
      detail: `${before.status} → ${after.status}`,
    });
    if (after.status === "deprecated") hasMajor = true;
    else hasMinor = true;
  }

  // Variant groups
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
      // Check removed values (breaking)
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
      // Check added values (minor)
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
      // Default change
      if (bGroup.default !== aGroup.default) {
        changes.push({
          type: "changed",
          path: `variants.${key}.default`,
          detail: `${bGroup.default} → ${aGroup.default}`,
        });
        hasMajor = true;
      }
      // New deprecations
      const newDeprecations = (aGroup.deprecated || []).filter(
        (d) => !(bGroup.deprecated || []).includes(d)
      );
      if (newDeprecations.length > 0) {
        changes.push({
          type: "changed",
          path: `variants.${key}.deprecated`,
          detail: `Newly deprecated: ${newDeprecations.join(", ")}`,
        });
        hasMinor = true;
      }
    }
  }

  // Props
  const allPropKeys = new Set([
    ...Object.keys(before.props || {}),
    ...Object.keys(after.props || {}),
  ]);

  for (const key of allPropKeys) {
    const bProp = before.props?.[key];
    const aProp = after.props?.[key];

    if (!bProp && aProp) {
      changes.push({
        type: "added",
        path: `props.${key}`,
        detail: `New prop: type=${aProp.type}, required=${aProp.required}`,
      });
      if (aProp.required) hasMajor = true;
      else hasMinor = true;
    } else if (bProp && !aProp) {
      changes.push({
        type: "removed",
        path: `props.${key}`,
        detail: `Removed prop (was type=${bProp.type}, required=${bProp.required})`,
      });
      hasMajor = true;
    } else if (bProp && aProp) {
      if (bProp.type !== aProp.type) {
        changes.push({
          type: "changed",
          path: `props.${key}.type`,
          detail: `${bProp.type} → ${aProp.type}`,
        });
        hasMajor = true;
      }
      if (!bProp.required && aProp.required) {
        changes.push({
          type: "changed",
          path: `props.${key}.required`,
          detail: `Made required`,
        });
        hasMajor = true;
      } else if (bProp.required && !aProp.required) {
        changes.push({
          type: "changed",
          path: `props.${key}.required`,
          detail: `Made optional`,
        });
        hasMinor = true;
      }
      if (!bProp.deprecated && aProp.deprecated) {
        changes.push({
          type: "changed",
          path: `props.${key}.deprecated`,
          detail: `Marked as deprecated${aProp.replacement ? `, replacement: ${aProp.replacement}` : ""}`,
        });
        hasMinor = true;
      }
    }
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

function validateProps(
  manifest: VariantManifest,
  props: Record<string, unknown>
): ValidationResult {
  const violations: string[] = [];

  // Check variant props
  for (const [key, value] of Object.entries(props)) {
    const variantGroup = manifest.variants[key];
    if (variantGroup) {
      if (typeof value === "string" && !variantGroup.values.includes(value)) {
        violations.push(
          `Invalid value "${value}" for variant "${key}". Allowed: ${variantGroup.values.join(", ")}`
        );
      }
      if (
        typeof value === "string" &&
        variantGroup.deprecated?.includes(value)
      ) {
        const migration = variantGroup.migrations?.[value];
        violations.push(
          `Deprecated value "${value}" for variant "${key}"${migration ? `. Migrate to: "${migration}"` : ""}`
        );
      }
    }

    // Check prop deprecation
    const propDef = manifest.props[key];
    if (propDef?.deprecated) {
      violations.push(
        `Prop "${key}" is deprecated${propDef.replacement ? `. Use "${propDef.replacement}" instead` : ""}`
      );
    }
  }

  // Check required props
  for (const [key, propDef] of Object.entries(manifest.props)) {
    if (propDef.required && !(key in props)) {
      violations.push(`Missing required prop: "${key}" (type: ${propDef.type})`);
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
