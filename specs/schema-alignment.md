# Schema Alignment — VariantManifest must match d2c authority

## Purpose

Align the `VariantManifest` interface in component-contracts (`src/shared/schemas.ts`) to the authoritative schema defined by d2c (`.claude/skills/d2c/schemas/variant-manifest.ts`). The d2c schema is the product spec — component-contracts implements the MCP servers that operate on this type.

## Authority

- **d2c** defines the schema: `VariantManifest`, `VariantDefinition`, `SlotDefinition`, `TokenBinding`, `AuthorityMap`, `DeprecationInfo`
- **component-contracts** must match it exactly
- d2c repo: https://github.com/jeremysykes/d2c
- component-contracts repo: https://github.com/jeremysykes/component-contracts

## Changes required

### Fields to add

| Field | Type | Purpose |
|---|---|---|
| `figmaFileKey` | `string` | Figma file identifier for design traceability |
| `figmaNodeId` | `string` | Figma node identifier for the component |
| `slots` | `SlotDefinition[]` | Named children (label, icon, etc.) |
| `tokens` | `Record<string, TokenBinding>` | Token bindings with Figma/code values and DTCG paths |
| `authority` | `AuthorityMap` | Per-artifact truth authority (structure vs visual) |
| `createdAt` | `string` | ISO 8601 creation timestamp (write-once) |

### Fields to remove

| Field | Reason |
|---|---|
| `status` | Lifecycle is tracked in d2c's `status-registry.json`, not the manifest |
| `props` | Replaced by `slots` (named children) and `variants` (variant axes) |
| `consumers` | Runtime data returned by `get_usage` tool, not stored on manifest |

### Fields to rename

| Old name | New name |
|---|---|
| `default` (in variant object) | `defaultValue` |
| `lastUpdated` | `updatedAt` |

### Sub-interfaces to add

- **VariantDefinition**: `{ values: string[], defaultValue: string, type: "string" | "boolean" | "number", description?: string }`
- **SlotDefinition**: `{ name: string, required: boolean, description?: string }`
- **TokenBinding**: `{ figmaValue: string, codeValue: string, dtcgPath: string, category: "color" | "spacing" | "typography" | "border" | "shadow" | "opacity" }`
- **AuthorityMap**: `{ structure: "figma" | "cva", visual: "figma" | "cva", conflictStrategy: "escalate" | "figma-wins" | "cva-wins" }`
- **DeprecationInfo**: `{ deprecated: true, replacedBy: string, migrationGuide: string, deprecatedAt: string, removalTarget?: string }`

### Deprecation restructuring

Old (flat):
```typescript
deprecatedAt?: string;
replacedBy?: string;
```

New (structured):
```typescript
deprecated?: DeprecationInfo;
```

### Type guard

Add `isVariantManifest(value: unknown): value is VariantManifest` — validates presence and types of all required fields.

### PrimitiveCapability update

Add `vuePackage: string | null` field to support `--framework vue` scaffolding in d2c. All 16 Radix primitives have Vue equivalents via `radix-vue`.

## Edge cases

1. **Existing manifests on disk won't match new schema** — any `.variant-authority/*.manifest.json` written with the old schema will fail `isVariantManifest()` validation. The d2c design phase must be re-run to regenerate compliant manifests.
2. **`get_usage` currently populates `consumers` on the manifest** — with `consumers` removed from the schema, `get_usage` must return a standalone result (it already does — the field was redundant).
3. **`diff_manifests` helper references `status`, `props`** — must be rewritten to compare `variants` (with `VariantDefinition`), `slots`, `tokens`, and `authority`.
4. **`validate_props` references `props` and `variants.deprecated`** — must be rewritten to validate against `variants` (check values against `VariantDefinition.values`) and `slots` (check required slots). Per-variant-value deprecation (`deprecated?: string[]`, `migrations?: Record<string, string>`) no longer exists — component-level deprecation uses `deprecated?: DeprecationInfo` instead.
5. **`set_manifest` must validate before writing** — call `isVariantManifest()` before `writeManifest()`. If invalid, return an error asking to check the manifest structure.

## Acceptance criteria

- [ ] `VariantManifest` in component-contracts is identical to d2c's schema
- [ ] All 5 sub-interfaces (`VariantDefinition`, `SlotDefinition`, `TokenBinding`, `AuthorityMap`, `DeprecationInfo`) are defined and exported
- [ ] `isVariantManifest()` type guard is exported and validates all required fields
- [ ] `PrimitiveCapability` has `vuePackage: string | null` field
- [ ] Old fields (`status`, `props`, `consumers`, `lastUpdated`) are removed
- [ ] `default` renamed to `defaultValue` in variant definitions
- [ ] TypeScript compiles with `--noEmit` (downstream breakage is expected and addressed in server-updates spec)
