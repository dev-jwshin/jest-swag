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

  // Save the spec immediately if we have enough information
  if (specSnapshot.path && specSnapshot.method) {
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
        // 안전한 응답 추출 (supertest response 객체 등 처리)
        const safeResult = extractSafeResponse(result);

        // 실제 응답을 기반으로 스키마 생성
        const capturedSchema = generateSchemaFromResponse(safeResult);
        const capturedContent = {
          'application/json': {
            schema: capturedSchema,
            example: safeResult,
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
 * 안전한 응답 추출 (supertest response, axios response 등 처리)
 */
function extractSafeResponse(response: any): any {
  // supertest response 객체인 경우
  if (response && typeof response === 'object') {
    // body 속성이 있으면 body만 사용
    if (response.body !== undefined) {
      return response.body;
    }

    // data 속성이 있으면 data 사용 (axios response)
    if (response.data !== undefined) {
      return response.data;
    }

    // status, statusCode 등이 있으면 HTTP response 객체로 간주
    if (response.status !== undefined || response.statusCode !== undefined) {
      return {
        status: response.status || response.statusCode,
        data: response.body || response.data,
        headers: extractSafeHeaders(response.headers),
      };
    }
  }

  // 일반 객체면 그대로 반환 (하지만 순환 참조 제거)
  return removeBrowserObjects(response);
}

/**
 * 안전한 헤더 추출
 */
function extractSafeHeaders(headers: any): any {
  if (!headers || typeof headers !== 'object') return {};

  const safeHeaders: { [key: string]: any } = {};
  Object.keys(headers).forEach((key) => {
    const value = headers[key];
    if (typeof value === 'string' || typeof value === 'number') {
      safeHeaders[key] = value;
    }
  });

  return safeHeaders;
}

/**
 * 브라우저/Node.js 특정 객체들 제거
 */
function removeBrowserObjects(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  const type = typeof obj;
  if (type !== 'object') return obj;

  // 순환 참조나 브라우저 객체들 필터링
  const dangerousKeys = [
    'req',
    'request',
    'socket',
    'connection',
    'agent',
    'xhr',
    '_httpMessage',
    'res',
    'response',
    'client',
    'parser',
  ];

  if (Array.isArray(obj)) {
    return obj.map((item) => removeBrowserObjects(item));
  }

  const cleaned: { [key: string]: any } = {};
  Object.keys(obj).forEach((key) => {
    if (!dangerousKeys.includes(key) && !key.startsWith('_')) {
      try {
        const value = obj[key];
        if (value !== null && typeof value === 'object') {
          // 간단한 순환 참조 체크
          if (value === obj) return; // self reference
        }
        cleaned[key] = removeBrowserObjects(value);
      } catch (error) {
        // 접근할 수 없는 속성은 건너뛰기
      }
    }
  });

  return cleaned;
}

/**
 * 응답 데이터로부터 자동으로 스키마 생성 (순환 참조 방지)
 */
function generateSchemaFromResponse(
  data: any,
  visited = new WeakSet(),
  depth = 0,
): Schema {
  // 최대 깊이 제한 (10레벨)
  if (depth > 10) {
    return { type: 'object', description: 'Maximum depth reached' };
  }

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
    // 순환 참조 검사
    if (visited.has(data)) {
      return { type: 'array', description: 'Circular reference detected' };
    }

    visited.add(data);
    const items =
      data.length > 0
        ? generateSchemaFromResponse(data[0], visited, depth + 1)
        : {};
    visited.delete(data);

    // 예제는 첫 번째 요소만 포함 (순환 참조 방지)
    const safeExample = data.length > 0 ? [data[0]] : [];

    return {
      type: 'array',
      items,
      example: safeExample,
    };
  }

  if (type === 'object') {
    // 순환 참조 검사
    if (visited.has(data)) {
      return { type: 'object', description: 'Circular reference detected' };
    }

    visited.add(data);
    const properties: { [key: string]: Schema } = {};
    const required: string[] = [];
    const safeExample: { [key: string]: any } = {};

    // 최대 10개 속성만 처리 (너무 큰 객체 방지)
    const keys = Object.keys(data).slice(0, 10);

    keys.forEach((key) => {
      try {
        properties[key] = generateSchemaFromResponse(
          data[key],
          visited,
          depth + 1,
        );
        if (data[key] !== null && data[key] !== undefined) {
          required.push(key);
        }

        // 안전한 예제 생성 (순환 참조 객체 제외)
        if (!visited.has(data[key])) {
          safeExample[key] = data[key];
        }
      } catch (error: any) {
        // 에러가 발생한 속성은 건너뛰기

        properties[key] = { type: 'string', description: 'Processing failed' };
      }
    });

    visited.delete(data);

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
      example: safeExample,
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
