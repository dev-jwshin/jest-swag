// Example usage in NestJS project

// 1. Install jest-swag
// npm install jest-swag --save-dev

// 2. Create e2e test file (test/users.e2e-spec.ts)
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  del,
  get,
  jsonContent,
  parameter,
  path,
  post,
  put,
  requestBody,
  response,
  schemas,
  tags,
} from 'jest-swag';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Users Controller (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  path('/users', () => {
    get('Get all users', () => {
      tags('Users');

      parameter({
        name: 'page',
        in: 'query',
        description: 'Page number',
        required: false,
        schema: schemas.integer(1),
      });

      parameter({
        name: 'limit',
        in: 'query',
        description: 'Items per page',
        required: false,
        schema: schemas.integer(10),
      });

      response(200, 'List of users retrieved successfully', () => {
        return request(app.getHttpServer())
          .get('/users?page=1&limit=10')
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body).toHaveProperty('meta');
          });
      });

      response(400, 'Invalid query parameters');
    });

    post('Create a new user', () => {
      tags('Users');

      requestBody({
        description: 'User creation data',
        required: true,
        content: jsonContent(
          schemas.object(
            {
              name: schemas.string('John Doe'),
              email: schemas.string('john@example.com'),
              password: schemas.string('securepassword'),
              role: schemas.string('user'),
            },
            ['name', 'email', 'password'],
          ),
        ),
      });

      response(201, 'User created successfully', () => {
        const createUserDto = {
          name: 'John Doe',
          email: 'john@test.com',
          password: 'testpassword',
          role: 'user',
        };

        return request(app.getHttpServer())
          .post('/users')
          .send(createUserDto)
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('id');
            expect(res.body.name).toBe(createUserDto.name);
            expect(res.body.email).toBe(createUserDto.email);
            expect(res.body).not.toHaveProperty('password'); // Should not return password
          });
      });

      response(400, 'Validation failed');
      response(409, 'Email already exists');
    });
  });

  path('/users/{id}', () => {
    parameter({
      name: 'id',
      in: 'path',
      description: 'User identifier',
      required: true,
      schema: schemas.string(),
    });

    get('Get user by ID', () => {
      tags('Users');

      response(200, 'User details retrieved successfully', () => {
        // First create a user to test with
        const userId = '1'; // In real test, you might create actual user first

        return request(app.getHttpServer())
          .get(`/users/${userId}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty('name');
            expect(res.body).toHaveProperty('email');
          });
      });

      response(404, 'User not found');
    });

    put('Update user', () => {
      tags('Users');

      requestBody({
        description: 'User update data',
        required: true,
        content: jsonContent(
          schemas.object({
            name: schemas.string('Updated Name'),
            email: schemas.string('updated@example.com'),
            role: schemas.string('admin'),
          }),
        ),
      });

      response(200, 'User updated successfully', () => {
        const userId = '1';
        const updateData = {
          name: 'Updated Name',
          email: 'updated@example.com',
        };

        return request(app.getHttpServer())
          .put(`/users/${userId}`)
          .send(updateData)
          .expect(200)
          .expect((res) => {
            expect(res.body.name).toBe(updateData.name);
            expect(res.body.email).toBe(updateData.email);
          });
      });

      response(400, 'Validation failed');
      response(404, 'User not found');
      response(409, 'Email already exists');
    });

    del('Delete user', () => {
      tags('Users');

      response(204, 'User deleted successfully', () => {
        const userId = '1';

        return request(app.getHttpServer())
          .delete(`/users/${userId}`)
          .expect(204);
      });

      response(404, 'User not found');
      response(409, 'Cannot delete user with active sessions');
    });
  });
});

// 3. Configure Jest for e2e tests (test/jest-e2e.json):
/*
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  "reporters": [
    "default",
    ["jest-swag/dist/reporter.js", {
      "title": "My NestJS API Documentation",
      "version": "1.0.0",
      "description": "Comprehensive API documentation for NestJS application",
      "outputPath": "./docs/openapi.json",
      "servers": [
        { "url": "http://localhost:3000", "description": "Development server" },
        { "url": "https://api.myapp.com", "description": "Production server" }
      ]
    }]
  ]
}
*/

// 4. Update package.json scripts:
/*
{
  "scripts": {
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "test:e2e:docs": "jest --config ./test/jest-e2e.json --reporters=jest-swag/dist/reporter.js",
    "docs:serve": "jest-swag serve"
  }
}
*/

// 5. Run e2e tests with documentation generation:
// npm run test:e2e:docs

// 6. Serve the generated documentation:
// npm run docs:serve
