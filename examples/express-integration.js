// Complete Express.js integration example

// 1. Install the package
// npm install @foryourdev/jest-swag --save-dev

// 2. Setup Express app with Swagger UI
// app.js
const express = require('express');
const { setupSwagger } = require('@foryourdev/jest-swag');

const app = express();

// Basic middleware
app.use(express.json());

// Sample routes
app.get('/api/users', (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  res.json({
    users: [
      { id: 1, name: 'John Doe', email: 'john@example.com' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
    ],
    pagination: { page: parseInt(page), limit: parseInt(limit), total: 2 },
  });
});

app.post('/api/users', (req, res) => {
  const { name, email, age } = req.body;
  const newUser = { id: Date.now(), name, email, age };
  res.status(201).json(newUser);
});

app.get('/api/users/:id', (req, res) => {
  const { id } = req.params;
  res.json({ id, name: 'John Doe', email: 'john@example.com' });
});

app.put('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const { name, email } = req.body;
  res.json({ id, name, email, updatedAt: new Date().toISOString() });
});

app.delete('/api/users/:id', (req, res) => {
  res.status(204).send();
});

// Setup Swagger UI (only in development)
if (process.env.NODE_ENV !== 'production') {
  setupSwagger(app, {
    routePrefix: '/api-docs',
    title: 'My Express API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`📖 API docs available at http://localhost:${PORT}/api-docs`);
  }
});

module.exports = app;

// 3. Create API tests
// tests/api/users.test.js
/*
const request = require('supertest');
const {
  path,
  get,
  post,
  put,
  del,
  tags,
  parameter,
  requestBody,
  response,
  jsonContent,
  schemas
} = require('@foryourdev/jest-swag');
const app = require('../app');

describe('Users API', () => {
  path('/api/users', () => {
    get('Get all users', () => {
      tags('Users');
      
      parameter({
        name: 'page',
        in: 'query',
        description: 'Page number for pagination',
        required: false,
        schema: schemas.integer(1)
      });

      parameter({
        name: 'limit',
        in: 'query', 
        description: 'Number of users per page',
        required: false,
        schema: schemas.integer(10)
      });

      response(200, 'Successfully retrieved users', () => {
        return request(app)
          .get('/api/users?page=1&limit=10')
          .expect(200)
          .expect(res => {
            expect(res.body).toHaveProperty('users');
            expect(Array.isArray(res.body.users)).toBe(true);
            expect(res.body).toHaveProperty('pagination');
          });
      });
    });

    post('Create a new user', () => {
      tags('Users');
      
      requestBody({
        description: 'User information',
        required: true,
        content: jsonContent(
          schemas.object({
            name: schemas.string('John Doe'),
            email: schemas.string('john@example.com'),
            age: schemas.integer(30)
          }, ['name', 'email'])
        )
      });

      response(201, 'User created successfully', () => {
        const newUser = {
          name: 'Test User',
          email: 'test@example.com',
          age: 25
        };

        return request(app)
          .post('/api/users')
          .send(newUser)
          .expect(201)
          .expect(res => {
            expect(res.body).toHaveProperty('id');
            expect(res.body.name).toBe(newUser.name);
            expect(res.body.email).toBe(newUser.email);
          });
      });
    });
  });

  path('/api/users/{id}', () => {
    parameter({
      name: 'id',
      in: 'path',
      description: 'User ID',
      required: true,
      schema: schemas.string()
    });

    get('Get user by ID', () => {
      tags('Users');

      response(200, 'User found', () => {
        return request(app)
          .get('/api/users/1')
          .expect(200)
          .expect(res => {
            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty('name');
            expect(res.body).toHaveProperty('email');
          });
      });
    });
  });
});
*/

// 4. Configure Jest (jest.config.js)
/*
module.exports = {
  testEnvironment: 'node',
  reporters: [
    'default',
    ['@foryourdev/jest-swag/dist/reporter.js', {
      title: 'My Express API',
      version: '1.0.0',
      description: 'Express API documentation generated from tests',
      outputPath: './docs/openapi.json',
      servers: [
        { url: 'http://localhost:3000', description: 'Development server' },
        { url: 'https://api.mysite.com', description: 'Production server' }
      ]
    }]
  ]
};
*/

// 5. Package.json scripts
/*
{
  "scripts": {
    "start": "node app.js",
    "dev": "nodemon app.js",
    "test": "jest",
    "test:docs": "jest --reporters=@foryourdev/jest-swag/dist/reporter.js"
  }
}
*/

// 6. Usage
// npm test && npm start
// Open http://localhost:3000/api-docs
