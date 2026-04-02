export class ManifestNotFoundError extends Error {
  public readonly component: string;

  constructor(component: string) {
    super(`Manifest not found for component: ${component}`);
    this.name = "ManifestNotFoundError";
    this.component = component;
  }
}

export class ValidationError extends Error {
  public readonly violations: string[];

  constructor(message: string, violations: string[] = []) {
    super(message);
    this.name = "ValidationError";
    this.violations = violations;
  }
}

export class InvalidManifestError extends Error {
  public readonly details: string[];

  constructor(message: string, details: string[] = []) {
    super(message);
    this.name = "InvalidManifestError";
    this.details = details;
  }
}
