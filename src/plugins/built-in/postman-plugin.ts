/**
 * Postman collection export plugin
 */

import { Plugin } from '../plugin-manager';
import { OpenAPIDocument } from '../../generator/openapi-generator';
import * as fs from 'fs';
import * as path from 'path';

interface PostmanCollection {
  info: {
    name: string;
    description?: string;
    schema: string;
  };
  item: PostmanItem[];
  variable?: PostmanVariable[];
}

interface PostmanItem {
  name: string;
  request: {
    method: string;
    header: any[];
    body?: any;
    url: {
      raw: string;
      host: string[];
      path: string[];
      query?: any[];
      variable?: any[];
    };
  };
  response: any[];
}

interface PostmanVariable {
  key: string;
  value: string;
  type: string;
}

export class PostmanPlugin implements Plugin {
  name = 'postman-export';
  version = '1.0.0';
  
  private outputPath: string;
  
  constructor(options?: { outputPath?: string }) {
    this.outputPath = options?.outputPath || './docs/postman-collection.json';
  }
  
  async afterGenerate(document: OpenAPIDocument): Promise<OpenAPIDocument> {
    const collection = this.convertToPostmanCollection(document);
    
    // Write Postman collection to file
    const outputPath = path.resolve(this.outputPath);
    const outputDir = path.dirname(outputPath);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(collection, null, 2));
    console.log(`📮 Postman collection exported to ${outputPath}`);
    
    return document;
  }
  
  private convertToPostmanCollection(document: OpenAPIDocument): PostmanCollection {
    const collection: PostmanCollection = {
      info: {
        name: document.info.title,
        description: document.info.description,
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      },
      item: [],
      variable: [],
    };
    
    // Add server variables
    if (document.servers && document.servers.length > 0) {
      const server = document.servers[0];
      collection.variable!.push({
        key: 'baseUrl',
        value: server.url,
        type: 'string',
      });
    }
    
    // Convert paths to Postman items
    for (const [pathName, pathItem] of Object.entries(document.paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        if (method === 'parameters') continue; // Skip path-level parameters
        
        const item: PostmanItem = {
          name: operation.summary || `${method.toUpperCase()} ${pathName}`,
          request: {
            method: method.toUpperCase(),
            header: [],
            url: {
              raw: `{{baseUrl}}${pathName}`,
              host: ['{{baseUrl}}'],
              path: pathName.split('/').filter(Boolean),
              query: [],
              variable: [],
            },
          },
          response: [],
        };
        
        // Add parameters
        if (operation.parameters) {
          for (const param of operation.parameters) {
            if (param.in === 'query') {
              item.request.url.query!.push({
                key: param.name,
                value: param.example || '',
                description: param.description,
                disabled: !param.required,
              });
            } else if (param.in === 'header') {
              item.request.header.push({
                key: param.name,
                value: param.example || '',
                description: param.description,
              });
            } else if (param.in === 'path') {
              item.request.url.variable!.push({
                key: param.name,
                value: param.example || '',
                description: param.description,
              });
            }
          }
        }
        
        // Add request body
        if (operation.requestBody) {
          const content = operation.requestBody.content;
          if (content && content['application/json']) {
            item.request.body = {
              mode: 'raw',
              raw: JSON.stringify(
                content['application/json'].example ||
                content['application/json'].schema?.example ||
                {},
                null,
                2
              ),
              options: {
                raw: {
                  language: 'json',
                },
              },
            };
            
            item.request.header.push({
              key: 'Content-Type',
              value: 'application/json',
            });
          }
        }
        
        // Add example responses
        if (operation.responses) {
          for (const [statusCode, response] of Object.entries(operation.responses)) {
            const content = response.content;
            if (content && content['application/json']) {
              item.response.push({
                name: response.description || `${statusCode} Response`,
                originalRequest: item.request,
                status: response.description,
                code: parseInt(statusCode),
                _postman_previewlanguage: 'json',
                header: [
                  {
                    key: 'Content-Type',
                    value: 'application/json',
                  },
                ],
                body: JSON.stringify(
                  content['application/json'].example ||
                  content['application/json'].schema?.example ||
                  {},
                  null,
                  2
                ),
              });
            }
          }
        }
        
        collection.item.push(item);
      }
    }
    
    return collection;
  }
}

export default PostmanPlugin;