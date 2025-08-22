/**
 * OpenAPI document generator
 */

import * as fs from 'fs';
import * as path from 'path';
import { ApiSpec, apiSpecs } from '../utils';

export interface OpenAPIDocument {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers?: Array<{
    url: string;
    description?: string;
  }>;
  paths: { [path: string]: PathItem };
  components?: {
    schemas?: { [schemaName: string]: any };
    securitySchemes?: { [schemeName: string]: any };
  };
  security?: Array<{ [schemeName: string]: string[] }>;
}

interface PathItem {
  [method: string]: Operation;
}

interface Operation {
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: any[];
  requestBody?: any;
  responses: { [statusCode: string]: any };
  security?: Array<{ [schemeName: string]: string[] }>;
}

export class OpenAPIGenerator {
  private config: {
    title: string;
    version: string;
    description?: string;
    servers?: Array<{ url: string; description?: string }>;
    outputPath?: string;
  };

  constructor(config: {
    title: string;
    version: string;
    description?: string;
    servers?: Array<{ url: string; description?: string }>;
    outputPath?: string;
  }) {
    this.config = {
      outputPath: './docs/openapi.json',
      ...config,
    };
  }

  // Performance: Cache generated documents
  private documentCache: { specs: ApiSpec[]; document: OpenAPIDocument } | null = null;

  /**
   * Generates OpenAPI document from collected API specs
   */
  public generateDocument(): OpenAPIDocument {
    // Performance: Return cached if specs haven't changed
    if (this.documentCache && this.areSpecsEqual(this.documentCache.specs, apiSpecs)) {
      return this.documentCache.document;
    }

    const document: OpenAPIDocument = {
      openapi: '3.0.3',
      info: {
        title: this.config.title,
        version: this.config.version,
        description: this.config.description,
      },
      paths: {},
    };

    if (this.config.servers) {
      document.servers = this.config.servers;
    }

    // Performance: Use Map for faster lookups
    const pathGroups = new Map<string, Map<string, ApiSpec>>();

    // Performance: Single pass grouping
    for (let i = 0; i < apiSpecs.length; i++) {
      const spec = apiSpecs[i];
      if (!pathGroups.has(spec.path)) {
        pathGroups.set(spec.path, new Map());
      }
      pathGroups.get(spec.path)!.set(spec.method, spec);
    }

    // Convert to OpenAPI format
    pathGroups.forEach((methods, pathName) => {
      const pathItem: PathItem = {};

      methods.forEach((spec, method) => {
        // Process responses to format duplicate status codes nicely
        const processedResponses: { [statusCode: string]: any } = {};

        if (spec.responses) {
          const responseKeys = Object.keys(spec.responses);
          for (let i = 0; i < responseKeys.length; i++) {
            const key = responseKeys[i];
            const response = spec.responses[key];
            
            // Performance: Pre-compile regex patterns
            const hasDash = key.indexOf('-') !== -1;
            const actualStatusCode = hasDash ? key.substring(0, key.indexOf('-')) : key;

            processedResponses[
              actualStatusCode +
                (hasDash ? ` (${key.substring(key.indexOf('-') + 1)})` : '')
            ] = response;
          }
        }

        const operation: Operation = {
          summary: spec.summary,
          description: spec.description,
          tags: spec.tags,
          parameters: spec.parameters,
          responses:
            Object.keys(processedResponses).length > 0
              ? processedResponses
              : { '200': { description: 'Success' } },
        };

        if (spec.requestBody) {
          operation.requestBody = spec.requestBody;
        }

        if (spec.security) {
          operation.security = spec.security;
        }

        pathItem[method] = operation;
      });

      document.paths[pathName] = pathItem;
    });

    // Cache the generated document
    this.documentCache = { specs: [...apiSpecs], document };

    return document;
  }

  // Performance: Efficient spec comparison
  private areSpecsEqual(specs1: ApiSpec[], specs2: ApiSpec[]): boolean {
    if (specs1.length !== specs2.length) return false;
    
    // Quick comparison using stringification
    // Note: This assumes specs are in the same order
    for (let i = 0; i < specs1.length; i++) {
      if (JSON.stringify(specs1[i]) !== JSON.stringify(specs2[i])) {
        return false;
      }
    }
    return true;
  }

  /**
   * Writes the OpenAPI document to file
   */
  public async writeDocument(document?: OpenAPIDocument): Promise<void> {
    const doc = document || this.generateDocument();
    const outputPath = path.resolve(this.config.outputPath!);
    const outputDir = path.dirname(outputPath);

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write JSON file
    fs.writeFileSync(outputPath, JSON.stringify(doc, null, 2));
  }

  /**
   * Generates and writes OpenAPI document
   */
  public async generate(): Promise<OpenAPIDocument> {
    const document = this.generateDocument();
    await this.writeDocument(document);
    return document;
  }
}

// Default instance for convenience
export const defaultGenerator = new OpenAPIGenerator({
  title: 'API Documentation',
  version: '1.0.0',
  description: 'Generated by jest-swag',
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
  ],
});
