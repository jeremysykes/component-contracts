import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const serverPath = join(
  import.meta.dirname,
  "../src/variant-authority/server.ts"
);
const serverContent = readFileSync(serverPath, "utf-8");

describe("Tool existence", () => {
  it("has get_manifest tool", () => {
    expect(serverContent).toMatch(/name:\s*"get_manifest"/);
  });

  it("has set_manifest tool", () => {
    expect(serverContent).toMatch(/name:\s*"set_manifest"/);
  });

  it("has get_usage tool", () => {
    expect(serverContent).toMatch(/name:\s*"get_usage"/);
  });

  it("has diff_manifests tool", () => {
    expect(serverContent).toMatch(/name:\s*"diff_manifests"/);
  });

  it("has validate_usage tool", () => {
    expect(serverContent).toMatch(/name:\s*"validate_usage"/);
  });
});

describe("Removed tools", () => {
  it("does NOT have deprecate_variant tool", () => {
    expect(serverContent).not.toMatch(/deprecate_variant/);
  });
});

describe("set_manifest uses isVariantManifest", () => {
  it("imports isVariantManifest", () => {
    expect(serverContent).toMatch(/isVariantManifest/);
  });

  it("calls isVariantManifest in set_manifest section", () => {
    // Extract the set_manifest case block and verify isVariantManifest is used
    const setManifestIdx = serverContent.indexOf('case "set_manifest"');
    expect(setManifestIdx).toBeGreaterThan(-1);
    const afterSetManifest = serverContent.slice(
      setManifestIdx,
      setManifestIdx + 1500
    );
    expect(afterSetManifest).toMatch(/isVariantManifest/);
  });
});

describe("diff function references aligned fields", () => {
  it("references slots in diff logic", () => {
    const diffIdx = serverContent.indexOf("function diffManifests");
    expect(diffIdx).toBeGreaterThan(-1);
    const diffBlock = serverContent.slice(diffIdx, diffIdx + 3000);
    expect(diffBlock).toMatch(/slots/);
  });

  it("references tokens in diff logic", () => {
    const diffIdx = serverContent.indexOf("function diffManifests");
    expect(diffIdx).toBeGreaterThan(-1);
    const diffBlock = serverContent.slice(diffIdx, diffIdx + 3000);
    expect(diffBlock).toMatch(/tokens/);
  });

  it("references authority in diff logic", () => {
    const diffIdx = serverContent.indexOf("function diffManifests");
    expect(diffIdx).toBeGreaterThan(-1);
    const diffBlock = serverContent.slice(diffIdx, diffIdx + 3000);
    expect(diffBlock).toMatch(/authority/);
  });

  it("does NOT reference props in diff logic", () => {
    const diffIdx = serverContent.indexOf("function diffManifests");
    expect(diffIdx).toBeGreaterThan(-1);
    const diffBlock = serverContent.slice(diffIdx, diffIdx + 3000);
    expect(diffBlock).not.toMatch(/\.props/);
  });

  it("does NOT reference status in diff logic", () => {
    const diffIdx = serverContent.indexOf("function diffManifests");
    expect(diffIdx).toBeGreaterThan(-1);
    const diffBlock = serverContent.slice(diffIdx, diffIdx + 3000);
    expect(diffBlock).not.toMatch(/\.status/);
  });
});

describe("validate function references aligned fields", () => {
  it("references slots in validate logic", () => {
    const valIdx = serverContent.indexOf("function validateUsage");
    expect(valIdx).toBeGreaterThan(-1);
    const valBlock = serverContent.slice(valIdx, valIdx + 1500);
    expect(valBlock).toMatch(/slots/);
  });

  it("does NOT reference props in validate logic", () => {
    const valIdx = serverContent.indexOf("function validateUsage");
    expect(valIdx).toBeGreaterThan(-1);
    const valBlock = serverContent.slice(valIdx, valIdx + 1500);
    expect(valBlock).not.toMatch(/\.props/);
  });
});

describe("No lastUpdated references", () => {
  it("does not contain lastUpdated anywhere", () => {
    expect(serverContent).not.toMatch(/lastUpdated/);
  });
});
