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
        captureResponse?: boolean; // 자동 응답 캡처 옵션
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
        captureResponse?: boolean;
      }
    | undefined;
  let testCallback: (() => void) | undefined;

  if (typeof options === 'function') {
    // Old signature: response(200, 'desc', callback)
    // 콜백이 있으면 자동으로 응답 캡처 활성화
    testCallback = options;
    responseOptions = { captureResponse: true };
  } else if (typeof options === 'object') {
    // New signature: response(200, 'desc', { content, headers }, callback)
    responseOptions = options;
    testCallback = callback;
    // 콜백이 있으면 자동으로 응답 캡처 활성화
    if (testCallback && !responseOptions.captureResponse) {
      responseOptions.captureResponse = true;
    }
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

  it(`responds with ${statusCode}`, async () => {
    // Test logic can go here
    if (testCallback) {
      const result = await testCallback();

      // 응답 캡처 기능
      if (
        responseOptions?.captureResponse &&
        result &&
        typeof result === 'object'
      ) {
        // 실제 응답을 기반으로 스키마 생성
        const capturedSchema = generateSchemaFromResponse(result);
        const capturedContent = {
          'application/json': {
            schema: capturedSchema,
            example: result,
          },
        };

        // 기존 응답 업데이트
        const updatedResponse: Response = {
          description: desc,
          content: capturedContent,
          ...(responseOptions?.headers && { headers: responseOptions.headers }),
        };

        if (!currentApiSpec.responses) {
          currentApiSpec.responses = {};
        }
        currentApiSpec.responses[responseKey] = updatedResponse;

        // 업데이트된 스펙 저장
        const updatedSpecSnapshot = {
          ...specSnapshot,
          responses: { ...currentApiSpec.responses },
        };
        addApiSpec(updatedSpecSnapshot);

        console.log(
          `📸 Captured response for ${statusCode}: ${JSON.stringify(result).substring(0, 100)}...`,
        );
      }
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
 * 응답 데이터로부터 자동으로 스키마 생성
 */
function generateSchemaFromResponse(data: any): Schema {
  if (data === null) return { type: 'null' };
  if (data === undefined) return {};

  const type = typeof data;

  if (type === 'boolean') {
    return { type: 'boolean', example: data };
  }

  if (type === 'number') {
    return {
      type: Number.isInteger(data) ? 'integer' : 'number',
      example: data,
    };
  }

  if (type === 'string') {
    return { type: 'string', example: data };
  }

  if (Array.isArray(data)) {
    const items = data.length > 0 ? generateSchemaFromResponse(data[0]) : {};
    return {
      type: 'array',
      items,
      example: data,
    };
  }

  if (type === 'object') {
    const properties: { [key: string]: Schema } = {};
    const required: string[] = [];

    Object.keys(data).forEach((key) => {
      properties[key] = generateSchemaFromResponse(data[key]);
      if (data[key] !== null && data[key] !== undefined) {
        required.push(key);
      }
    });

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
      example: data,
    };
  }

  return {};
}

/**
 * Helper to create common schemas
 */
/**
 * 실제 응답을 캡처하는 헬퍼 함수 (더 이상 필요하지 않음 - 자동으로 처리됨)
 * @deprecated 이제 response() 함수에서 콜백이 있으면 자동으로 응답을 캡처합니다
 */
export const captureResponse = () => ({ captureResponse: true });

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
