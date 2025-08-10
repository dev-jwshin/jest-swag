# jest-swag

Generate OpenAPI/Swagger documentation directly from your Jest API tests! Inspired by [rswag](https://github.com/rswag/rswag), jest-swag brings the same powerful concept to the JavaScript/TypeScript ecosystem.

## 🚀 Features

- **API-First Testing**: Write Jest tests that double as API documentation
- **OpenAPI 3.0 Support**: Generate standards-compliant OpenAPI specifications
- **Automatic Documentation**: Documentation stays in sync with your tests
- **Swagger UI Integration**: Interactive API documentation out of the box
- **TypeScript Support**: Fully typed for better developer experience
- **Zero Configuration**: Works with minimal setup

## 📦 Installation

```bash
npm install jest-swag --save-dev
```

## 🚀 Framework Integration

### Express.js Project

1. **Install jest-swag in your Express project:**

```bash
cd your-express-project
npm install jest-swag --save-dev
```

2. **Create API tests:**

```typescript
// tests/api/users.test.ts
import {
  path,
  get,
  post,
  tags,
  parameter,
  requestBody,
  response,
  jsonContent,
  schemas,
} from 'jest-swag';

describe('Users API', () => {
  path('/api/users', () => {
    get('Get all users', () => {
      tags('Users');

      parameter({
        name: 'page',
        in: 'query',
        description: 'Page number',
        required: false,
        schema: schemas.integer(1),
      });

      response(200, 'Users retrieved successfully', () => {
        // Your actual Express route test
        // expect(await request(app).get('/api/users')).toBe(200);
      });
    });
  });
});
```

3. **Update package.json:**

```json
{
  "scripts": {
    "test": "jest",
    "test:docs": "jest --reporters=jest-swag/dist/reporter.js",
    "docs:serve": "jest-swag serve"
  }
}
```

### NestJS Project

1. **Install jest-swag:**

```bash
cd your-nestjs-project
npm install jest-swag --save-dev
```

2. **Create NestJS API tests:**

```typescript
// test/users.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import {
  path,
  get,
  post,
  tags,
  parameter,
  requestBody,
  response,
  jsonContent,
  schemas,
} from 'jest-swag';

describe('Users (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  path('/users', () => {
    get('Get all users', () => {
      tags('Users');

      response(200, 'Success', () => {
        return request(app.getHttpServer()).get('/users').expect(200);
      });
    });

    post('Create user', () => {
      tags('Users');

      requestBody({
        required: true,
        content: jsonContent(
          schemas.object(
            {
              name: schemas.string('John Doe'),
              email: schemas.string('john@example.com'),
            },
            ['name', 'email'],
          ),
        ),
      });

      response(201, 'User created', () => {
        return request(app.getHttpServer())
          .post('/users')
          .send({ name: 'John', email: 'john@test.com' })
          .expect(201);
      });
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
```

3. **Configure Jest:**

```javascript
// jest.config.js
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'test',
  testEnvironment: 'node',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  reporters: [
    'default',
    [
      'jest-swag/dist/reporter.js',
      {
        title: 'My NestJS API',
        version: '1.0.0',
        outputPath: './docs/openapi.json',
        servers: [
          { url: 'http://localhost:3000', description: 'Development server' },
        ],
      },
    ],
  ],
};
```

## 🎯 Quick Start

### 1. Write API tests using jest-swag DSL

```typescript
// tests/api/users.test.ts
import {
  path,
  get,
  post,
  tags,
  parameter,
  requestBody,
  response,
  jsonContent,
  schemas,
} from 'jest-swag';

describe('Users API', () => {
  path('/users', () => {
    get('Get all users', () => {
      tags('Users');

      parameter({
        name: 'limit',
        in: 'query',
        description: 'Maximum number of users to return',
        required: false,
        schema: schemas.integer(10),
      });

      response(200, 'Successfully retrieved users', () => {
        // Your actual test logic here
        // expect(response.status).toBe(200);
      });

      response(400, 'Bad request');
    });

    post('Create user', () => {
      tags('Users');

      requestBody({
        description: 'User data',
        required: true,
        content: jsonContent(
          schemas.object(
            {
              name: schemas.string('John Doe'),
              email: schemas.string('john@example.com'),
              age: schemas.integer(30),
            },
            ['name', 'email'],
          ),
        ),
      });

      response(201, 'User created successfully', () => {
        // Your test logic
      });
    });
  });
});
```

### 2. Configure Jest Reporter

Add jest-swag reporter to your Jest configuration:

```javascript
// jest.config.js
module.exports = {
  // ... other Jest configuration
  reporters: [
    'default',
    [
      'jest-swag/dist/reporter.js',
      {
        title: 'My API Documentation',
        version: '1.0.0',
        description: 'Generated API documentation',
        outputPath: './docs/openapi.json',
        servers: [
          { url: 'http://localhost:3000', description: 'Development server' },
          { url: 'https://api.example.com', description: 'Production server' },
        ],
      },
    ],
  ],
};
```

### 3. Run tests to generate documentation

```bash
# Generate documentation while running tests
npm test

# Or run tests specifically for documentation
npm run test:docs

# Serve the generated documentation
npx jest-swag serve
```

### 4. View generated documentation

After running tests, you'll find:

- `docs/openapi.json` - OpenAPI specification
- `docs/openapi.yaml` - YAML version
- `docs/index.html` - Interactive Swagger UI

Open `http://localhost:3001` to view your API documentation in Swagger UI!

## 📚 API Reference

### Path Operations

```typescript
import { path, get, post, put, patch, del } from 'jest-swag';

path('/users', () => {
  get('Get users', () => {
    /* ... */
  });
  post('Create user', () => {
    /* ... */
  });
  put('Update user', () => {
    /* ... */
  });
  patch('Patch user', () => {
    /* ... */
  });
  del('Delete user', () => {
    /* ... */
  });
});
```

### Parameters

```typescript
import { parameter, schemas } from 'jest-swag';

parameter({
  name: 'userId',
  in: 'path',
  description: 'User ID',
  required: true,
  schema: schemas.string(),
});

parameter({
  name: 'limit',
  in: 'query',
  schema: schemas.integer(10),
});
```

### Request Bodies

```typescript
import { requestBody, jsonContent, schemas } from 'jest-swag';

requestBody({
  description: 'User data',
  required: true,
  content: jsonContent(
    schemas.object(
      {
        name: schemas.string(),
        email: schemas.string(),
      },
      ['name', 'email'],
    ),
  ),
});
```

### Response Definitions

```typescript
import { response } from 'jest-swag';

response(200, 'Success', () => {
  // Your test assertions here
  expect(result.status).toBe(200);
});

response(404, 'Not found');
response(500, 'Internal server error');
```

### Schema Helpers

```typescript
import { schemas } from 'jest-swag';

// Basic types
schemas.string('example');
schemas.number(42);
schemas.integer(10);
schemas.boolean(true);

// Complex types
schemas.array(schemas.string(), ['item1', 'item2']);
schemas.object(
  {
    id: schemas.string(),
    name: schemas.string(),
  },
  ['id'],
  { id: '123', name: 'John' },
);
```

## ⚙️ Configuration

### Jest Configuration

Add to your `jest.config.js`:

```javascript
module.exports = {
  // ... other config
  reporters: [
    'default',
    [
      'jest-swag/dist/reporter.js',
      {
        title: 'My API Documentation',
        version: '1.0.0',
        description: 'Generated API documentation',
        outputPath: './api-docs/openapi.json',
        servers: [
          { url: 'http://localhost:3000', description: 'Development server' },
          { url: 'https://api.example.com', description: 'Production server' },
        ],
      },
    ],
  ],
};
```

### CLI Usage

```bash
# Generate documentation from saved specs
npx jest-swag generate --title "My API" --version "2.0.0" --output ./docs/api.json

# Serve documentation
npx jest-swag serve --port 3001 --docs ./docs

# Generate with config file
npx jest-swag generate --config ./jest-swag.config.json
```

## 📄 Configuration File

Create `jest-swag.config.json`:

```json
{
  "title": "My API Documentation",
  "version": "1.0.0",
  "description": "Comprehensive API documentation",
  "outputPath": "./docs/openapi.json",
  "servers": [
    {
      "url": "http://localhost:3000",
      "description": "Development server"
    },
    {
      "url": "https://api.example.com",
      "description": "Production server"
    }
  ]
}
```

## 🛠️ Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "test": "jest --reporters=default --reporters=jest-swag/dist/reporter.js",
    "test:docs": "jest --reporters=jest-swag/dist/reporter.js",
    "docs:generate": "jest-swag generate",
    "docs:serve": "jest-swag serve"
  }
}
```

## 🤝 Comparison with rswag

| Feature           | jest-swag             | rswag       |
| ----------------- | --------------------- | ----------- |
| Language          | JavaScript/TypeScript | Ruby        |
| Test Framework    | Jest                  | RSpec       |
| API Specification | OpenAPI 3.0           | OpenAPI 3.0 |
| Documentation UI  | Swagger UI            | Swagger UI  |
| Auto-generation   | ✅                    | ✅          |
| Type Safety       | ✅ (TypeScript)       | ✅ (Ruby)   |

## 💡 Examples

Check out the `test/example-api.test.ts` file for comprehensive examples of:

- User management API
- Blog posts API
- Complex request/response schemas
- Parameter validation
- Error handling

---

**jest-swag** - Because your API tests deserve some swag! 😎
