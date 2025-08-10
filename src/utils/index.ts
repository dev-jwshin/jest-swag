/**
 * OpenAPI specification storage and utilities
 */

export interface ApiSpec {
  path: string;
  method: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses: { [statusCode: string]: Response };
  security?: SecurityRequirement[];
}

export interface Parameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  description?: string;
  required?: boolean;
  schema: Schema;
  example?: any;
}

export interface RequestBody {
  description?: string;
  required?: boolean;
  content: { [mediaType: string]: { schema: Schema; example?: any } };
}

export interface Response {
  description: string;
  content?: { [mediaType: string]: { schema: Schema; example?: any } };
  headers?: { [headerName: string]: Header };
}

export interface Header {
  description?: string;
  schema: Schema;
}

export interface Schema {
  type?: string;
  format?: string;
  properties?: { [propertyName: string]: Schema };
  items?: Schema;
  required?: string[];
  example?: any;
  enum?: any[];
  allOf?: Schema[];
  oneOf?: Schema[];
  anyOf?: Schema[];
}

export interface SecurityRequirement {
  [name: string]: string[];
}

import * as fs from 'fs';
import * as path from 'path';

// Global storage for API specs
export const apiSpecs: ApiSpec[] = [];

const SPECS_FILE = path.resolve('./.jest-swag-specs.json');

export const addApiSpec = (spec: ApiSpec): void => {
  apiSpecs.push(spec);

  // Also save to file system for cross-process access
  saveSpecsToFile();
};

export const clearApiSpecs = (): void => {
  apiSpecs.length = 0;

  // Clear file system cache
  if (fs.existsSync(SPECS_FILE)) {
    fs.unlinkSync(SPECS_FILE);
  }
};

export const saveSpecsToFile = (): void => {
  try {
    fs.writeFileSync(SPECS_FILE, JSON.stringify(apiSpecs, null, 2));
  } catch (error) {
    console.warn('Failed to save API specs to file:', error);
  }
};

export const loadSpecsFromFile = (): ApiSpec[] => {
  try {
    if (fs.existsSync(SPECS_FILE)) {
      const data = fs.readFileSync(SPECS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.warn('Failed to load API specs from file:', error);
  }
  return [];
};
