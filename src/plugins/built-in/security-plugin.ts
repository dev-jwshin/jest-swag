/**
 * Security validation and enhancement plugin
 */

import { Plugin } from '../plugin-manager';
import { OpenAPIDocument } from '../../generator/openapi-generator';
import { ApiSpec } from '../../utils';

interface SecurityOptions {
  requireAuth?: boolean;
  defaultScheme?: 'bearer' | 'apiKey' | 'oauth2';
  validateResponses?: boolean;
  redactSensitiveData?: boolean;
  sensitiveFields?: string[];
}

export class SecurityPlugin implements Plugin {
  name = 'security-validation';
  version = '1.0.0';
  
  private options: SecurityOptions;
  private defaultSensitiveFields = [
    'password',
    'secret',
    'token',
    'apiKey',
    'authorization',
    'creditCard',
    'ssn',
    'privateKey',
  ];
  
  constructor(options: SecurityOptions = {}) {
    this.options = {
      requireAuth: false,
      defaultScheme: 'bearer',
      validateResponses: true,
      redactSensitiveData: true,
      sensitiveFields: this.defaultSensitiveFields,
      ...options,
    };
  }
  
  async beforeGenerate(specs: ApiSpec[]): Promise<ApiSpec[]> {
    return specs.map(spec => this.enhanceSpecSecurity(spec));
  }
  
  async afterGenerate(document: OpenAPIDocument): Promise<OpenAPIDocument> {
    // Add security schemes if not present
    if (!document.components) {
      document.components = {};
    }
    
    if (!document.components.securitySchemes) {
      document.components.securitySchemes = this.getDefaultSecuritySchemes();
    }
    
    // Add global security if required
    if (this.options.requireAuth && !document.security) {
      document.security = this.getDefaultSecurity();
    }
    
    // Validate and enhance paths
    for (const [pathName, pathItem] of Object.entries(document.paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        if (typeof operation === 'object' && operation !== null) {
          this.enhanceOperationSecurity(operation as any, pathName, method);
        }
      }
    }
    
    return document;
  }
  
