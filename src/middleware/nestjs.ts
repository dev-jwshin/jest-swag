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
    const { Module, Controller, Get, Res, Req } = require('@nestjs/common');

    return { Module, Controller, Get, Res, Req, isAvailable: true };
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
 * JestSwagModule for NestJS integration
 */
class JestSwagModuleClass {
  static forRoot(options: JestSwagModuleOptions = {}) {
    const nestjs = createJestSwagModule();

    if (!nestjs.isAvailable) {
      return {
        module: class {},
        controllers: [],
        providers: [],
      };
    }

    const { Module, Controller, Get, Res, Req } = nestjs;

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
      getSwaggerUI(@Res() res: Response, @Req() req: any) {
        // 디버깅을 위한 로그
        console.log('🔍 Request debugging:', {
          baseUrl: req.baseUrl,
          originalUrl: req.originalUrl,
          url: req.url,
          path: req.path,
        });

        // 요청 URL에서 basePath 추출
        const originalUrl = req.originalUrl || req.url;
        const pathIndex = originalUrl.lastIndexOf(
          `/${this.options.path || 'api-docs'}`,
        );
        const basePath =
          pathIndex !== -1
            ? originalUrl.substring(
                0,
                pathIndex + `/${this.options.path || 'api-docs'}`.length,
              )
            : `/${this.options.path || 'api-docs'}`;

        console.log('📍 Determined basePath:', basePath);

        const specUrl = `${basePath}/openapi.json`;
        const html = this.generateSwaggerHTML(specUrl, basePath);
        res.setHeader('Content-Type', 'text/html');
        return res.send(html);
      }

      @Get('/swagger-ui.css')
      getSwaggerCSS(@Res() res: Response) {
        console.log('📄 CSS request received');
        return res.redirect(
          'https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui.css',
        );
      }

      @Get('/swagger-ui-bundle.js')
      getSwaggerBundle(@Res() res: Response) {
        console.log('📦 JS bundle request received');
        return res.redirect(
          'https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui-bundle.js',
        );
      }

      @Get('/swagger-ui-standalone-preset.js')
      getSwaggerPreset(@Res() res: Response) {
        console.log('⚙️ Preset request received');
        return res.redirect(
          'https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui-standalone-preset.js',
        );
      }

      generateSwaggerHTML(
        specUrl: string,
        basePath: string = '/api-docs',
      ): string {
        const title = this.options.title || 'API Documentation';
        const defaultOptions = {
          dom_id: '#swagger-ui',
          deepLinking: true,
          presets: [
            'SwaggerUIBundle.presets.apis',
            'SwaggerUIStandalonePreset',
          ],
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
    <link rel="stylesheet" type="text/css" href="${basePath}/swagger-ui.css" />
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
    <script src="${basePath}/swagger-ui-bundle.js"></script>
    <script src="${basePath}/swagger-ui-standalone-preset.js"></script>
    <script>
        window.onload = function() {
            const ui = SwaggerUIBundle(${JSON.stringify(defaultOptions, null, 12)});
        };
    </script>
</body>
</html>`;
      }
    }

    const routePath = options.path || 'api-docs';

    // Create a properly named controller class
    @Controller(routePath)
    class JestSwagDynamicController extends JestSwagController {
      constructor() {
        super(options);
      }
    }

    // Set a proper class name for better debugging
    Object.defineProperty(JestSwagDynamicController, 'name', {
      value: `JestSwagController_${routePath.replace(/[^a-zA-Z0-9]/g, '_')}`,
    });

    console.log(`📖 Setting up Jest Swag UI at /${routePath}`);

    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `🚀 Swagger UI will be available at http://localhost:3000/${routePath}`,
      );
    }

    return {
      module: JestSwagModuleClass,
      controllers: [JestSwagDynamicController],
      providers: [
        {
          provide: 'JEST_SWAG_OPTIONS',
          useValue: options,
        },
      ],
    };
  }
}

export const JestSwagModule = JestSwagModuleClass;
