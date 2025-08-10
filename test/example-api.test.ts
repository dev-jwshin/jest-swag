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

      response(
        200,
        'Successfully retrieved users',
        {
          content: jsonContent(
            schemas.array(
              schemas.object(
                {
                  id: schemas.string('123e4567-e89b-12d3-a456-426614174000'),
                  name: schemas.string('John Doe'),
                  email: schemas.string('john@example.com'),
                  age: schemas.integer(30),
                  createdAt: schemas.string('2024-01-01T00:00:00Z'),
                  active: schemas.boolean(true),
                },
                ['id', 'name', 'email'],
                {
                  id: '123e4567-e89b-12d3-a456-426614174000',
                  name: 'John Doe',
                  email: 'john@example.com',
                  age: 30,
                  createdAt: '2024-01-01T00:00:00Z',
                  active: true,
                },
              ),
            ),
            [
              {
                id: '123e4567-e89b-12d3-a456-426614174000',
                name: 'John Doe',
                email: 'john@example.com',
                age: 30,
                createdAt: '2024-01-01T00:00:00Z',
                active: true,
              },
              {
                id: '456e7890-f12b-34c5-d678-901234567890',
                name: 'Jane Smith',
                email: 'jane@example.com',
                age: 25,
                createdAt: '2024-01-02T10:30:00Z',
                active: true,
              },
            ],
          ),
        },
        () => {
          // Actual test logic would go here
          // For example: expect(response.status).toBe(200);
        },
      );

      response(200, 'Users with pagination info', {
        content: jsonContent(
          schemas.object(
            {
              users: schemas.array(
                schemas.object({
                  id: schemas.string('user-123'),
                  name: schemas.string('Alice'),
                  email: schemas.string('alice@example.com'),
                }),
              ),
              pagination: schemas.object({
                total: schemas.integer(100),
                page: schemas.integer(1),
                limit: schemas.integer(10),
              }),
            },
            ['users', 'pagination'],
            {
              users: [
                { id: 'user-123', name: 'Alice', email: 'alice@example.com' },
              ],
              pagination: { total: 100, page: 1, limit: 10 },
            },
          ),
        ),
      });

      response(200, 'Empty user list when no users exist', {
        content: jsonContent(
          schemas.object(
            {
              users: schemas.array(schemas.object({}), []),
              pagination: schemas.object({
                total: schemas.integer(0),
                page: schemas.integer(1),
                limit: schemas.integer(10),
              }),
            },
            ['users', 'pagination'],
            {
              users: [],
              pagination: { total: 0, page: 1, limit: 10 },
            },
          ),
        ),
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

      response(
        201,
        'User created successfully',
        {
          content: jsonContent(
            schemas.object(
              {
                id: schemas.string('123e4567-e89b-12d3-a456-426614174000'),
                name: schemas.string('John Doe'),
                email: schemas.string('john@example.com'),
                age: schemas.integer(30),
                createdAt: schemas.string('2024-01-01T00:00:00Z'),
                active: schemas.boolean(true),
              },
              ['id', 'name', 'email'],
              {
                id: '123e4567-e89b-12d3-a456-426614174000',
                name: 'John Doe',
                email: 'john@example.com',
                age: 30,
                createdAt: '2024-01-01T00:00:00Z',
                active: true,
              },
            ),
          ),
        },
        () => {
          // Test logic: expect(response.status).toBe(201);
        },
      );

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

      response(
        200,
        'User found',
        {
          content: jsonContent(
            schemas.object(
              {
                id: schemas.string('123e4567-e89b-12d3-a456-426614174000'),
                name: schemas.string('John Doe'),
                email: schemas.string('john@example.com'),
                age: schemas.integer(30),
                createdAt: schemas.string('2024-01-01T00:00:00Z'),
                active: schemas.boolean(true),
              },
              ['id', 'name', 'email'],
              {
                id: '123e4567-e89b-12d3-a456-426614174000',
                name: 'John Doe',
                email: 'john@example.com',
                age: 30,
                createdAt: '2024-01-01T00:00:00Z',
                active: true,
              },
            ),
          ),
        },
        () => {
          // Test: expect(response.body).toHaveProperty('id');
        },
      );

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

      response(200, 'User updated successfully', {
        content: jsonContent(
          schemas.object(
            {
              id: schemas.string('123e4567-e89b-12d3-a456-426614174000'),
              name: schemas.string('John Doe Updated'),
              email: schemas.string('john.updated@example.com'),
              age: schemas.integer(31),
              updatedAt: schemas.string('2024-01-15T14:30:00Z'),
            },
            ['id', 'name', 'email'],
            {
              id: '123e4567-e89b-12d3-a456-426614174000',
              name: 'John Doe Updated',
              email: 'john.updated@example.com',
              age: 31,
              updatedAt: '2024-01-15T14:30:00Z',
            },
          ),
        ),
      });
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

      response(
        200,
        'Posts retrieved successfully',
        {
          content: jsonContent(
            schemas.object(
              {
                posts: schemas.array(
                  schemas.object({
                    id: schemas.string('post-123'),
                    title: schemas.string('My First Post'),
                    content: schemas.string('This is the content...'),
                    authorId: schemas.string('user-123'),
                    categoryId: schemas.string('tech'),
                    tags: schemas.array(schemas.string(), [
                      'javascript',
                      'web',
                    ]),
                    createdAt: schemas.string('2024-01-01T12:00:00Z'),
                  }),
                  [
                    {
                      id: 'post-123',
                      title: 'My First Post',
                      content: 'This is the content of my first post...',
                      authorId: 'user-123',
                      categoryId: 'tech',
                      tags: ['javascript', 'web'],
                      createdAt: '2024-01-01T12:00:00Z',
                    },
                  ],
                ),
                pagination: schemas.object({
                  page: schemas.integer(1),
                  totalPages: schemas.integer(5),
                  totalItems: schemas.integer(42),
                  hasNext: schemas.boolean(true),
                }),
              },
              ['posts', 'pagination'],
              {
                posts: [
                  {
                    id: 'post-123',
                    title: 'My First Post',
                    content: 'This is the content of my first post...',
                    authorId: 'user-123',
                    categoryId: 'tech',
                    tags: ['javascript', 'web'],
                    createdAt: '2024-01-01T12:00:00Z',
                  },
                ],
                pagination: {
                  page: 1,
                  totalPages: 5,
                  totalItems: 42,
                  hasNext: true,
                },
              },
            ),
          ),
        },
        () => {
          // Test implementation
          expect(true).toBe(true); // Placeholder
        },
      );
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

      response(201, 'Post created successfully', {
        content: jsonContent(
          schemas.object(
            {
              id: schemas.string('post-456'),
              title: schemas.string('My Second Post'),
              content: schemas.string('This is the content of my post...'),
              categoryId: schemas.string('tech'),
              authorId: schemas.string('user-123'),
              tags: schemas.array(schemas.string(), ['javascript', 'web']),
              createdAt: schemas.string('2024-01-15T10:00:00Z'),
              status: schemas.string('published'),
            },
            ['id', 'title', 'content', 'authorId'],
            {
              id: 'post-456',
              title: 'My Second Post',
              content: 'This is the content of my post...',
              categoryId: 'tech',
              authorId: 'user-123',
              tags: ['javascript', 'web'],
              createdAt: '2024-01-15T10:00:00Z',
              status: 'published',
            },
          ),
        ),
      });
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

      response(
        200,
        'Post found',
        {
          content: jsonContent(
            schemas.object(
              {
                id: schemas.string('post-789'),
                title: schemas.string('Amazing Blog Post'),
                content: schemas.string(
                  'This is the full content of the blog post...',
                ),
                categoryId: schemas.string('tech'),
                authorId: schemas.string('user-456'),
                tags: schemas.array(schemas.string(), ['typescript', 'api']),
                createdAt: schemas.string('2024-01-10T15:30:00Z'),
                updatedAt: schemas.string('2024-01-12T09:15:00Z'),
                status: schemas.string('published'),
                viewCount: schemas.integer(1250),
              },
              ['id', 'title', 'content', 'authorId'],
              {
                id: 'post-789',
                title: 'Amazing Blog Post',
                content: 'This is the full content of the blog post...',
                categoryId: 'tech',
                authorId: 'user-456',
                tags: ['typescript', 'api'],
                createdAt: '2024-01-10T15:30:00Z',
                updatedAt: '2024-01-12T09:15:00Z',
                status: 'published',
                viewCount: 1250,
              },
            ),
          ),
        },
        () => {
          // Actual API test would go here
          expect(true).toBe(true);
        },
      );

      response(404, 'Post not found');
    });
  });
});
