// Complete NestJS integration example

// 1. Install the package
// npm install @foryourdev/jest-swag --save-dev

// 2. Setup NestJS module
// app.module.ts
import { JestSwagModule } from '@foryourdev/jest-swag';
import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    // Only add JestSwag in development
    ...(process.env.NODE_ENV !== 'production'
      ? [
          JestSwagModule.forRoot({
            path: 'api-docs',
            title: 'My NestJS API Documentation',
            swaggerOptions: {
              persistAuthorization: true,
              displayRequestDuration: true,
            },
          }),
        ]
      : []),
    UsersModule,
  ],
})
export class AppModule {}

// 3. Sample controller
// users/users.controller.ts
import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Put,
    Query,
} from '@nestjs/common';

export class CreateUserDto {
  name: string;
  email: string;
  age?: number;
}

export class UpdateUserDto {
  name?: string;
  email?: string;
  age?: number;
}

@Controller('users')
export class UsersController {
  private users = [
    { id: '1', name: 'John Doe', email: 'john@example.com', age: 30 },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', age: 25 },
  ];

  @Get()
  getUsers(@Query('page') page?: number, @Query('limit') limit?: number) {
    const pageNum = page || 1;
    const limitNum = limit || 10;

    return {
      data: this.users,
      meta: {
        page: pageNum,
        limit: limitNum,
        total: this.users.length,
      },
    };
  }

  @Post()
  createUser(@Body() createUserDto: CreateUserDto) {
    const newUser = {
      id: String(Date.now()),
      ...createUserDto,
    };
    this.users.push(newUser);
    return newUser;
  }

  @Get(':id')
  getUser(@Param('id') id: string) {
    return this.users.find((user) => user.id === id);
  }

  @Put(':id')
  updateUser(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    const userIndex = this.users.findIndex((user) => user.id === id);
    if (userIndex >= 0) {
      this.users[userIndex] = { ...this.users[userIndex], ...updateUserDto };
      return this.users[userIndex];
    }
    return null;
  }

  @Delete(':id')
  deleteUser(@Param('id') id: string) {
    const userIndex = this.users.findIndex((user) => user.id === id);
    if (userIndex >= 0) {
      this.users.splice(userIndex, 1);
    }
    return { deleted: true };
  }
}

// 4. Create e2e tests
// test/users.e2e-spec.ts
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
} from '@foryourdev/jest-swag';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Users (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
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
            expect(res.body).toHaveProperty('data');
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body).toHaveProperty('meta');
            expect(res.body.meta).toHaveProperty('page');
            expect(res.body.meta).toHaveProperty('limit');
          });
      });
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
              age: schemas.integer(30),
            },
            ['name', 'email'],
          ),
        ),
      });

      response(201, 'User created successfully', () => {
        const createUserDto = {
          name: 'Test User',
          email: 'test@example.com',
          age: 28,
        };

        return request(app.getHttpServer())
          .post('/users')
          .send(createUserDto)
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('id');
            expect(res.body.name).toBe(createUserDto.name);
            expect(res.body.email).toBe(createUserDto.email);
            expect(res.body.age).toBe(createUserDto.age);
          });
      });

      response(400, 'Validation failed');
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
        const userId = '1';

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
            age: schemas.integer(35),
          }),
        ),
      });

      response(200, 'User updated successfully', () => {
        const userId = '1';
        const updateData = {
          name: 'Updated User',
          email: 'updated@test.com',
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

      response(404, 'User not found');
    });

    del('Delete user', () => {
      tags('Users');

      response(200, 'User deleted successfully', () => {
        const userId = '2';

        return request(app.getHttpServer())
          .delete(`/users/${userId}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('deleted', true);
          });
      });

      response(404, 'User not found');
    });
  });
});

// 5. Configure Jest for e2e tests
// test/jest-e2e.json
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
    ["@foryourdev/jest-swag/dist/reporter.js", {
      "title": "My NestJS API Documentation",
      "version": "1.0.0",
      "description": "NestJS API documentation generated from e2e tests",
      "outputPath": "./docs/openapi.json",
      "servers": [
        { "url": "http://localhost:3000", "description": "Development server" },
        { "url": "https://api.myapp.com", "description": "Production server" }
      ]
    }]
  ]
}
*/

// 6. Main application file
// main.ts
import { NestFactory } from '@nestjs/core';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  await app.listen(3000);

  console.log('🚀 NestJS app running on http://localhost:3000');
  if (process.env.NODE_ENV !== 'production') {
    console.log('📖 API docs available at http://localhost:3000/api-docs');
  }
}
bootstrap();

// 7. Package.json scripts
/*
{
  "scripts": {
    "start": "nest start",
    "start:dev": "nest start --watch",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "test:e2e:docs": "jest --config ./test/jest-e2e.json --reporters=@foryourdev/jest-swag/dist/reporter.js"
  }
}
*/

// 8. Usage
// npm run test:e2e && npm run start:dev
// Open http://localhost:3000/api-docs
