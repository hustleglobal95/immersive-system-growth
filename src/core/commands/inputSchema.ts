export type ForgeInputField =
  | {
      type: "string";
      description?: string;
      minLength?: number;
      maxLength?: number;
      pattern?: string;
    }
  | {
      type: "number" | "integer";
      description?: string;
      minimum?: number;
      maximum?: number;
    }
  | {
      type: "boolean";
      description?: string;
    }
  | {
      type: "enum";
      description?: string;
      values: string[];
    }
  | {
      type: "object";
      description?: string;
      allowAdditionalProperties?: boolean;
    };

export interface ForgeCommandInputSchema {
  type: "object";
  description?: string;
  properties: Record<string, ForgeInputField>;
  required?: string[];
  allowAdditionalProperties?: boolean;
}

export interface ForgeInputIssue {
  code: string;
  message: string;
  path: string;
}

export interface ForgeInputValidation {
  ok: boolean;
  value: Record<string, unknown>;
  issues: ForgeInputIssue[];
}

export function validateCommandInput(schema: ForgeCommandInputSchema | undefined, input: unknown): ForgeInputValidation {
  if (!schema) return { ok: true, value: isRecord(input) ? structuredClone(input) : {}, issues: [] };
  if (!isRecord(input)) {
    return {
      ok: false,
      value: {},
      issues: [{ code: "command.input.objectRequired", message: "Command input must be an object.", path: "input" }],
    };
  }

  const issues: ForgeInputIssue[] = [];
  const value: Record<string, unknown> = {};
  const required = new Set(schema.required ?? []);

  for (const key of required) {
    if (!(key in input) || input[key] === undefined || input[key] === null) {
      issues.push({ code: "command.input.required", message: `${key} is required.`, path: `input.${key}` });
    }
  }

  for (const [key, raw] of Object.entries(input)) {
    const field = schema.properties[key];
    if (!field) {
      if (!(schema.allowAdditionalProperties ?? false)) {
        issues.push({ code: "command.input.unknownField", message: `${key} is not a supported input field.`, path: `input.${key}` });
      } else value[key] = structuredClone(raw);
      continue;
    }
    if (raw === undefined || raw === null) {
      if (!required.has(key)) continue;
      continue;
    }

    const fieldIssues = validateField(field, raw, `input.${key}`);
    issues.push(...fieldIssues);
    if (!fieldIssues.length) value[key] = structuredClone(raw);
  }

  return { ok: issues.length === 0, value, issues };
}

function validateField(field: ForgeInputField, value: unknown, path: string): ForgeInputIssue[] {
  const issues: ForgeInputIssue[] = [];
  if (field.type === "string") {
    if (typeof value !== "string") return [issue("command.input.string", "Expected a string.", path)];
    if (field.minLength !== undefined && value.length < field.minLength) issues.push(issue("command.input.minLength", `Must contain at least ${field.minLength} character(s).`, path));
    if (field.maxLength !== undefined && value.length > field.maxLength) issues.push(issue("command.input.maxLength", `Must contain at most ${field.maxLength} character(s).`, path));
    if (field.pattern) {
      try {
        if (!new RegExp(field.pattern).test(value)) issues.push(issue("command.input.pattern", "Value does not match the required pattern.", path));
      } catch {
        issues.push(issue("command.schema.patternInvalid", "Command schema contains an invalid regular expression.", path));
      }
    }
    return issues;
  }

  if (field.type === "number" || field.type === "integer") {
    if (typeof value !== "number" || !Number.isFinite(value)) return [issue("command.input.number", "Expected a finite number.", path)];
    if (field.type === "integer" && !Number.isInteger(value)) issues.push(issue("command.input.integer", "Expected an integer.", path));
    if (field.minimum !== undefined && value < field.minimum) issues.push(issue("command.input.minimum", `Must be at least ${field.minimum}.`, path));
    if (field.maximum !== undefined && value > field.maximum) issues.push(issue("command.input.maximum", `Must be at most ${field.maximum}.`, path));
    return issues;
  }

  if (field.type === "boolean") {
    return typeof value === "boolean" ? [] : [issue("command.input.boolean", "Expected a boolean.", path)];
  }

  if (field.type === "enum") {
    if (typeof value !== "string") return [issue("command.input.enum", `Expected one of: ${field.values.join(", ")}.`, path)];
    return field.values.includes(value) ? [] : [issue("command.input.enum", `Expected one of: ${field.values.join(", ")}.`, path)];
  }

  if (!isRecord(value)) return [issue("command.input.object", "Expected an object.", path)];
  return issues;
}

function issue(code: string, message: string, path: string): ForgeInputIssue {
  return { code, message, path };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
