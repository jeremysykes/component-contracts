#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { CAPABILITY_MAP } from "./capability-map.js";

const server = new Server(
  { name: "radix-primitives", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

// ── Tool definitions ──────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "get_primitive",
      description:
        "Returns the primitive API, accessibility contract, composition pattern, and known caveats for a Radix UI primitive.",
      inputSchema: {
        type: "object" as const,
        properties: {
          name: {
            type: "string",
            description:
              "The primitive name (e.g. Dialog, Select, Tooltip)",
          },
        },
        required: ["name"],
      },
    },
    {
      name: "get_composition_pattern",
      description:
        "Returns the recommended Radix primitive(s) and composition pattern for a given component type.",
      inputSchema: {
        type: "object" as const,
        properties: {
          component: {
            type: "string",
            description:
              "The component type to look up (e.g. Modal, Badge, DatePicker)",
          },
        },
        required: ["component"],
      },
    },
    {
      name: "get_caveats",
      description:
        "Returns known issues, workarounds, and version-specific behavior for a Radix primitive.",
      inputSchema: {
        type: "object" as const,
        properties: {
          primitive: {
            type: "string",
            description: "The primitive name (e.g. Dialog, Select)",
          },
        },
        required: ["primitive"],
      },
    },
    {
      name: "list_primitives",
      description:
        "Returns all available Radix primitives with a one-line description.",
      inputSchema: {
        type: "object" as const,
        properties: {},
        required: [],
      },
    },
  ],
}));

// ── Tool implementations ──────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "get_primitive": {
      const primitiveName = args?.name as string;
      const primitive = CAPABILITY_MAP[primitiveName];

      if (!primitive) {
        // Try case-insensitive lookup
        const key = Object.keys(CAPABILITY_MAP).find(
          (k) => k.toLowerCase() === primitiveName.toLowerCase()
        );
        if (key) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(CAPABILITY_MAP[key], null, 2),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `Primitive "${primitiveName}" not found. Use list_primitives to see available primitives.`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          { type: "text", text: JSON.stringify(primitive, null, 2) },
        ],
      };
    }

    case "get_composition_pattern": {
      const component = args?.component as string;

      // Direct match: the component name IS a primitive
      if (CAPABILITY_MAP[component]) {
        const prim = CAPABILITY_MAP[component];
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  component,
                  primitive: prim.name,
                  radixPackage: prim.radixPackage,
                  compositionPattern: prim.compositionPattern,
                  recommendedFor: prim.recommendedFor,
                },
                null,
                2
              ),
            },
          ],
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
          content: [
            {
              type: "text",
              text: JSON.stringify(
                { component, recommendations: results },
                null,
                2
              ),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                component,
                recommendations: [],
                note: `No Radix primitive found for "${component}". This component may not need a Radix base.`,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "get_caveats": {
      const primitiveName = args?.primitive as string;
      const primitive =
        CAPABILITY_MAP[primitiveName] ??
        CAPABILITY_MAP[
          Object.keys(CAPABILITY_MAP).find(
            (k) => k.toLowerCase() === primitiveName.toLowerCase()
          ) ?? ""
        ];

      if (!primitive) {
        return {
          content: [
            {
              type: "text",
              text: `Primitive "${primitiveName}" not found. Use list_primitives to see available primitives.`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                primitive: primitive.name,
                version: primitive.version,
                caveats: primitive.caveats,
                avoidFor: primitive.avoidFor,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "list_primitives": {
      const listing = Object.values(CAPABILITY_MAP).map((prim) => ({
        name: prim.name,
        package: prim.radixPackage,
        role: prim.accessibilityContract.role,
        recommendedFor: prim.recommendedFor,
      }));

      return {
        content: [
          { type: "text", text: JSON.stringify(listing, null, 2) },
        ],
      };
    }

    default:
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
      };
  }
});

// ── Start ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("radix-primitives server failed to start:", err);
  process.exit(1);
});
