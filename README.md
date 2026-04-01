# component-contracts

> Two MCP servers in one package: a Variant Authority server that manages CVA component registries across design and code, and a Primitives server that maps Radix UI composition patterns and accessibility contracts. Used by the d2c skill to enforce component authority across the full lifecycle.

---

## What this is

`component-contracts` is a TypeScript MCP package that exposes two servers:

**`variant-authority`** — a registry layer for CVA-based component variant manifests. It stores the canonical definition of every component's variant surface, tracks deprecations, maps consumer usage, and diffs manifests across versions to classify breaking vs non-breaking changes.

**`radix-primitives`** — a capability map for Radix UI primitives. It tells the d2c skill which Radix primitive to use as the base for a given component, what the primitive's accessibility contract is, and what the known composition patterns and caveats are.

Together they form the **authority layer** in the d2c lifecycle — the source of truth for what a component *is allowed to be* in both design and code.

---

## Why these two servers live together

Both servers answer the same question from different angles: *what are the rules for this component?*

`variant-authority` answers it from the engineering contract side — which variants are allowed, which are deprecated, which props exist. `radix-primitives` answers it from the primitive foundation side — which base element should this component be built on, what accessibility behavior comes for free, what are the gotchas.

A skill building a `Select` component needs both answers before writing a line of code. Keeping them in one package means one install, one configuration block, and one connection check.

---

## Servers

### `variant-authority`

Manages the component variant registry stored at `.variant-authority/` in the consuming repo.

#### Tools

| Tool | Description |
|---|---|
| `get_manifest(component)` | Returns the full variant manifest for a component: allowed values, deprecated variants, migration paths, last-updated timestamp |
| `set_manifest(component, manifest)` | Writes or updates the registry entry for a component |
| `deprecate_variant(component, variant, replacement)` | Marks a variant as deprecated and records the migration path |
| `get_usage(component)` | Returns the consumer surface map: which files and repos import this component and at what version |
| `diff_manifests(component, before, after)` | Diffs two manifest versions and classifies changes as `major`, `minor`, or `patch` |
| `validate_props(component, props)` | Validates a props object against the manifest. Returns `pass` or `fail` with a list of violations |

#### Registry schema

Each component entry in `.variant-authority/` is a JSON file named `{component}.manifest.json`:

```typescript
interface VariantManifest {
  component: string
  version: string
  status: 'alpha' | 'beta' | 'stable' | 'deprecated'
  variants: {
    [variantName: string]: {
      values: string[]
      default: string
      deprecated?: string[]
      migrations?: Record<string, string>
    }
  }
  props: {
    [propName: string]: {
      type: string
      required: boolean
      deprecated?: boolean
      replacement?: string
    }
  }
  consumers: string[]
  deprecatedAt?: string
  replacedBy?: string
  lastUpdated: string
}
```

---

### `radix-primitives`

A static capability map over the Radix UI primitive surface. Does not write to any registry — read-only.

#### Tools

| Tool | Description |
|---|---|
| `get_primitive(name)` | Returns the primitive API, accessibility contract, composition pattern, and known caveats |
| `get_composition_pattern(component)` | Returns the recommended Radix primitive(s) for a given component type (e.g. `Select` → `Radix Select`, `Badge` → none) |
| `get_caveats(primitive)` | Returns known issues, workarounds, and version-specific behavior for a primitive |
| `list_primitives()` | Returns all available primitives with a one-line description |

#### Capability map schema

```typescript
interface PrimitiveCapability {
  name: string
  radixPackage: string | null
  accessibilityContract: {
    role: string
    keyboardInteractions: string[]
    ariaAttributes: string[]
  }
  compositionPattern: string
  caveats: string[]
  recommendedFor: string[]
  avoidFor: string[]
  version: string
}
```

---

## Installation

```bash
npm install component-contracts
```

### Add to Claude Code

```bash
claude mcp add variant-authority node ./node_modules/component-contracts/dist/variant-authority.js
claude mcp add radix-primitives node ./node_modules/component-contracts/dist/radix-primitives.js
```

### Add to Cursor

In `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "variant-authority": {
      "command": "node",
      "args": ["./node_modules/component-contracts/dist/variant-authority.js"]
    },
    "radix-primitives": {
      "command": "node",
      "args": ["./node_modules/component-contracts/dist/radix-primitives.js"]
    }
  }
}
```

### Add to Codex CLI

```bash
codex mcp add variant-authority node ./node_modules/component-contracts/dist/variant-authority.js
codex mcp add radix-primitives node ./node_modules/component-contracts/dist/radix-primitives.js
```

---

## Project structure

```
component-contracts/
  src/
    variant-authority/
      server.ts             ← MCP server entry point
      registry.ts           ← JSON registry read/write
      diff.ts               ← Manifest diff + semver classification
      validate.ts           ← Props validation against manifest
      tools/
        get_manifest.ts
        set_manifest.ts
        deprecate_variant.ts
        get_usage.ts
        diff_manifests.ts
        validate_props.ts
    radix-primitives/
      server.ts             ← MCP server entry point
      capability-map.ts     ← Static primitive data
      tools/
        get_primitive.ts
        get_composition_pattern.ts
        get_caveats.ts
        list_primitives.ts
    shared/
      schemas.ts            ← Shared TypeScript interfaces
      errors.ts             ← Shared error types
  dist/
    variant-authority.js    ← Compiled server
    radix-primitives.js     ← Compiled server
  specs/                    ← Spec-first development docs
  context/                  ← Context documentation per feature
  tests/                    ← Test files
    variant-authority/
    radix-primitives/
  .variant-authority/       ← Registry storage (gitignored in consuming repos)
```

---

## Development philosophy

This project follows **spec-first development**. Every feature is developed in this order with no exceptions:

1. **Spec** — `specs/feature-name.md` written first. Defines purpose, inputs, outputs, edge cases, and acceptance criteria.
2. **Tests** — `tests/feature-name.test.ts` written second. Tests that will fail against a non-existent implementation.
3. **Context** — `context/feature-name.md` written third. Documents which external APIs are touched, which schemas are affected, which MCP tools are involved.
4. **Implementation** — written last, after steps 1–3 are reviewed and approved.

No implementation code exists in this repo without a corresponding spec and test file.

---

## Compatibility

Both servers implement the [Model Context Protocol](https://modelcontextprotocol.io) using the TypeScript MCP SDK. They are compatible with any MCP client that supports the standard tool calling interface:

- Claude Code
- Cursor
- Codex CLI
- Any MCP-compatible agent

---

## Relationship to d2c

`component-contracts` is a dependency of the [d2c skill](https://github.com/jeremysykes/d2c). The d2c skill uses `variant-authority` to seed, read, and update the component registry across all six lifecycle phases. It uses `radix-primitives` during the build phase to determine the correct primitive base for each scaffolded component.

`component-contracts` is designed to be useful independently of d2c — any design system tooling that needs a persistent variant registry or a Radix capability map can use these servers directly.

---

## What's next

**Storybook integration** — a third server (`storybook-contracts`) that reads `parameters.status` from deployed Storybook stories and syncs lifecycle status back to the variant registry.

**Framework expansion** — the Radix capability map currently covers React. Vue Primitives (@radix-vue) and Web Components (@radix-ui/primitives) are the next targets.

**Registry persistence options** — the current registry uses flat JSON files. A SQLite backend option would support larger design systems with hundreds of components.

---

## License

MIT
