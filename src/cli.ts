#!/usr/bin/env node

/**
 * CLI for jest-swag
 */

import { program } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { OpenAPIGenerator } from './generator/openapi-generator';
import { apiSpecs, clearApiSpecs } from './utils';

interface CLIOptions {
  title?: string;
  version?: string;
  description?: string;
  output?: string;
  server?: string[];
  config?: string;
}

program
  .name('jest-swag')
  .description('Generate OpenAPI documentation from Jest API tests')
  .version('1.0.0');

program
  .command('generate')
  .description('Generate OpenAPI documentation')
  .option('-t, --title <title>', 'API title', 'API Documentation')
  .option('-v, --version <version>', 'API version', '1.0.0')
  .option('-d, --description <description>', 'API description')
  .option('-o, --output <path>', 'Output file path', './docs/openapi.json')
  .option(
    '-s, --server <url>',
    'Server URL (can be used multiple times)',
    collect,
    [],
  )
  .option('-c, --config <path>', 'Configuration file path')
  .action(async (options: CLIOptions) => {
    try {
      let config = {
        title: options.title!,
        version: options.version!,
        description: options.description,
        outputPath: options.output!,
        servers: options.server?.map((url) => ({
          url,
          description: `Server: ${url}`,
        })),
      };

      // Load config file if provided
      if (options.config) {
        const configPath = path.resolve(options.config);
        if (fs.existsSync(configPath)) {
          const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          config = { ...config, ...fileConfig };
        } else {
          process.exit(1);
        }
      }

      // For CLI usage, we need to load specs from a temporary file
      // This would typically be saved by the Jest reporter
      const specsPath = getTempSpecsFilePath();
      if (fs.existsSync(specsPath)) {
        const savedSpecs = JSON.parse(fs.readFileSync(specsPath, 'utf8'));
        clearApiSpecs();
        savedSpecs.forEach((spec: any) => apiSpecs.push(spec));
      }

      if (apiSpecs.length === 0) {
        // Clean up temp file even if no specs
        cleanupTempFile(specsPath);
        return;
      }

      const generator = new OpenAPIGenerator(config);
      const document = await generator.generate();
      
      // Clean up temp file after generation
      cleanupTempFile(specsPath);
    } catch (error) {
      // Clean up temp file on error
      const specsPath = getTempSpecsFilePath();
      cleanupTempFile(specsPath);
      process.exit(1);
    }
  });

program
  .command('serve')
  .description('Serve the generated documentation')
  .option('-p, --port <port>', 'Port number', '3001')
  .option('-d, --docs <path>', 'Documentation directory', './docs')
  .action(async (options) => {
    try {
      const express = require('express');
      const path = require('path');

      const app = express();
      const port = parseInt(options.port);
      const docsDir = path.resolve(options.docs);

      // Serve static files from docs directory
      app.use(express.static(docsDir));

      // Serve OpenAPI JSON at /openapi.json
      app.get('/openapi.json', (req: any, res: any) => {
        const jsonPath = path.join(docsDir, 'openapi.json');
        if (fs.existsSync(jsonPath)) {
          res.sendFile(jsonPath);
        } else {
          res.status(404).json({ error: 'OpenAPI document not found' });
        }
      });

      // Default route serves index.html
      app.get('/', (req: any, res: any) => {
        const indexPath = path.join(docsDir, 'index.html');
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.send(`
            <h1>jest-swag Documentation Server</h1>
            <p>Documentation not found. Generate it first:</p>
            <pre>npx jest-swag generate</pre>
          `);
        }
      });

      app.listen(port, () => {});
    } catch (error) {
      process.exit(1);
    }
  });

// Helper function to collect multiple values
function collect(value: string, previous: string[]) {
  return previous.concat([value]);
}

// Generate unique temp file path (same logic as utils)
function getTempSpecsFilePath(): string {
  const tempDir = os.tmpdir();
  const projectHash = Math.abs(hashCode(process.cwd())).toString(36);
  const processId = process.pid;
  return path.join(tempDir, `jest-swag-specs-${projectHash}-${processId}.json`);
}

// Simple hash function for project path
function hashCode(str: string): number {
  let hash = 0;
  if (str.length === 0) return hash;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

// Helper function to clean up temporary spec file
function cleanupTempFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    // Ignore errors when cleaning up
  }
}

program.parse();
