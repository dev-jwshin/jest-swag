/**
 * TypeScript type definitions for improved type safety
 */

// SupertestResponse type definition (avoid external dependency)
interface SupertestResponse {
  status: number;
  body: any;
  headers: any;
}

/**
 * Generic response type for type-safe responses
 */
export interface TypedResponse<T> {
  statusCode: number;
  description: string;
  data?: T;
  schema?: any;
}

/**
 * Type-safe response function wrapper
 * Note: This is for type hints only, actual implementation is in matchers
 */
export function typedResponseWrapper<T = any>(
  statusCode: number,
  description: string,
  testFn: () => SupertestResponse | Promise<SupertestResponse>,
): TypedResponse<T> {
  // This will be handled by the actual response function
  return {
    statusCode,
    description,
    data: undefined as any,
  };
}

/**
 * Common model types
 */
export interface User {
  id: string;
  name: string;
  email: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ErrorResponse {
  error: string;
  message: string;
  timestamp?: string;
  path?: string;
  details?: any;
}

/**
 * Request body types
 */
export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
  expiresIn: number;
}

/**
 * Type guards for schema detection
 */
export function isDate(value: any): boolean {
  return value instanceof Date || 
    (typeof value === 'string' && !isNaN(Date.parse(value)));
}

export function isUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

export function isEmail(value: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

export function isUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Schema builder with type inference
 */
export class SchemaBuilder<T = any> {
  private schema: any = {};

  static from<T>(example: T): SchemaBuilder<T> {
    const builder = new SchemaBuilder<T>();
    builder.schema = builder.inferSchema(example);
    return builder;
  }

  private inferSchema(value: any): any {
    if (value === null) {
      return { type: 'null' };
    }

    if (Array.isArray(value)) {
      return {
        type: 'array',
        items: value.length > 0 ? this.inferSchema(value[0]) : { type: 'object' },
      };
    }

    const type = typeof value;

    if (type === 'object') {
      const properties: any = {};
      const required: string[] = [];

      for (const [key, val] of Object.entries(value)) {
        properties[key] = this.inferSchema(val);
        if (val !== undefined && val !== null) {
          required.push(key);
        }
      }

      return {
        type: 'object',
        properties,
        required: required.length > 0 ? required : undefined,
      };
    }

    if (type === 'string') {
      // Detect special string formats
      if (isEmail(value as string)) {
        return { type: 'string', format: 'email' };
      }
      if (isUUID(value as string)) {
        return { type: 'string', format: 'uuid' };
      }
      if (isDate(value)) {
        return { type: 'string', format: 'date-time' };
      }
      if (isUrl(value as string)) {
        return { type: 'string', format: 'uri' };
      }
      return { type: 'string' };
    }

    if (type === 'number') {
      return Number.isInteger(value) ? { type: 'integer' } : { type: 'number' };
    }

    if (type === 'boolean') {
      return { type: 'boolean' };
    }

    return { type };
  }

  addProperty(name: string, schema: any, required = false): SchemaBuilder<T> {
    if (!this.schema.properties) {
      this.schema.properties = {};
    }
    this.schema.properties[name] = schema;

    if (required) {
      if (!this.schema.required) {
        this.schema.required = [];
      }
      this.schema.required.push(name);
    }

    return this;
  }

  setRequired(fields: string[]): SchemaBuilder<T> {
    this.schema.required = fields;
    return this;
  }

  build(): any {
    return this.schema;
  }
}

/**
 * Type-safe parameter builder
 */
export class ParameterBuilder {
  private parameters: any[] = [];

  query(name: string, type: 'string' | 'number' | 'boolean' | 'integer', options?: {
    description?: string;
    required?: boolean;
    enum?: any[];
    default?: any;
  }): ParameterBuilder {
    this.parameters.push({
      name,
      in: 'query',
      required: options?.required,
      description: options?.description,
      schema: {
        type,
        enum: options?.enum,
        default: options?.default,
      },
    });
    return this;
  }

  path(name: string, type: 'string' | 'number' | 'integer', description?: string): ParameterBuilder {
    this.parameters.push({
      name,
      in: 'path',
      required: true,
      description,
      schema: { type },
    });
    return this;
  }

  header(name: string, type: 'string', options?: {
    description?: string;
    required?: boolean;
  }): ParameterBuilder {
    this.parameters.push({
      name,
      in: 'header',
      required: options?.required,
      description: options?.description,
      schema: { type },
    });
    return this;
  }

  build(): any[] {
    return this.parameters;
  }
}

/**
 * Export helpers but not matchers (to avoid duplicate exports)
 */
export * from '../helpers';