  validate(document: OpenAPIDocument): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];
    
    // Check for security on sensitive operations
    const sensitiveOperations = ['post', 'put', 'patch', 'delete'];
    
    for (const [pathName, pathItem] of Object.entries(document.paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        if (sensitiveOperations.includes(method.toLowerCase())) {
          const op = operation as any;
          
          // Check if operation has security defined
          if (!op.security && !document.security) {
            errors.push(
              `${method.toUpperCase()} ${pathName} should have security defined`
            );
          }
          
          // Check for sensitive data in examples
          if (this.options.validateResponses) {
            this.validateOperationExamples(op, pathName, method, errors);
          }
        }
      }
    }
    
    // Check for common security headers
    for (const [pathName, pathItem] of Object.entries(document.paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        if (typeof operation === 'object' && operation !== null) {
          const op = operation as any;
          
          // Check for security headers in responses
          if (op.responses) {
            for (const [statusCode, response] of Object.entries(op.responses)) {
              if (statusCode.startsWith('2')) {
                const res = response as any;
                if (!res.headers || !this.hasSecurityHeaders(res.headers)) {
                  errors.push(
                    `${method.toUpperCase()} ${pathName} (${statusCode}) should include security headers`
                  );
                }
              }
            }
          }
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
  
  private enhanceSpecSecurity(spec: ApiSpec): ApiSpec {
    // Add security requirement if needed
    if (this.options.requireAuth && !spec.security) {
      spec.security = this.getDefaultSecurity();
    }
    
    // Redact sensitive data from examples
    if (this.options.redactSensitiveData) {
      if (spec.requestBody?.content) {
        for (const content of Object.values(spec.requestBody.content)) {
          if (content.example) {
            content.example = this.redactSensitiveData(content.example);
          }
        }
      }
      
      if (spec.responses) {
        for (const response of Object.values(spec.responses)) {
          if (response.content) {
            for (const content of Object.values(response.content)) {
              if (content.example) {
                content.example = this.redactSensitiveData(content.example);
              }
            }
          }
        }
      }
    }
    
    return spec;
  }
  
  private enhanceOperationSecurity(
    operation: any,
    pathName: string,
    method: string
  ): void {
    // Add security headers to successful responses
    if (operation.responses) {
      for (const [statusCode, response] of Object.entries(operation.responses)) {
        if (statusCode.startsWith('2')) {
          const res = response as any;
          if (!res.headers) {
            res.headers = {};
          }
          
          // Add common security headers
          res.headers['X-Content-Type-Options'] = {
            description: 'Prevents MIME type sniffing',
            schema: { type: 'string', example: 'nosniff' },
          };
          
          res.headers['X-Frame-Options'] = {
            description: 'Prevents clickjacking attacks',
            schema: { type: 'string', example: 'DENY' },
          };
          
          res.headers['X-XSS-Protection'] = {
            description: 'Enables XSS protection',
            schema: { type: 'string', example: '1; mode=block' },
          };
          
          res.headers['Strict-Transport-Security'] = {
            description: 'Enforces HTTPS',
            schema: { type: 'string', example: 'max-age=31536000; includeSubDomains' },
          };
        }
      }
    }
    
    // Add rate limiting headers
    if (!operation.responses?.['429']) {
      if (!operation.responses) {
        operation.responses = {};
      }
      
      operation.responses['429'] = {
        description: 'Too Many Requests',
        headers: {
          'X-RateLimit-Limit': {
            description: 'Request limit per hour',
            schema: { type: 'integer', example: 100 },
          },
          'X-RateLimit-Remaining': {
            description: 'Remaining requests',
            schema: { type: 'integer', example: 0 },
          },
          'X-RateLimit-Reset': {
            description: 'Time when limit resets',
            schema: { type: 'integer', example: 1640995200 },
          },
        },
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: { type: 'string', example: 'Rate limit exceeded' },
                message: { type: 'string' },
                retryAfter: { type: 'integer' },
              },
            },
          },
        },
      };
    }
  }
  
  private getDefaultSecuritySchemes(): any {
    return {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT Bearer token authentication',
      },
      apiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API Key authentication',
      },
      oauth2: {
        type: 'oauth2',
        flows: {
          authorizationCode: {
            authorizationUrl: 'https://example.com/oauth/authorize',
            tokenUrl: 'https://example.com/oauth/token',
            scopes: {
              read: 'Read access',
              write: 'Write access',
              admin: 'Admin access',
            },
          },
        },
      },
    };
  }
  
  private getDefaultSecurity(): any[] {
    switch (this.options.defaultScheme) {
      case 'bearer':
        return [{ bearerAuth: [] }];
      case 'apiKey':
        return [{ apiKey: [] }];
      case 'oauth2':
        return [{ oauth2: ['read'] }];
      default:
        return [{ bearerAuth: [] }];
    }
  }
  
  private hasSecurityHeaders(headers: any): boolean {
    const requiredHeaders = [
      'X-Content-Type-Options',
      'X-Frame-Options',
      'Strict-Transport-Security',
    ];
    
    return requiredHeaders.some(header => headers[header]);
  }
  
  private validateOperationExamples(
    operation: any,
    pathName: string,
    method: string,
    errors: string[]
  ): void {
    // Check request body examples
    if (operation.requestBody?.content) {
      for (const [mediaType, content] of Object.entries(operation.requestBody.content)) {
        const c = content as any;
        if (c.example) {
          const sensitiveFields = this.findSensitiveFields(c.example);
          if (sensitiveFields.length > 0) {
            errors.push(
              `${method.toUpperCase()} ${pathName} request example contains sensitive fields: ${sensitiveFields.join(', ')}`
            );
          }
        }
      }
    }
    
    // Check response examples
    if (operation.responses) {
      for (const [statusCode, response] of Object.entries(operation.responses)) {
        const res = response as any;
        if (res.content) {
          for (const [mediaType, content] of Object.entries(res.content)) {
            const c = content as any;
            if (c.example) {
              const sensitiveFields = this.findSensitiveFields(c.example);
              if (sensitiveFields.length > 0 && !statusCode.startsWith('4')) {
                errors.push(
                  `${method.toUpperCase()} ${pathName} response (${statusCode}) example contains sensitive fields: ${sensitiveFields.join(', ')}`
                );
              }
            }
          }
        }
      }
    }
  }
  
  private findSensitiveFields(obj: any, path = ''): string[] {
    const found: string[] = [];
    
    if (obj === null || typeof obj !== 'object') {
      return found;
    }
    
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      // Check if key name suggests sensitive data
      const lowerKey = key.toLowerCase();
      if (this.options.sensitiveFields?.some(field => lowerKey.includes(field.toLowerCase()))) {
        found.push(currentPath);
      }
      
      // Recursively check nested objects
      if (typeof value === 'object' && value !== null) {
        found.push(...this.findSensitiveFields(value, currentPath));
      }
    }
    
    return found;
  }
  
  private redactSensitiveData(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    const cloned = Array.isArray(obj) ? [...obj] : { ...obj };
    
    for (const [key, value] of Object.entries(cloned)) {
      const lowerKey = key.toLowerCase();
      
      // Check if key should be redacted
      if (this.options.sensitiveFields?.some(field => lowerKey.includes(field.toLowerCase()))) {
        cloned[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        // Recursively redact nested objects
        cloned[key] = this.redactSensitiveData(value);
      }
    }
    
    return cloned;
  }
}

export default SecurityPlugin;