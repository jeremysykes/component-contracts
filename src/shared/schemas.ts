export interface VariantManifest {
  component: string;
  version: string;
  figmaFileKey: string;
  figmaNodeId: string;
  variants: Record<string, VariantDefinition>;
  slots: SlotDefinition[];
  tokens: Record<string, TokenBinding>;
  authority: AuthorityMap;
  deprecated?: DeprecationInfo;
  createdAt: string;
  updatedAt: string;
}

export interface VariantDefinition {
  values: string[];
  defaultValue: string;
  type: "string" | "boolean" | "number";
  description?: string;
}

export interface SlotDefinition {
  name: string;
  required: boolean;
  description?: string;
}

export interface TokenBinding {
  figmaValue: string;
  codeValue: string;
  dtcgPath: string;
  category:
    | "color"
    | "spacing"
    | "typography"
    | "border"
    | "shadow"
    | "opacity";
}

export interface AuthorityMap {
  structure: "figma" | "cva";
  visual: "figma" | "cva";
  conflictStrategy: "escalate" | "figma-wins" | "cva-wins";
}

export interface DeprecationInfo {
  deprecated: true;
  replacedBy: string;
  migrationGuide: string;
  deprecatedAt: string;
  removalTarget?: string;
}

export function isVariantManifest(
  value: unknown
): value is VariantManifest {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.component === "string" &&
    typeof v.version === "string" &&
    typeof v.figmaFileKey === "string" &&
    typeof v.figmaNodeId === "string" &&
    typeof v.variants === "object" &&
    v.variants !== null &&
    Array.isArray(v.slots) &&
    typeof v.tokens === "object" &&
    v.tokens !== null &&
    typeof v.authority === "object" &&
    v.authority !== null &&
    typeof v.createdAt === "string" &&
    typeof v.updatedAt === "string"
  );
}

export interface PrimitiveCapability {
  name: string;
  radixPackage: string | null;
  vuePackage: string | null;
  accessibilityContract: {
    role: string;
    keyboardInteractions: string[];
    ariaAttributes: string[];
  };
  compositionPattern: string;
  caveats: string[];
  recommendedFor: string[];
  avoidFor: string[];
  version: string;
}
