// Example usage in Express.js project

// 1. Install jest-swag
// npm install jest-swag --save-dev

// 2. Create API test file (tests/api/users.test.js)
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
import request from 'supertest';
import app from '../app'; // Your Express app

describe('Users API', () => {
  path('/api/users', () => {
    get('Get all users', () => {
      tags('Users');

      parameter({
        name: 'page',
        in: 'query',
        description: 'Page number for pagination',
        required: false,
        schema: schemas.integer(1),
      });

      parameter({
        name: 'limit',
        in: 'query',
        description: 'Number of users per page',
        required: false,
        schema: schemas.integer(10),
      });

      response(200, 'Successfully retrieved users', () => {
        // Actual test implementation
        return request(app)
          .get('/api/users?page=1&limit=10')
          .expect(200)
          .then((response) => {
            expect(response.body).toHaveProperty('users');
            expect(Array.isArray(response.body.users)).toBe(true);
          });
      });

      response(400, 'Invalid query parameters');
      response(500, 'Internal server error');
    });

    post('Create a new user', () => {
      tags('Users');

      requestBody({
        description: 'User information',
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
        const newUser = {
          name: 'John Doe',
          email: 'john@example.com',
          age: 30,
        };

        return request(app)
          .post('/api/users')
          .send(newUser)
          .expect(201)
          .then((response) => {
            expect(response.body).toHaveProperty('id');
            expect(response.body.name).toBe(newUser.name);
            expect(response.body.email).toBe(newUser.email);
          });
      });

      response(400, 'Invalid user data');
      response(409, 'User with this email already exists');
    });
  });

  path('/api/users/{id}', () => {
    parameter({
      name: 'id',
      in: 'path',
      description: 'User ID',
      required: true,
      schema: schemas.string(),
    });

    get('Get user by ID', () => {
      tags('Users');

      response(200, 'User found', () => {
        const userId = '12345';

        return request(app)
          .get(`/api/users/${userId}`)
          .expect(200)
          .then((response) => {
            expect(response.body).toHaveProperty('id', userId);
          });
      });

      response(404, 'User not found');
    });

    put('Update user', () => {
      tags('Users');

      requestBody({
        description: 'Updated user information',
        required: true,
        content: jsonContent(
          schemas.object({
            name: schemas.string(),
            email: schemas.string(),
            age: schemas.integer(),
          }),
        ),
      });

      response(200, 'User updated successfully');
      response(400, 'Invalid user data');
      response(404, 'User not found');
    });

    del('Delete user', () => {
      tags('Users');

      response(204, 'User deleted successfully');
      response(404, 'User not found');
    });
  });
});

// 3. Update package.json scripts:
/*
{
  "scripts": {
    "test": "jest",
    "test:docs": "jest --reporters=jest-swag/dist/reporter.js",
    "docs:serve": "jest-swag serve"
  }
}
*/

// 4. Configure Jest (jest.config.js):
/*
module.exports = {
  testEnvironment: 'node',
  reporters: [
    'default',
    ['jest-swag/dist/reporter.js', {
      title: 'My Express API',
      version: '1.0.0',
      description: 'Express API documentation',
      outputPath: './docs/openapi.json',
      servers: [
        { url: 'http://localhost:3000', description: 'Development server' },
        { url: 'https://api.mysite.com', description: 'Production server' }
      ]
    }]
  ]
};
*/

// 5. Run tests to generate documentation:
// npm run test:docs

// 6. Serve documentation:
// npx jest-swag serve
