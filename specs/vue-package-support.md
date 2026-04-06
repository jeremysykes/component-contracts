# Vue Package Support Spec — Radix Primitives Capability Map

## Overview

The `PrimitiveCapability` interface now includes a `vuePackage: string | null` field (added in the schema alignment commit 3f0f980). Every primitive in `src/radix-primitives/capability-map.ts` must include the `vuePackage` field to satisfy TypeScript and provide Vue ecosystem support metadata.

## Requirements

1. All 16 primitives in `CAPABILITY_MAP` must have a `vuePackage` field
2. Each `vuePackage` value should be `"radix-vue"` (the Vue port of Radix UI)
3. The field must appear after `radixPackage` in each entry for consistency
4. After the change, `npx tsc --noEmit` must produce 0 errors

## Primitives to Update

1. Dialog
2. Popover
3. Tooltip
4. Select
5. Tabs
6. Accordion
7. Checkbox
8. RadioGroup
9. Switch
10. Slider
11. DropdownMenu
12. AlertDialog
13. Toggle
14. ToggleGroup
15. Separator
16. Label

## Acceptance Criteria

- [ ] All 16 primitives have `vuePackage: "radix-vue"`
- [ ] `npx tsc --noEmit` produces 0 total errors
- [ ] No other fields are modified
