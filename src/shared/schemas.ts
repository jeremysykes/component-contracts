export interface VariantManifest {
  component: string;
  version: string;
  status: "alpha" | "beta" | "stable" | "deprecated";
  variants: {
    [variantName: string]: {
      values: string[];
      default: string;
      deprecated?: string[];
      migrations?: Record<string, string>;
    };
  };
  props: {
    [propName: string]: {
      type: string;
      required: boolean;
      deprecated?: boolean;
      replacement?: string;
    };
  };
  consumers: string[];
  deprecatedAt?: string;
  replacedBy?: string;
  lastUpdated: string;
}

export interface PrimitiveCapability {
  name: string;
  radixPackage: string | null;
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
