# Server Updates Context — MCP SDK Patterns and Impact Analysis

## MCP SDK Patterns Used

The `variant-authority` server uses `@modelcontextprotocol/sdk` v1.12.x:

- **Server instantiation**: `new Server({ name, version }, { capabilities: { tools: {} } })`
- **Tool registration**: `server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [...] }))`
- **Tool dispatch**: `server.setRequestHandler(CallToolRequestSchema, async (request) => { ... })` with switch on `request.params.name`
- **Tool response format**: `{ content: [{ type: "text", text: "..." }] }` for success, add `isError: true` for errors
- **Transport**: `StdioServerTransport` for CLI usage

Each tool definition in the `ListToolsRequestSchema` handler requires:
- `name`: string identifier used in the switch dispatch
- `description`: human-readable purpose
- `inputSchema`: JSON Schema object with `type: "object"`, `properties`, and `required`

## Tool Changes Summary

| Old Tool | New Tool | Change Type |
|---|---|---|
| `get_manifest` | `get_manifest` | Unchanged |
| `set_manifest` | `set_manifest` | Add `isVariantManifest()` validation, preserve `createdAt`, use `updatedAt` |
| `deprecate_variant` | (removed) | Deleted entirely — per-variant deprecation removed from schema |
| `get_usage` | `get_usage` | Unchanged |
| `diff_manifests` | `diff_manifests` | Rewritten — compare slots/tokens/authority instead of status/props |
| `validate_props` | `validate_usage` | Renamed and rewritten — check slots and component-level deprecation |

## Helper Function Rewrites

### `diffManifests(component, before, after)`

**Removed comparisons:**
- `status` field (no longer in schema)
- `props` object (no longer in schema)
- Per-variant `deprecated[]` and `migrations{}` (no longer in `VariantDefinition`)

**Updated comparisons:**
- Variants: use `defaultValue` instead of `default`, compare `type` field

**Added comparisons:**
- `slots`: added/removed slots, changed `required` flag
- `tokens`: added/removed token keys, changed `figmaValue`/`codeValue`
- `authority`: `structure`, `visual`, `conflictStrategy` changes
- `deprecated`: component-level deprecation added/removed (major change)

### `validateUsage(manifest, usage)` (was `validateProps`)

**Kept:**
- Variant value validation against `VariantDefinition.values`

**Removed:**
- Per-variant `deprecated` check
- Per-variant `migrations` lookup
- All `props` validation (required props, prop deprecation)

**Added:**
- Required slots check: iterate `manifest.slots`, flag missing required slots
- Component-level deprecation warning: if `manifest.deprecated?.deprecated === true`

## Registry Impact

`src/variant-authority/registry.ts` needs updates to `writeManifest`:
- Check if manifest already exists, read to preserve `createdAt`
- Always set `updatedAt` to current ISO timestamp
- No longer set `lastUpdated`

## Dependency Chain

```
schemas.ts (already updated)
    |
    +-- server.ts (this task)
    |     +-- registry.ts (preserve createdAt/updatedAt)
    |     +-- errors.ts (no changes needed)
    |
    +-- capability-map.ts (separate task — vuePackage)
```

## Breaking Changes for MCP Clients

Any MCP client currently calling `deprecate_variant` will get an "Unknown tool" error. Clients calling `validate_props` must update to `validate_usage`. The response shape for `diff_manifests` changes (different `path` values in `DiffChange` objects).
