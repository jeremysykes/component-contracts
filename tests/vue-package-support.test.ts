import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const capMapPath = join(
  import.meta.dirname,
  "../src/radix-primitives/capability-map.ts"
);
const capMapContent = readFileSync(capMapPath, "utf-8");

const PRIMITIVES = [
  "Dialog",
  "Popover",
  "Tooltip",
  "Select",
  "Tabs",
  "Accordion",
  "Checkbox",
  "RadioGroup",
  "Switch",
  "Slider",
  "DropdownMenu",
  "AlertDialog",
  "Toggle",
  "ToggleGroup",
  "Separator",
  "Label",
];

describe("All primitives have vuePackage", () => {
  for (const name of PRIMITIVES) {
    it(`${name} has vuePackage: "radix-vue"`, () => {
      // Find the block for this primitive
      const blockStart = capMapContent.indexOf(`${name}: {`);
      expect(blockStart).toBeGreaterThan(-1);
      const blockEnd = capMapContent.indexOf("\n  },", blockStart);
      const block = capMapContent.slice(blockStart, blockEnd);
      expect(block).toMatch(/vuePackage:\s*"radix-vue"/);
    });
  }
});
