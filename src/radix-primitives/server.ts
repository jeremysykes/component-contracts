#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { CAPABILITY_MAP } from "./capability-map.js";

const server = new McpServer({
  name: "radix-primitives",
  version: "0.1.0",
});

// ── Tools ────────────────────────────────────────────────────────────

function findPrimitive(name: string) {
  return (
    CAPABILITY_MAP[name] ??
    CAPABILITY_MAP[
      Object.keys(CAPABILITY_MAP).find(
        (k) => k.toLowerCase() === name.toLowerCase()
      ) ?? ""
    ]
  );
}

server.tool(
  "get_primitive",
  "Returns the primitive API, accessibility contract, composition pattern, and known caveats for a Radix UI primitive.",
  { name: z.string().describe("The primitive name (e.g. Dialog, Select, Tooltip)") },
  async ({ name }) => {
    const primitive = findPrimitive(name);
    if (!primitive) {
      return {
        content: [{ type: "text" as const, text: `Primitive "${name}" not found. Use list_primitives to see available primitives.` }],
        isError: true,
      };
    }
    return { content: [{ type: "text" as const, text: JSON.stringify(primitive, null, 2) }] };
  }
);

server.tool(
  "get_composition_pattern",
  "Returns the recommended Radix primitive(s) and composition pattern for a given component type.",
  { component: z.string().describe("The component type to look up (e.g. Modal, Badge, DatePicker)") },
  async ({ component }) => {
    // Direct match: the component name IS a primitive
    if (CAPABILITY_MAP[component]) {
      const prim = CAPABILITY_MAP[component];
      return {
        content: [{ type: "text" as const, text: JSON.stringify({
          component,
          primitive: prim.name,
          radixPackage: prim.radixPackage,
          compositionPattern: prim.compositionPattern,
          recommendedFor: prim.recommendedFor,
        }, null, 2) }],
      };
    }

    // Reverse lookup: find primitives that recommend this component
    const matches = Object.values(CAPABILITY_MAP).filter((prim) =>
      prim.recommendedFor.some(
        (rec) => rec.toLowerCase() === component.toLowerCase()
      )
    );

    if (matches.length > 0) {
      const results = matches.map((prim) => ({
        primitive: prim.name,
        radixPackage: prim.radixPackage,
        compositionPattern: prim.compositionPattern,
        recommendedFor: prim.recommendedFor,
      }));
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ component, recommendations: results }, null, 2) }],
      };
    }

    return {
      content: [{ type: "text" as const, text: JSON.stringify({
        component,
        recommendations: [],
        note: `No Radix primitive found for "${component}". This component may not need a Radix base.`,
      }, null, 2) }],
    };
  }
);

server.tool(
  "get_caveats",
  "Returns known issues, workarounds, and version-specific behavior for a Radix primitive.",
  { primitive: z.string().describe("The primitive name (e.g. Dialog, Select)") },
  async ({ primitive: primitiveName }) => {
    const primitive = findPrimitive(primitiveName);
    if (!primitive) {
      return {
        content: [{ type: "text" as const, text: `Primitive "${primitiveName}" not found. Use list_primitives to see available primitives.` }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text" as const, text: JSON.stringify({
        primitive: primitive.name,
        version: primitive.version,
        caveats: primitive.caveats,
        avoidFor: primitive.avoidFor,
      }, null, 2) }],
    };
  }
);

server.tool(
  "list_primitives",
  "Returns all available Radix primitives with a one-line description.",
  {},
  async () => {
    const listing = Object.values(CAPABILITY_MAP).map((prim) => ({
      name: prim.name,
      package: prim.radixPackage,
      role: prim.accessibilityContract.role,
      recommendedFor: prim.recommendedFor,
    }));
    return { content: [{ type: "text" as const, text: JSON.stringify(listing, null, 2) }] };
  }
);

// ── Start ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("radix-primitives server failed to start:", err);
  process.exit(1);
});
