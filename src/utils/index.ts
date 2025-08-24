/**
 * OpenAPI specification storage and utilities
 */

export interface ApiSpec {
  path: string;
  method: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses: { [statusCode: string]: Response };
  security?: SecurityRequirement[];
}

export interface Parameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  description?: string;
  required?: boolean;
  schema: Schema;
  example?: any;
}

export interface RequestBody {
  description?: string;
  required?: boolean;
  content: { [mediaType: string]: { schema: Schema; example?: any } };
}

export interface Response {
  description: string;
  content?: { [mediaType: string]: { schema: Schema; example?: any } };
  headers?: { [headerName: string]: Header };
}

export interface Header {
  description?: string;
  schema: Schema;
}

export interface Schema {
  type?: string;
  format?: string;
  description?: string;
  properties?: { [propertyName: string]: Schema };
  items?: Schema;
  required?: string[];
  example?: any;
  enum?: any[];
  allOf?: Schema[];
  oneOf?: Schema[];
  anyOf?: Schema[];
  minimum?: number;
  maximum?: number;
  pattern?: string;
  default?: any;
}

export interface SecurityRequirement {
  [name: string]: string[];
}

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Global storage for API specs with deduplication
export const apiSpecs: ApiSpec[] = [];

// Performance: Cache for spec deduplication
const specCache = new Map<string, ApiSpec>();

// Generate unique temp file path
const getSpecsFilePath = (): string => {
  const tempDir = os.tmpdir();
  const projectHash = Math.abs(hashCode(process.cwd())).toString(36);
  const processId = process.pid;
  return path.join(tempDir, `jest-swag-specs-${projectHash}-${processId}.json`);
};

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

const SPECS_FILE = getSpecsFilePath();

// Flag to control file persistence
let enableFilePersistence = true;

// Performance: Generate unique key for spec
function getSpecKey(spec: ApiSpec): string {
  return `${spec.path}:${spec.method}:${spec.summary || ''}`;
}

export const disableFilePersistence = (): void => {
  enableFilePersistence = false;
};

export const enableFilePersistenceMode = (): void => {
  enableFilePersistence = true;
};

export const addApiSpec = (spec: ApiSpec): void => {
  const key = getSpecKey(spec);
  
  // Performance: Skip duplicate specs
  if (specCache.has(key)) {
    const existing = specCache.get(key)!;
    // Update if the new spec has more information
    if (JSON.stringify(spec).length > JSON.stringify(existing).length) {
      const index = apiSpecs.indexOf(existing);
      if (index !== -1) {
        apiSpecs[index] = spec;
      }
      specCache.set(key, spec);
    }
    return;
  }
  
  apiSpecs.push(spec);
  specCache.set(key, spec);

  // Only persist to file if enabled
  if (enableFilePersistence) {
    scheduleSaveSpecsToFile();
  }
};

export const clearApiSpecs = (): void => {
  apiSpecs.length = 0;
  specCache.clear();
  
  // Cancel pending save operations
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }

  // Clear file system cache
  if (fs.existsSync(SPECS_FILE)) {
    fs.unlinkSync(SPECS_FILE);
  }
};

// Performance: Batch file writes with debouncing
let saveTimeout: NodeJS.Timeout | null = null;
let isCleaningUp = false;

function scheduleSaveSpecsToFile(): void {
  // Don't schedule saves during cleanup
  if (isCleaningUp) return;
  
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  
  // Debounce writes by 100ms
  saveTimeout = setTimeout(() => {
    if (!isCleaningUp) {
      saveSpecsToFile();
    }
    saveTimeout = null;
  }, 100);
}

// Export function to stop file writes during cleanup
export const stopFileWrites = (): void => {
  isCleaningUp = true;
  enableFilePersistence = false;
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
};

export const resumeFileWrites = (): void => {
  isCleaningUp = false;
  enableFilePersistence = true;
};

// Function to cleanup temp file with delay to ensure all writes are done
export const cleanupTempSpecFile = (): void => {
  stopFileWrites();
  
  // Clear any pending writes immediately
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  
  // Delete file with a small delay to ensure all async operations are done
  setTimeout(() => {
    if (fs.existsSync(SPECS_FILE)) {
      try {
        fs.unlinkSync(SPECS_FILE);
      } catch (error) {
        // Ignore errors
      }
    }
  }, 200); // 200ms delay to ensure all writes are complete
};

export const saveSpecsToFile = (): void => {
  try {
    // Performance: Only write if there are specs and persistence is enabled
    if (apiSpecs.length > 0 && enableFilePersistence && !isCleaningUp) {
      fs.writeFileSync(SPECS_FILE, JSON.stringify(apiSpecs, null, 2));
    }
  } catch (error) {}
};

// Performance: Cache file reads
let lastFileRead: { mtime: Date; specs: ApiSpec[] } | null = null;

export const loadSpecsFromFile = (): ApiSpec[] => {
  try {
    if (fs.existsSync(SPECS_FILE)) {
      const stats = fs.statSync(SPECS_FILE);
      
      // Performance: Return cached if file hasn't changed
      if (lastFileRead && stats.mtime.getTime() === lastFileRead.mtime.getTime()) {
        return lastFileRead.specs;
      }
      
      const data = fs.readFileSync(SPECS_FILE, 'utf8');
      const specs = JSON.parse(data) as ApiSpec[];
      
      // Update cache
      lastFileRead = { mtime: stats.mtime, specs };
      
      // Update in-memory cache
      specs.forEach(spec => {
        const key = getSpecKey(spec);
        if (!specCache.has(key)) {
          specCache.set(key, spec);
        }
      });
      
      return specs;
    }
  } catch (error) {}
  return [];
};
