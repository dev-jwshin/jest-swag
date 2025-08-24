/**
 * jest-swag - Generate OpenAPI/Swagger documentation from Jest API tests
 */

// Export API testing DSL
export * from './matchers';

// Export utilities and types
export * from './utils';

// Export helpers and convenience functions
export * from './helpers';

// Export TypeScript types and builders
export * from './types';

// Export generator for advanced usage
export { OpenAPIGenerator } from './generator/openapi-generator';

// Export configuration loader
export { ConfigLoader, JestSwagConfig } from './config/config-loader';

// Export plugin system
export * from './plugins';

// Export reporter for Jest configuration
export { default as JestSwagReporter } from './reporter/jest-reporter';

// Export Express middleware
export { setupSwagger, swaggerUI } from './middleware/express';

// Export NestJS module
export { JestSwagModule } from './middleware/nestjs';
