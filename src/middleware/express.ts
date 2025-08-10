/**
 * Express middleware for serving Swagger UI
 */

import express, { Application, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

export interface SwaggerUIOptions {
  routePrefix?: string;
  specUrl?: string;
  title?: string;
  swaggerOptions?: any;
}

/**
 * Express middleware to serve Swagger UI for jest-swag generated documentation
 */
export function swaggerUI(options: SwaggerUIOptions = {}) {
  const {
    routePrefix = '/api-docs',
    specUrl = '/api-docs/openapi.json',
    title = 'API Documentation',
    swaggerOptions = {},
  } = options;

  const router = express.Router();

  // Find the OpenAPI spec file
  const findSpecFile = (): string | null => {
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
  };

  // Serve OpenAPI JSON
  router.get('/openapi.json', (req: Request, res: Response) => {
    const specPath = findSpecFile();
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
  });

  // Serve Swagger UI HTML
  router.get(['/', '/index.html'], (req: Request, res: Response) => {
    const html = generateSwaggerHTML(
      specUrl,
      title,
      swaggerOptions,
      routePrefix,
    );
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  });

  // Serve Swagger UI assets from CDN
  router.get('/swagger-ui.css', (req: Request, res: Response) => {
    res.redirect('https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui.css');
  });

  router.get('/swagger-ui-bundle.js', (req: Request, res: Response) => {
    res.redirect(
      'https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui-bundle.js',
    );
  });

  router.get(
    '/swagger-ui-standalone-preset.js',
    (req: Request, res: Response) => {
      res.redirect(
        'https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui-standalone-preset.js',
      );
    },
  );

  return router;
}

/**
 * Setup Swagger UI for Express app
 */
export function setupSwagger(app: Application, options: SwaggerUIOptions = {}) {
  const { routePrefix = '/api-docs' } = options;

  console.log(`📖 Setting up Swagger UI at ${routePrefix}`);
  app.use(routePrefix, swaggerUI(options));

  // Log the URL in development
  if (process.env.NODE_ENV !== 'production') {
    console.log(
      `🚀 Swagger UI available at http://localhost:3000${routePrefix}`,
    );
  }
}

/**
 * Generate Swagger UI HTML
 */
function generateSwaggerHTML(
  specUrl: string,
  title: string,
  swaggerOptions: any,
  routePrefix: string = '/api-docs',
): string {
  const defaultOptions = {
    dom_id: '#swagger-ui',
    deepLinking: true,
    presets: ['SwaggerUIBundle.presets.apis', 'SwaggerUIStandalonePreset'],
    plugins: ['SwaggerUIBundle.plugins.DownloadUrl'],
    layout: 'StandaloneLayout',
    url: specUrl,
    ...swaggerOptions,
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link rel="stylesheet" type="text/css" href="${routePrefix}/swagger-ui.css" />
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
    <script src="${routePrefix}/swagger-ui-bundle.js"></script>
    <script src="${routePrefix}/swagger-ui-standalone-preset.js"></script>
    <script>
        window.onload = function() {
            const ui = SwaggerUIBundle(${JSON.stringify(defaultOptions, null, 12)});
            
            // Custom styling
            setTimeout(() => {
                const logo = document.querySelector('.topbar-wrapper');
                if (logo) {
                    logo.style.display = 'none';
                }
            }, 100);
        };
    </script>
</body>
</html>`;
}
