# Context: Schema Alignment

## Authority relationship

- **d2c** (`/Users/jeremysykes/workspace/projects/d2c`) defines the product spec
- **d2c schema**: `.claude/skills/d2c/schemas/variant-manifest.ts` — the authoritative `VariantManifest`
- **component-contracts** (`/Users/jeremysykes/workspace/projects/component-contracts`) implements the MCP servers
- **component-contracts schema**: `src/shared/schemas.ts` — must match d2c exactly

## MCP SDK dependency

- Package: `@modelcontextprotocol/sdk` ^1.12.1
- Imports used: `Server`, `StdioServerTransport`, `CallToolRequestSchema`, `ListToolsRequestSchema`
- Tool responses: `{ content: [{ type: "text", text: string }], isError?: boolean }`
- Transport: `StdioServerTransport` (runs as child process via stdio)

## Files that import VariantManifest

- `src/variant-authority/server.ts` — imports `VariantManifest` from `../shared/schemas.js`
  - Used in `set_manifest` (casts `args.manifest`), `deprecate_variant` (reads/writes), `diff_manifests` (before/after comparison), `validate_props` (validates against)
- `src/variant-authority/registry.ts` — imports `VariantManifest` from `../shared/schemas.js`
  - Used in `readManifest()` return type and `writeManifest()` parameter type

## Files that import PrimitiveCapability

- `src/radix-primitives/capability-map.ts` — imports `PrimitiveCapability` from `../shared/schemas.js`
  - Used as value type for the `CAPABILITY_MAP` Record

## Downstream impact

### `diffManifests()` in server.ts (lines 386-545)

Currently compares:
- `before.status !== after.status` → **must remove** (status field removed)
- `before.variants` vs `after.variants` → **must update** (variant structure changed: `default` → `defaultValue`, `deprecated`/`migrations` arrays removed, `type` and `description` fields added)
- `before.props` vs `after.props` → **must remove** (props field removed)

Must add comparison for:
- `slots` — added/removed/changed required status
- `tokens` — added/removed/changed values (figmaValue, codeValue)
- `authority` — changed structure, visual, conflictStrategy

### `validateProps()` in server.ts (lines 553-600)

Currently validates:
- Variant values against `variants[key].values` → **keep** (still exists)
- Variant deprecation via `variants[key].deprecated` array → **must remove** (per-value deprecation removed)
- Props deprecation via `props[key].deprecated` → **must remove** (props field removed)
- Required props via `props[key].required` → **must remove** (replaced by slots)

Must add validation for:
- Required slots via `slots[].required`
- Component-level deprecation via `deprecated?.deprecated === true`

### `set_manifest` tool in server.ts (lines 172-189)

Currently:
- Casts `args.manifest as VariantManifest` without validation
- Sets `lastUpdated` → **must change to** `updatedAt`
- No `createdAt` handling

Must change to:
- Validate with `isVariantManifest()` before writing
- Preserve `createdAt` on updates (read existing manifest first)
- Set `updatedAt` to current timestamp

### `registry.ts` writeManifest() (lines 48-57)

Currently writes raw JSON. Must be updated to:
- Preserve `createdAt` on updates
- Always set `updatedAt` to current ISO 8601 timestamp

## Vue framework support

d2c's `--framework vue` flag requires knowing which `radix-vue` package to import for each primitive. The current `PrimitiveCapability` only has `radixPackage` (React). Adding `vuePackage: string | null` enables d2c's build phase to scaffold Vue components with the correct imports.

All 16 Radix primitives have Vue equivalents via the `radix-vue` package.
