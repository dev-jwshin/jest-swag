/**
 * NestJS module for serving Swagger UI
 * Note: This requires @nestjs/common and @nestjs/core as peer dependencies
 */

import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

// Simple factory function to create NestJS module when available
export function createJestSwagModule() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Module, Controller, Get, Res } = require('@nestjs/common');

    return { Module, Controller, Get, Res, isAvailable: true };
  } catch (error) {
    console.warn(
      'NestJS not available. JestSwagModule requires @nestjs/common as a peer dependency.',
    );
    return { isAvailable: false };
  }
}

export interface JestSwagModuleOptions {
  path?: string;
  title?: string;
  swaggerOptions?: any;
}

/**
 * Create JestSwagModule dynamically when NestJS is available
 */
export function JestSwagModule() {
  const nestjs = createJestSwagModule();

  if (!nestjs.isAvailable) {
    return {
      forRoot: () => ({
        module: class {},
        controllers: [],
        providers: [],
      }),
    };
  }

  const { Module, Controller, Get, Res } = nestjs;

  @Controller()
  class JestSwagController {
    constructor(public readonly options: JestSwagModuleOptions) {}

    findSpecFile(): string | null {
      const possiblePaths = [
        path.resolve('./docs/openapi.json'),
        path.resolve('./openapi.json'),
        path.resolve('./dist/docs/openapi.json'),
      ];

      for (const specPath of possiblePaths) {
        if (fs.existsSync(specPath)) {
          return specPath;
        }
      }
      return null;
    }

    @Get('/openapi.json')
    getOpenApiSpec(@Res() res: Response) {
      const specPath = this.findSpecFile();
      if (!specPath) {
        return res.status(404).json({
          error:
            'OpenAPI specification not found. Run your tests with jest-swag reporter first.',
        });
      }

      try {
        const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
        return res.json(spec);
      } catch (error) {
        return res
          .status(500)
          .json({ error: 'Failed to load OpenAPI specification' });
      }
    }

    @Get(['/', '/index.html'])
    getSwaggerUI(@Res() res: Response) {
      const specUrl = `${this.options.path || '/api-docs'}/openapi.json`;
      const html = this.generateSwaggerHTML(specUrl);
      res.setHeader('Content-Type', 'text/html');
      return res.send(html);
    }

    @Get('/swagger-ui.css')
    getSwaggerCSS(@Res() res: Response) {
      return res.redirect(
        'https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui.css',
      );
    }

    @Get('/swagger-ui-bundle.js')
    getSwaggerBundle(@Res() res: Response) {
      return res.redirect(
        'https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui-bundle.js',
      );
    }

    @Get('/swagger-ui-standalone-preset.js')
    getSwaggerPreset(@Res() res: Response) {
      return res.redirect(
        'https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui-standalone-preset.js',
      );
    }

    generateSwaggerHTML(specUrl: string): string {
      const title = this.options.title || 'API Documentation';
      const defaultOptions = {
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: ['SwaggerUIBundle.presets.apis', 'SwaggerUIStandalonePreset'],
        plugins: ['SwaggerUIBundle.plugins.DownloadUrl'],
        layout: 'StandaloneLayout',
        url: specUrl,
        ...this.options.swaggerOptions,
      };

      return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link rel="stylesheet" type="text/css" href="./swagger-ui.css" />
    <style>
        html {
            box-sizing: border-box;
            overflow: -moz-scrollbars-vertical;
            overflow-y: scroll;
        }
        *, *:before, *:after {
            box-sizing: inherit;
        }
        body {
            margin: 0;
            background: #fafafa;
        }
        .swagger-ui .topbar {
            display: none;
        }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="./swagger-ui-bundle.js"></script>
    <script src="./swagger-ui-standalone-preset.js"></script>
    <script>
        window.onload = function() {
            const ui = SwaggerUIBundle(${JSON.stringify(defaultOptions, null, 12)});
        };
    </script>
</body>
</html>`;
    }
  }

  @Module({})
  class JestSwagModuleClass {
    static forRoot(options: JestSwagModuleOptions = {}) {
      const routePath = options.path || 'api-docs';

      // Create controller with custom route
      const DynamicController = Controller(routePath)(JestSwagController);

      console.log(`📖 Setting up Jest Swag UI at /${routePath}`);

      if (process.env.NODE_ENV !== 'production') {
        console.log(
          `🚀 Swagger UI will be available at http://localhost:3000/${routePath}`,
        );
      }

      return {
        module: JestSwagModuleClass,
        controllers: [DynamicController],
        providers: [
          {
            provide: 'JEST_SWAG_OPTIONS',
            useValue: options,
          },
          {
            provide: JestSwagController,
            useFactory: () => new JestSwagController(options),
          },
        ],
      };
    }
  }

  return JestSwagModuleClass;
}
