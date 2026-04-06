# Server Updates Spec — Tool Changes for Aligned Schema

## Overview

The `variant-authority` MCP server (`src/variant-authority/server.ts`) must be updated to match the aligned `VariantManifest` schema from commit 3f0f980. The schema removed per-variant deprecation/migrations, `props`, `status`, and `lastUpdated`, and added `slots`, `tokens`, `authority`, and component-level `deprecated`.

## Tool Changes

### 1. Remove `deprecate_variant` tool

Per-variant deprecation (`deprecated[]`, `migrations{}` on variant groups) no longer exists in the schema. `VariantDefinition` now only has `values`, `defaultValue`, `type`, and optional `description`. The `deprecate_variant` tool must be removed from both the `ListToolsRequestSchema` handler and the `CallToolRequestSchema` switch statement.

### 2. Rename `validate_props` to `validate_usage`

The concept of "props" no longer exists in the manifest. The tool is renamed to `validate_usage` to reflect its broader responsibility: validating variant values, required slots, and component-level deprecation warnings.

### 3. `set_manifest` must validate with `isVariantManifest()`

Before writing a manifest, `set_manifest` must call `isVariantManifest(manifest)` on the incoming data. If validation fails, return an error response with `isError: true`. On success:
- Preserve `createdAt` from existing manifest if the component already has one
- Set `updatedAt` to current ISO timestamp
- Remove any reference to `lastUpdated`

### 4. `diff_manifests` must compare variants/slots/tokens/authority

The `diffManifests` helper must be rewritten:
- **Remove**: `status` comparison (field no longer exists)
- **Remove**: `props` comparison (field no longer exists)
- **Update variants**: Use `defaultValue` instead of `default`, compare `type` field, remove per-variant `deprecated`/`migrations` comparisons
- **Add slots**: Compare added/removed slots, changed `required` flag
- **Add tokens**: Compare added/removed tokens, changed `figmaValue`/`codeValue`
- **Add authority**: Compare `structure`, `visual`, `conflictStrategy`
- **Add deprecated**: Component-level deprecation added/removed

### 5. `validate_usage` must check variant values and required slots

The `validateUsage` helper (renamed from `validateProps`) must:
- Check variant values against `VariantDefinition.values` (keep existing logic)
- Remove per-variant deprecated/migrations checks
- Remove `props` validation entirely
- Add required slots check: iterate `manifest.slots`, flag any required slot missing from usage
- Add component-level deprecation warning: if `manifest.deprecated?.deprecated === true`, emit a warning

## Edge Cases

1. **Empty slots array**: If `manifest.slots` is `[]`, required slots check should pass with no violations.
2. **Missing authority fields**: If `before.authority` or `after.authority` is undefined in diff, treat all fields as added/removed rather than crashing.
3. **Component-level deprecation toggle**: If `before.deprecated` is undefined and `after.deprecated` is set (or vice versa), classify as a major change in diff.
4. **Partial manifest in set_manifest**: If `isVariantManifest()` returns false (e.g. missing `slots` or `tokens`), the error message must be descriptive enough for the caller to know what is missing.
5. **Existing manifest without createdAt**: If reading an old manifest that lacks `createdAt`, do not crash — fall back to current timestamp for `createdAt`.

## Acceptance Criteria

- [ ] `deprecate_variant` does not appear in tool definitions or switch cases
- [ ] `validate_props` is replaced by `validate_usage` everywhere
- [ ] `set_manifest` calls `isVariantManifest()` and returns error on invalid input
- [ ] `set_manifest` preserves `createdAt` from existing manifests
- [ ] `diffManifests` compares slots, tokens, authority, and component-level deprecated
- [ ] `diffManifests` does not reference `status`, `props`, `default` (must use `defaultValue`)
- [ ] `validateUsage` checks required slots and component-level deprecation
- [ ] `validateUsage` does not reference `props`, per-variant `deprecated`, or `migrations`
- [ ] No references to `lastUpdated` anywhere in server.ts
- [ ] `npx tsc --noEmit` produces 0 errors for server.ts
