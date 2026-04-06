# component-contracts

Two MCP servers that form the authority layer for design-to-code component lifecycles.

## Overview

**Variant Authority** is the engineering contract for your component library. It defines what variants exist on a component, what slots are required, how design tokens map between Figma and code, and what happens when a component is deprecated. When a variant surface changes, it classifies the diff as major, minor, or patch so consumers know the impact before shipping.

**Radix Primitives** is the accessibility foundation. It maps component types to Radix UI primitives, exposes the ARIA contracts and keyboard interactions that come free with each primitive, and documents known caveats and workarounds. Together, these two servers are the source of truth that d2c operates on -- one for structural correctness, the other for accessible composition.

## Tool surface

### Variant Authority (5 tools)

| Tool | Description |
|---|---|
| `get_manifest(component)` | Returns the full variant manifest |
| `set_manifest(component, manifest)` | Writes or updates a manifest, validates with `isVariantManifest()` |
| `get_usage(component)` | Scans workspace for files importing the component |
| `diff_manifests(component, before, after)` | Classifies changes as major/minor/patch |
| `validate_usage(component, props)` | Validates variant values and required slots |

### Radix Primitives (4 tools)

| Tool | Description |
|---|---|
| `get_primitive(name)` | Returns accessibility contract, composition pattern, caveats |
| `get_composition_pattern(component)` | Maps a component type to its Radix primitive |
| `get_caveats(primitive)` | Returns known issues and workarounds |
| `list_primitives()` | Enumerates all 16 available primitives |

## VariantManifest schema

```typescript
interface VariantManifest {
  component: string;
  version: string;
  figmaFileKey: string;
  figmaNodeId: string;
  variants: Record<string, VariantDefinition>;
  slots: SlotDefinition[];
  tokens: Record<string, TokenBinding>;
  authority: AuthorityMap;
  deprecated?: DeprecationInfo;
  createdAt: string;
  updatedAt: string;
}

interface VariantDefinition {
  values: string[];
  defaultValue: string;
  type: "string" | "boolean" | "number";
  description?: string;
}

interface SlotDefinition {
  name: string;
  required: boolean;
  description?: string;
}

interface TokenBinding {
  figmaValue: string;
  codeValue: string;
  dtcgPath: string;
  category: "color" | "spacing" | "typography" | "border" | "shadow" | "opacity";
}

interface AuthorityMap {
  structure: "figma" | "cva";
  visual: "figma" | "cva";
  conflictStrategy: "escalate" | "figma-wins" | "cva-wins";
}

interface DeprecationInfo {
  deprecated: true;
  replacedBy: string;
  migrationGuide: string;
  deprecatedAt: string;
  removalTarget?: string;
}
```

## PrimitiveCapability schema

```typescript
interface PrimitiveCapability {
  name: string;
  radixPackage: string | null;
  vuePackage: string | null;
  accessibilityContract: {
    role: string;
    keyboardInteractions: string[];
    ariaAttributes: string[];
  };
  compositionPattern: string;
  caveats: string[];
  recommendedFor: string[];
  avoidFor: string[];
  version: string;
}
```

## Installation

### Claude Code

```bash
claude mcp add variant-authority -- npx tsx src/variant-authority/server.ts
claude mcp add radix-primitives -- npx tsx src/radix-primitives/server.ts
```

### Cursor

In `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "variant-authority": {
      "command": "npx",
      "args": ["tsx", "src/variant-authority/server.ts"]
    },
    "radix-primitives": {
      "command": "npx",
      "args": ["tsx", "src/radix-primitives/server.ts"]
    }
  }
}
```

### Codex CLI

```bash
codex mcp add variant-authority -- npx tsx src/variant-authority/server.ts
codex mcp add radix-primitives -- npx tsx src/radix-primitives/server.ts
```

## Development

### npm scripts

| Script | Purpose |
|---|---|
| `npm run build` | Compile TypeScript with `tsc` |
| `npm test` | Run tests with Vitest |
| `npm run dev:va` | Start variant-authority server in dev mode |
| `npm run dev:rp` | Start radix-primitives server in dev mode |

### Project structure

```
component-contracts/
  src/
    variant-authority/
      server.ts             MCP server entry point
      registry.ts           JSON registry read/write
    radix-primitives/
      server.ts             MCP server entry point
      capability-map.ts     Static primitive data
    shared/
      schemas.ts            TypeScript interfaces + validation
      errors.ts             Shared error types
  dist/                     Compiled output
  .variant-authority/       Registry storage (gitignored in consuming repos)
```

## Relationship to d2c

`component-contracts` provides the authority layer. `d2c` provides the lifecycle operator. During its phases, d2c calls these MCP servers to read and write variant manifests, query primitive mappings, and validate component usage. The two packages are designed to work together but can be used independently -- any tooling that needs a persistent variant registry or a Radix capability map can consume these servers directly.

## License

MIT
