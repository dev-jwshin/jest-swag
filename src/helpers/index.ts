/**
 * Common helpers and convenience functions for jest-swag
 */

import { Response as BaseResponse, RequestBody, Parameter, Schema } from '../utils';

// Extended Response type for helpers with additional properties
interface ResponseWithStatus {
  statusCode?: number;
  description: string;
  content?: { [mediaType: string]: { schema: Schema; example?: any } };
  headers?: { [headerName: string]: { description?: string; schema: Schema } };
  schema?: Schema;  // Direct schema shorthand for convenience
  example?: any;    // Direct example shorthand for convenience
}

// Helper to convert ResponseWithStatus to BaseResponse
function toBaseResponse(response: ResponseWithStatus): BaseResponse {
  const { statusCode, schema, example, ...rest } = response;
  
  // If schema or example is provided directly, wrap it in content
  if ((schema || example) && !rest.content) {
    rest.content = {
      'application/json': { 
        schema: schema || { type: 'object' }, 
        example 
      }
    };
  }
  
  return rest as BaseResponse;
}

// Alias for convenience in this file
type Response = ResponseWithStatus;

/**
 * Common response patterns
 */
export const commonResponses = {
  // Success responses
  ok: (description = 'Successful response'): Response => ({
    statusCode: 200,
    description,
  }),
  
  created: (description = 'Resource created'): Response => ({
    statusCode: 201,
    description,
  }),
  
  accepted: (description = 'Request accepted'): Response => ({
    statusCode: 202,
    description,
  }),
  
  noContent: (description = 'No content'): Response => ({
    statusCode: 204,
    description,
  }),
  
  // Client errors
  badRequest: (description = 'Bad request'): Response => ({
    statusCode: 400,
    description,
    schema: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
  }),
  
  unauthorized: (description = 'Unauthorized'): Response => ({
    statusCode: 401,
    description,
    schema: {
      type: 'object',
      properties: {
        error: { type: 'string', example: 'Unauthorized' },
        message: { type: 'string' },
      },
    },
  }),
  
  forbidden: (description = 'Forbidden'): Response => ({
    statusCode: 403,
    description,
    schema: {
      type: 'object',
      properties: {
        error: { type: 'string', example: 'Forbidden' },
        message: { type: 'string' },
      },
    },
  }),
  
  notFound: (description = 'Not found'): Response => ({
    statusCode: 404,
    description,
    schema: {
      type: 'object',
      properties: {
        error: { type: 'string', example: 'Not Found' },
        message: { type: 'string' },
      },
    },
  }),
  
  conflict: (description = 'Conflict'): Response => ({
    statusCode: 409,
    description,
    schema: {
      type: 'object',
      properties: {
        error: { type: 'string', example: 'Conflict' },
        message: { type: 'string' },
      },
    },
  }),
  
  unprocessableEntity: (description = 'Unprocessable entity'): Response => ({
    statusCode: 422,
    description,
    schema: {
      type: 'object',
      properties: {
        error: { type: 'string', example: 'Validation Error' },
        message: { type: 'string' },
        errors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              field: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
  }),
  
  // Server errors
  internalServerError: (description = 'Internal server error'): Response => ({
    statusCode: 500,
    description,
    schema: {
      type: 'object',
      properties: {
        error: { type: 'string', example: 'Internal Server Error' },
        message: { type: 'string' },
      },
    },
  }),
  
  // Common error set
  errors: [
    {
      statusCode: 400,
      description: 'Bad request',
      schema: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' },
        },
      },
    },
    {
      statusCode: 500,
      description: 'Internal server error',
      schema: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' },
        },
      },
    },
  ],
  
  // User list response
  userList: {
    statusCode: 200,
    description: 'List of users',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
};

/**
 * Authentication helper - adds common auth responses
 */
export function authRequired(): Response[] {
  return [
    commonResponses.unauthorized('Authentication required'),
    commonResponses.forbidden('Insufficient permissions'),
  ];
}

/**
 * Pagination helper - adds pagination parameters
 */
export function paginated(): Parameter[] {
  return [
    {
      name: 'page',
      in: 'query',
      schema: { type: 'integer', minimum: 1, default: 1 },
      description: 'Page number',
    },
    {
      name: 'limit',
      in: 'query',
      schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      description: 'Items per page',
    },
    {
      name: 'sort',
      in: 'query',
      schema: { type: 'string' },
      description: 'Sort field and order (e.g., "name:asc")',
    },
  ];
}

/**
 * Sorting helper - adds sort parameters
 */
export function sortable(fields: string[]): Parameter {
  return {
    name: 'sort',
    in: 'query',
    schema: {
      type: 'string',
      enum: fields.flatMap(field => [`${field}:asc`, `${field}:desc`]),
    },
    description: `Sort by ${fields.join(', ')}`,
  };
}

/**
 * Filterable helper - adds filter parameters
 */
export function filterable(fields: Record<string, 'string' | 'number' | 'boolean'>): Parameter[] {
  return Object.entries(fields).map(([name, type]) => ({
    name: `filter[${name}]`,
    in: 'query',
    schema: { type },
    description: `Filter by ${name}`,
  }));
}

/**
 * JSON request body helper
 */
export function jsonBody(schema: any, required = true): RequestBody {
  return {
    required,
    content: {
      'application/json': { schema },
    },
  };
}

/**
 * Form data request body helper
 */
export function formBody(properties: Record<string, any>, required = true): RequestBody {
  return {
    required,
    content: {
      'application/x-www-form-urlencoded': {
        schema: {
          type: 'object',
          properties,
        },
      },
    },
  };
}

/**
 * Multipart form data helper (for file uploads)
 */
export function multipartBody(properties: Record<string, any>, required = true): RequestBody {
  return {
    required,
    content: {
      'multipart/form-data': {
        schema: {
          type: 'object',
          properties,
        },
      },
    },
  };
}

/**
 * File upload helper
 */
export function fileUpload(fieldName = 'file', required = true): RequestBody {
  return multipartBody({
    [fieldName]: {
      type: 'string',
      format: 'binary',
    },
  }, required);
}

/**
 * Bearer token authentication parameter
 */
export function bearerAuth(): Parameter {
  return {
    name: 'Authorization',
    in: 'header',
    required: true,
    schema: { type: 'string' },
    description: 'Bearer token for authentication',
    example: 'Bearer your-token-here',
  };
}

/**
 * API key authentication parameter
 */
export function apiKeyAuth(name = 'X-API-Key'): Parameter {
  return {
    name,
    in: 'header',
    required: true,
    schema: { type: 'string' },
    description: 'API key for authentication',
  };
}

/**
 * Create a typed response with automatic schema inference
 */
export function typedResponse<T>(
  statusCode: number,
  description: string,
  example?: T,
): Response {
  return {
    statusCode,
    description,
    example,
  };
}

/**
 * Create paginated response helper
 */
export function paginatedResponse<T>(
  statusCode: number,
  description: string,
  itemSchema: any,
): Response {
  return {
    statusCode,
    description,
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: itemSchema,
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
            totalPages: { type: 'integer' },
          },
        },
      },
    },
  };
}

/**
 * Create error response with standard error format
 */
export function errorResponse(
  statusCode: number,
  errorType: string,
  description?: string,
): Response {
  return {
    statusCode,
    description: description || errorType,
    schema: {
      type: 'object',
      properties: {
        error: { type: 'string', example: errorType },
        message: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' },
        path: { type: 'string' },
      },
    },
  };
}