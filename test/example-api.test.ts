/**
 * Example API tests demonstrating jest-swag usage
 */

import {
  del,
  description,
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
} from '../src/matchers';

// Add basic test to verify Jest is running
import { addApiSpec } from '../src/utils';

describe('Jest is working', () => {
  it('should run basic test', () => {
    console.log('🔥 Basic test is running!');

    // Manually add a test spec to see if collection works
    addApiSpec({
      path: '/test',
      method: 'get',
      summary: 'Test endpoint',
      responses: {
        '200': { description: 'Success' },
      },
    });
    console.log('🧪 Added manual API spec');

    expect(true).toBe(true);
  });
});

describe('Users API', () => {
  path('/users', () => {
    get('Get all users', () => {
      tags('Users');
      description('Retrieve a list of all users in the system');

      parameter({
        name: 'limit',
        in: 'query',
        description: 'Maximum number of users to return',
        required: false,
        schema: schemas.integer(10),
      });

      parameter({
        name: 'offset',
        in: 'query',
        description: 'Number of users to skip',
        required: false,
        schema: schemas.integer(0),
      });

      response(200, 'Successfully retrieved users', () => {
        // Actual test logic would go here
        // For example: expect(response.status).toBe(200);
      });

      response(400, 'Bad request');
      response(500, 'Internal server error');
    });

    post('Create a new user', () => {
      tags('Users');
      description('Create a new user in the system');

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
            {
              name: 'John Doe',
              email: 'john@example.com',
              age: 30,
            },
          ),
        ),
      });

      response(201, 'User created successfully', () => {
        // Test logic: expect(response.status).toBe(201);
      });

      response(400, 'Invalid user data');
      response(409, 'User already exists');
    });
  });

  path('/users/{userId}', () => {
    parameter({
      name: 'userId',
      in: 'path',
      description: 'Unique identifier of the user',
      required: true,
      schema: schemas.string('123e4567-e89b-12d3-a456-426614174000'),
    });

    get('Get user by ID', () => {
      tags('Users');
      description('Retrieve a specific user by their unique identifier');

      response(200, 'User found', () => {
        // Test: expect(response.body).toHaveProperty('id');
      });

      response(404, 'User not found');
    });

    put('Update user', () => {
      tags('Users');
      description("Update an existing user's information");

      requestBody({
        description: 'Updated user data',
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
      description('Delete a user from the system');

      response(204, 'User deleted successfully');
      response(404, 'User not found');
      response(409, 'Cannot delete user with active dependencies');
    });
  });
});

describe('Posts API', () => {
  path('/posts', () => {
    get('Get all posts', () => {
      tags('Posts');
      description('Retrieve a paginated list of blog posts');

      parameter({
        name: 'page',
        in: 'query',
        description: 'Page number',
        required: false,
        schema: schemas.integer(1),
      });

      parameter({
        name: 'category',
        in: 'query',
        description: 'Filter by category',
        required: false,
        schema: schemas.string(),
      });

      response(200, 'Posts retrieved successfully', () => {
        // Test implementation
        expect(true).toBe(true); // Placeholder
      });
    });

    post('Create a new post', () => {
      tags('Posts');
      description('Create a new blog post');

      requestBody({
        description: 'Blog post content',
        required: true,
        content: jsonContent(
          schemas.object(
            {
              title: schemas.string('My First Post'),
              content: schemas.string('This is the content of my post...'),
              categoryId: schemas.string('tech'),
              authorId: schemas.string('user-123'),
              tags: schemas.array(schemas.string(), ['javascript', 'web']),
            },
            ['title', 'content', 'authorId'],
          ),
        ),
      });

      response(201, 'Post created successfully');
      response(400, 'Invalid post data');
      response(401, 'Authentication required');
    });
  });

  path('/posts/{postId}', () => {
    parameter({
      name: 'postId',
      in: 'path',
      description: 'Post identifier',
      required: true,
      schema: schemas.string(),
    });

    get('Get post by ID', () => {
      tags('Posts');

      response(200, 'Post found', () => {
        // Actual API test would go here
        expect(true).toBe(true);
      });

      response(404, 'Post not found');
    });
  });
});
