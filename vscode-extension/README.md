# Jest Swag for Visual Studio Code

Generate OpenAPI/Swagger documentation from your Jest API tests directly in VS Code!

## Features

- 🚀 **One-click documentation generation** - Generate API docs from test files
- 👀 **Live preview** - Preview your API documentation in VS Code
- 🔄 **Watch mode** - Auto-regenerate docs when tests change
- ✨ **Code snippets** - Quick snippets for common test patterns
- 🎯 **Context menus** - Right-click on test files to generate docs
- ⚡ **Status bar integration** - Quick access from the status bar

## Installation

1. Install the extension from VS Code Marketplace
2. Install jest-swag in your project:
   ```bash
   npm install --save-dev @foryourdev/jest-swag
   ```
3. Initialize jest-swag:
   ```bash
   npx jest-swag init
   ```

## Commands

All commands are available from the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

- **Jest Swag: Initialize** - Set up jest-swag in your project
- **Jest Swag: Generate API Documentation** - Generate OpenAPI docs from tests
- **Jest Swag: Preview API Documentation** - Open docs preview in VS Code
- **Jest Swag: Run API Tests** - Run the current test file
- **Jest Swag: Start Watch Mode** - Auto-regenerate docs on changes

## Keyboard Shortcuts

- `Ctrl+Shift+D` / `Cmd+Shift+D` - Generate documentation (when in test file)
- `Ctrl+Shift+P` / `Cmd+Shift+P` - Preview documentation

## Code Snippets

Type these prefixes in your test files for quick snippets:

- `jspath` - Create a path block
- `jsget` - Create a GET operation
- `jspost` - Create a POST operation
- `jsparam` - Add a parameter
- `jsresponse` - Add a response
- `jsbody` - Add a request body
- `jscommon` - Import common response helpers
- `jspagination` - Add pagination support
- `jsfull` - Complete test example

## Configuration

Configure the extension in VS Code settings:

```json
{
  "jestSwag.outputPath": "./docs/openapi.json",
  "jestSwag.autoGenerate": false,
  "jestSwag.watchMode": false,
  "jestSwag.serverPort": 3001,
  "jestSwag.showNotifications": true
}
```

## Usage Example

```typescript
import { path, get, post, response, parameter } from '@foryourdev/jest-swag';
import request from 'supertest';
import app from '../src/app';

path('/api/users', () => {
  get('Get all users', () => {
    parameter({
      name: 'limit',
      in: 'query',
      schema: { type: 'integer' },
      description: 'Max number of users'
    });
    
    response(200, 'Success', () => {
      return request(app)
        .get('/api/users')
        .expect(200);
    });
  });
});
```

## Context Menu Integration

Right-click on any test file (`.test.ts`, `.test.js`, `.spec.ts`, `.spec.js`) to:
- Run tests
- Generate documentation

## Status Bar

Click the "📚 Jest Swag" item in the status bar to quickly generate documentation.

## Requirements

- VS Code 1.74.0 or higher
- Node.js 14 or higher
- Jest 27 or higher
- @foryourdev/jest-swag package installed in your project

## Known Issues

- Watch mode requires `chokidar` package to be installed
- Preview may not update immediately in some cases (refresh the preview panel)

## Contributing

Found a bug or have a feature request? Please open an issue on [GitHub](https://github.com/your-repo/jest-swag).

## License

MIT