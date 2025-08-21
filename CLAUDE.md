# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Core Purpose

jest-swag is a library that generates OpenAPI/Swagger documentation directly from Jest API tests, inspired by Ruby's rswag. It provides a DSL for writing tests that double as API documentation, with Express and NestJS framework integration.

## Development Commands

Build the TypeScript project:
```bash
npm run build
```

Run tests with documentation generation:
```bash
npm test                 # Run tests with default and jest-swag reporter
npm run test:docs        # Run tests with only jest-swag reporter to generate docs
npm run test:coverage    # Run tests with coverage
npm run test:watch       # Run tests in watch mode
```

Linting:
```bash
npm run lint             # Check for linting errors
npm run lint:fix         # Fix linting errors
```

Generate documentation from CLI:
```bash
npx jest-swag generate   # Generate OpenAPI documentation from saved specs
npx jest-swag serve      # Serve Swagger UI
```

## Architecture Overview

### Core Components

1. **DSL Layer** (`src/matchers/index.ts`):
   - Provides Jest-compatible testing DSL (path, get, post, response, etc.)
   - Captures API specifications during test execution
   - Handles response capture and schema generation with circular reference protection
   - Key functions: path(), operation(), response(), parameter(), requestBody()

2. **Reporter** (`src/reporter/jest-reporter.ts`):
   - Custom Jest reporter that collects API specs from tests
   - Generates OpenAPI documentation after test completion
   - Only generates docs when all tests pass
   - Handles temp file cleanup after documentation generation

3. **Generator** (`src/generator/openapi-generator.ts`):
   - Converts collected API specs into OpenAPI 3.0 format
   - Handles spec merging and validation
   - Writes both JSON and YAML output files

4. **Framework Integration**:
   - **Express** (`src/middleware/express.ts`): setupSwagger() function for Swagger UI integration
   - **NestJS** (`src/middleware/nestjs.ts`): JestSwagModule for NestJS apps

5. **Utilities** (`src/utils/index.ts`):
   - Shared types and interfaces (ApiSpec, Schema, Parameter, Response)
   - API spec collection management (addApiSpec, getApiSpecs)
   - Global spec storage mechanism

### Key Design Patterns

- **Test Context Capture**: Uses Jest's describe/it blocks to capture API structure
- **Snapshot Pattern**: Captures API spec at test collection time, updates during execution
- **Response Auto-capture**: Automatically extracts and generates schemas from test responses
- **Circular Reference Prevention**: WeakSet-based tracking and depth limiting in schema generation

## TypeScript Configuration

- Target: ES2020 with CommonJS module output
- Strict mode enabled with all strict checks
- Decorators enabled for NestJS support
- Source maps and declarations generated

## Testing Strategy

- Test files: `**/*.test.ts` or `**/*.spec.ts`
- Test environment: Node.js
- Uses ts-jest for TypeScript support
- Example tests in `test/example-api.test.ts` demonstrate all DSL features

## Publishing

The package is published to npm as `@foryourdev/jest-swag`. Before publishing:
1. Build the project (`npm run build`)
2. Run all tests (`npm test`)
3. Ensure version is updated in package.json