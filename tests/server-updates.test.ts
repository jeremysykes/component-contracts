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
    expect(serverContent).toContain('"get_manifest"');
  });

  it("has set_manifest tool", () => {
    expect(serverContent).toContain('"set_manifest"');
  });

  it("has get_usage tool", () => {
    expect(serverContent).toContain('"get_usage"');
  });

  it("has diff_manifests tool", () => {
    expect(serverContent).toContain('"diff_manifests"');
  });

  it("has validate_usage tool", () => {
    expect(serverContent).toContain('"validate_usage"');
  });

  it("does NOT have deprecate_variant tool", () => {
    expect(serverContent).not.toContain('"deprecate_variant"');
  });
});

describe("McpServer API", () => {
  it("imports McpServer not deprecated Server", () => {
    expect(serverContent).toContain("McpServer");
    expect(serverContent).not.toMatch(/import\s*{\s*Server\s*}/);
  });

  it("uses server.tool() for registration", () => {
    expect(serverContent).toMatch(/server\.tool\(/);
  });

  it("uses zod for input schemas", () => {
    expect(serverContent).toContain("z.string()");
  });
});

describe("set_manifest uses isVariantManifest", () => {
  it("imports isVariantManifest", () => {
    expect(serverContent).toContain("isVariantManifest");
  });

  it("validates before writing", () => {
    const setManifestSection = serverContent.slice(
      serverContent.indexOf('"set_manifest"'),
      serverContent.indexOf('"get_usage"')
    );
    expect(setManifestSection).toContain("isVariantManifest");
  });

  it("manages createdAt timestamp", () => {
    expect(serverContent).toContain("createdAt");
  });

  it("manages updatedAt timestamp", () => {
    expect(serverContent).toContain("updatedAt");
  });
});

describe("diff_manifests handles new schema fields", () => {
  it("compares slots", () => {
    expect(serverContent).toContain("slots");
  });

  it("compares tokens", () => {
    expect(serverContent).toContain("tokens");
  });

  it("compares authority", () => {
    expect(serverContent).toContain("authority");
  });
});

describe("No old schema references", () => {
  it("does not reference lastUpdated", () => {
    expect(serverContent).not.toContain("lastUpdated");
  });

  it("does not have status enum comparison", () => {
    expect(serverContent).not.toMatch(/before\.status\s*!==\s*after\.status/);
  });
});
