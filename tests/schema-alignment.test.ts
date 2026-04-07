import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const schemasPath = join(import.meta.dirname, "../src/shared/schemas.ts");
const schemasContent = readFileSync(schemasPath, "utf-8");

describe("VariantManifest schema alignment with d2c", () => {
  it("exports VariantManifest interface", () => {
    expect(schemasContent).toMatch(/export interface VariantManifest/);
  });

  it("has component field (string)", () => {
    expect(schemasContent).toMatch(/component:\s*string/);
  });

  it("has version field (string)", () => {
    expect(schemasContent).toMatch(/version:\s*string/);
  });

  it("has figmaFileKey field (string)", () => {
    expect(schemasContent).toMatch(/figmaFileKey:\s*string/);
  });

  it("has figmaNodeId field (string)", () => {
    expect(schemasContent).toMatch(/figmaNodeId:\s*string/);
  });

  it("has variants field (Record<string, VariantDefinition>)", () => {
    expect(schemasContent).toMatch(
      /variants:\s*Record<string,\s*VariantDefinition>/
    );
  });

  it("has slots field (SlotDefinition[])", () => {
    expect(schemasContent).toMatch(/slots:\s*SlotDefinition\[\]/);
  });

  it("has tokens field (Record<string, TokenBinding>)", () => {
    expect(schemasContent).toMatch(
      /tokens:\s*Record<string,\s*TokenBinding>/
    );
  });

  it("has authority field (AuthorityMap)", () => {
    expect(schemasContent).toMatch(/authority:\s*AuthorityMap/);
  });

  it("has optional semanticTokenFile field", () => {
    expect(schemasContent).toMatch(/semanticTokenFile\?:\s*string/);
  });

  it("has optional deprecated field (DeprecationInfo)", () => {
    expect(schemasContent).toMatch(/deprecated\?:\s*DeprecationInfo/);
  });

  it("has createdAt field (string)", () => {
    expect(schemasContent).toMatch(/createdAt:\s*string/);
  });

  it("has updatedAt field (string)", () => {
    expect(schemasContent).toMatch(/updatedAt:\s*string/);
  });

  // Must NOT have old fields
  it("does not have status enum field", () => {
    expect(schemasContent).not.toMatch(
      /^\s*status:\s*"alpha"\s*\|\s*"beta"/m
    );
  });

  it("does not have props field", () => {
    expect(schemasContent).not.toMatch(/^\s*props:\s*\{/m);
  });

  it("does not have consumers field", () => {
    expect(schemasContent).not.toMatch(/^\s*consumers:\s*string\[\]/m);
  });

  it("does not have lastUpdated field", () => {
    expect(schemasContent).not.toMatch(/lastUpdated:\s*string/);
  });
});

describe("Sub-interfaces", () => {
  it("exports VariantDefinition with values, defaultValue, type", () => {
    expect(schemasContent).toMatch(/export interface VariantDefinition/);
    expect(schemasContent).toMatch(/defaultValue:\s*string/);
    expect(schemasContent).toMatch(
      /type:\s*"string"\s*\|\s*"boolean"\s*\|\s*"number"/
    );
  });

  it("exports SlotDefinition with name, required", () => {
    expect(schemasContent).toMatch(/export interface SlotDefinition/);
    expect(schemasContent).toMatch(/name:\s*string/);
    expect(schemasContent).toMatch(/required:\s*boolean/);
  });

  it("exports TokenBinding with figmaValue, codeValue, dtcgPath, category", () => {
    expect(schemasContent).toMatch(/export interface TokenBinding/);
    expect(schemasContent).toMatch(/figmaValue:\s*string/);
    expect(schemasContent).toMatch(/codeValue:\s*string/);
    expect(schemasContent).toMatch(/dtcgPath:\s*string/);
    expect(schemasContent).toMatch(/category:/);
  });

  it("exports AuthorityMap with structure, visual, conflictStrategy", () => {
    expect(schemasContent).toMatch(/export interface AuthorityMap/);
    expect(schemasContent).toMatch(/structure:\s*"figma"\s*\|\s*"cva"/);
    expect(schemasContent).toMatch(/visual:\s*"figma"\s*\|\s*"cva"/);
    expect(schemasContent).toMatch(/conflictStrategy:/);
  });

  it("exports DeprecationInfo with deprecated, replacedBy, migrationGuide", () => {
    expect(schemasContent).toMatch(/export interface DeprecationInfo/);
    expect(schemasContent).toMatch(/deprecated:\s*true/);
    expect(schemasContent).toMatch(/replacedBy:\s*string/);
    expect(schemasContent).toMatch(/migrationGuide:\s*string/);
    expect(schemasContent).toMatch(/deprecatedAt:\s*string/);
  });
});

describe("Type guard", () => {
  it("exports isVariantManifest function", () => {
    expect(schemasContent).toMatch(
      /export function isVariantManifest/
    );
  });

  it("returns value is VariantManifest", () => {
    expect(schemasContent).toMatch(/value is VariantManifest/);
  });
});

describe("PrimitiveCapability", () => {
  it("still exports PrimitiveCapability interface", () => {
    expect(schemasContent).toMatch(/export interface PrimitiveCapability/);
  });

  it("has vuePackage field", () => {
    expect(schemasContent).toMatch(/vuePackage:\s*string\s*\|\s*null/);
  });
});
