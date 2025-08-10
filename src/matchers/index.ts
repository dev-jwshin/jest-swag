/**
 * API testing DSL for Jest
 */

import {
  addApiSpec,
  ApiSpec,
  Parameter,
  RequestBody,
  Response,
  Schema,
} from '../utils';

// Current test context
let currentApiSpec: Partial<ApiSpec> = {};

/**
 * Describes an API path
 */
export const path = (pathUrl: string, callback: () => void): void => {
  const originalSpec = { ...currentApiSpec };
  currentApiSpec.path = pathUrl;
  process.stdout.write(`🛣️  Setting path: ${pathUrl}\n`);

  describe(`Path: ${pathUrl}`, () => {
    callback();
    // Reset to original spec after path
    currentApiSpec = originalSpec;
  });
};

/**
 * Describes an HTTP method operation
 */
export const operation = (
  method: string,
  summary: string,
  callback: () => void,
): void => {
  const originalSpec = { ...currentApiSpec };
  currentApiSpec = {
    ...currentApiSpec,
    method: method.toLowerCase(),
    summary: summary,
    responses: {},
  };
  process.stdout.write(
    `🚀 Setting operation: ${method.toUpperCase()} ${summary}\n`,
  );

  describe(`${method.toUpperCase()}: ${summary}`, () => {
    callback();

    // Reset to original spec after operation
    currentApiSpec = originalSpec;
  });
};

/**
 * HTTP method shortcuts
 */
export const get = (summary: string, callback: () => void) =>
  operation('GET', summary, callback);
export const post = (summary: string, callback: () => void) =>
  operation('POST', summary, callback);
export const put = (summary: string, callback: () => void) =>
  operation('PUT', summary, callback);
export const patch = (summary: string, callback: () => void) =>
  operation('PATCH', summary, callback);
export const del = (summary: string, callback: () => void) =>
  operation('DELETE', summary, callback);

/**
 * Adds tags to the current operation
 */
export const tags = (...tagNames: string[]): void => {
  currentApiSpec.tags = tagNames;
};

/**
 * Adds description to the current operation
 */
export const description = (desc: string): void => {
  currentApiSpec.description = desc;
};

/**
 * Adds a parameter to the current operation
 */
export const parameter = (param: Parameter): void => {
  if (!currentApiSpec.parameters) {
    currentApiSpec.parameters = [];
  }
  currentApiSpec.parameters.push(param);
};

/**
 * Adds request body to the current operation
 */
export const requestBody = (body: RequestBody): void => {
  currentApiSpec.requestBody = body;
};

/**
 * Defines a response for the current operation
 */
export const response = (
  statusCode: number,
  desc: string,
  options?:
    | {
        content?: { [mediaType: string]: { schema: Schema; example?: any } };
        headers?: {
          [headerName: string]: { description?: string; schema: Schema };
        };
      }
    | (() => void),
  callback?: () => void,
): void => {
  if (!currentApiSpec.responses) {
    currentApiSpec.responses = {};
  }

  // Handle both old and new signatures
  let responseOptions:
    | {
        content?: { [mediaType: string]: { schema: Schema; example?: any } };
        headers?: {
          [headerName: string]: { description?: string; schema: Schema };
        };
      }
    | undefined;
  let testCallback: (() => void) | undefined;

  if (typeof options === 'function') {
    // Old signature: response(200, 'desc', callback)
    testCallback = options;
  } else if (typeof options === 'object') {
    // New signature: response(200, 'desc', { content, headers }, callback)
    responseOptions = options;
    testCallback = callback;
  }

  const responseObj: Response = {
    description: desc,
    ...(responseOptions?.content && { content: responseOptions.content }),
    ...(responseOptions?.headers && { headers: responseOptions.headers }),
  };

  // Handle duplicate status codes by adding suffix
  let responseKey = statusCode.toString();
  let counter = 1;

  // Check if this status code already exists
  while (currentApiSpec.responses[responseKey]) {
    responseKey = `${statusCode}-${counter}`;
    counter++;
  }

  currentApiSpec.responses[responseKey] = responseObj;

  // Capture the spec at this moment (test collection phase)
  const specSnapshot = {
    path: currentApiSpec.path,
    method: currentApiSpec.method,
    summary: currentApiSpec.summary,
    description: currentApiSpec.description,
    tags: currentApiSpec.tags,
    parameters: currentApiSpec.parameters,
    requestBody: currentApiSpec.requestBody,
    responses: { ...currentApiSpec.responses },
    security: currentApiSpec.security,
  } as ApiSpec;

  process.stdout.write(
    `📋 Adding response: ${responseKey} for ${specSnapshot.path} ${specSnapshot.method}\n`,
  );

  // Save the spec immediately if we have enough information
  if (specSnapshot.path && specSnapshot.method) {
    process.stdout.write(
      `📝 Collecting API spec: ${specSnapshot.method.toUpperCase()} ${specSnapshot.path}\n`,
    );
    addApiSpec(specSnapshot);
  }

  it(`responds with ${statusCode}`, () => {
    // Test logic can go here
    if (testCallback) {
      testCallback();
    }
  });
};

/**
 * Helper to create JSON response content
 */
export const jsonContent = (schema: Schema, example?: any) => ({
  'application/json': { schema, example },
});

/**
 * Helper to create common schemas
 */
export const schemas = {
  string: (example?: string): Schema => ({ type: 'string', example }),
  number: (example?: number): Schema => ({ type: 'number', example }),
  integer: (example?: number): Schema => ({ type: 'integer', example }),
  boolean: (example?: boolean): Schema => ({ type: 'boolean', example }),
  array: (items: Schema, example?: any[]): Schema => ({
    type: 'array',
    items,
    example,
  }),
  object: (
    properties: { [key: string]: Schema },
    required?: string[],
    example?: any,
  ): Schema => ({
    type: 'object',
    properties,
    required,
    example,
  }),
};
