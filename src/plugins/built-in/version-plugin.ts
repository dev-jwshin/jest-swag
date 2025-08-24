/**
 * API version management plugin
 */

import { Plugin } from '../plugin-manager';
import { OpenAPIDocument } from '../../generator/openapi-generator';
import { ApiSpec } from '../../utils';
import * as fs from 'fs';
import * as path from 'path';

interface VersionOptions {
  strategy: 'path' | 'header' | 'query';
  versions: string[];
  defaultVersion?: string;
  outputDir?: string;
  generateDiff?: boolean;
}

interface VersionDiff {
  added: string[];
  removed: string[];
  changed: string[];
  breaking: string[];
}

export class VersionPlugin implements Plugin {
  name = 'api-versioning';
  version = '1.0.0';
  
  private options: VersionOptions;
  private versionHistory: Map<string, OpenAPIDocument> = new Map();
  
  constructor(options: VersionOptions) {
    this.options = {
      outputDir: './docs/versions',
      generateDiff: true,
      defaultVersion: options.versions[0],
      ...options,
    };
  }
  
  async beforeGenerate(specs: ApiSpec[]): Promise<ApiSpec[]> {
    // Group specs by version
    const versionedSpecs: ApiSpec[] = [];
    
    for (const version of this.options.versions) {
      const versionSpecs = this.filterSpecsByVersion(specs, version);
      
      if (this.options.strategy === 'path') {
        // Add version prefix to paths
        versionedSpecs.push(...versionSpecs.map(spec => ({
          ...spec,
          path: `/v${version}${spec.path}`,
        })));
      } else {
        versionedSpecs.push(...versionSpecs);
      }
    }
    
    return versionedSpecs.length > 0 ? versionedSpecs : specs;
  }
  
  async afterGenerate(document: OpenAPIDocument): Promise<OpenAPIDocument> {
    // Generate separate documents for each version
    for (const version of this.options.versions) {
      const versionDoc = this.createVersionDocument(document, version);
      this.versionHistory.set(version, versionDoc);
      
      // Write version-specific document
      await this.writeVersionDocument(version, versionDoc);
    }
    
    // Generate version diff if requested
    if (this.options.generateDiff && this.options.versions.length > 1) {
      await this.generateVersionDiff();
    }
    
    // Add version information to main document
    document.info.version = this.options.defaultVersion || document.info.version;
    
    // Add version selector to description
    if (this.options.versions.length > 1) {
      const versionLinks = this.options.versions
        .map(v => `[v${v}](./versions/v${v}/openapi.json)`)
        .join(' | ');
      
      document.info.description = 
        `${document.info.description || ''}\n\n**Available versions:** ${versionLinks}`;
    }
    
    return document;
  }
  
  private filterSpecsByVersion(specs: ApiSpec[], version: string): ApiSpec[] {
    return specs.filter(spec => {
      // Check for version in tags
      if (spec.tags?.includes(`v${version}`)) {
        return true;
      }
      
      // Check for version in path
      if (spec.path.includes(`/v${version}/`)) {
        return true;
      }
      
      // Check for version in description
      if (spec.description?.includes(`@version ${version}`)) {
        return true;
      }
      
      // If no version specified, include in all versions
      const hasAnyVersion = this.options.versions.some(v => 
        spec.tags?.includes(`v${v}`) ||
        spec.path.includes(`/v${v}/`) ||
        spec.description?.includes(`@version ${v}`)
      );
      
      return !hasAnyVersion;
    });
  }
  
  private createVersionDocument(
    baseDocument: OpenAPIDocument,
    version: string
  ): OpenAPIDocument {
    const versionDoc: OpenAPIDocument = {
      ...baseDocument,
      info: {
        ...baseDocument.info,
        version,
        title: `${baseDocument.info.title} - v${version}`,
      },
      paths: {},
    };
    
    // Filter paths for this version
    for (const [pathName, pathItem] of Object.entries(baseDocument.paths)) {
      if (this.shouldIncludePath(pathName, pathItem, version)) {
        versionDoc.paths[pathName] = pathItem;
      }
    }
    
    // Add version-specific servers
    if (this.options.strategy === 'path' && versionDoc.servers) {
      versionDoc.servers = versionDoc.servers.map(server => ({
        ...server,
        url: `${server.url}/v${version}`,
      }));
    }
    
    return versionDoc;
  }
  
  private shouldIncludePath(
    pathName: string,
    pathItem: any,
    version: string
  ): boolean {
    // Check if path is version-specific
    if (pathName.includes(`/v${version}/`)) {
      return true;
    }
    
    // Check if any operation has version tag
    for (const operation of Object.values(pathItem)) {
      if (typeof operation === 'object' && operation !== null) {
        const op = operation as any;
        if (op.tags?.includes(`v${version}`)) {
          return true;
        }
      }
    }
    
    // Include non-versioned paths in all versions
    const hasAnyVersion = this.options.versions.some(v => 
      pathName.includes(`/v${v}/`)
    );
    
    return !hasAnyVersion;
  }
  
  private async writeVersionDocument(
    version: string,
    document: OpenAPIDocument
  ): Promise<void> {
    const outputDir = path.join(this.options.outputDir!, `v${version}`);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputPath = path.join(outputDir, 'openapi.json');
    fs.writeFileSync(outputPath, JSON.stringify(document, null, 2));
    
    console.log(`📝 Version ${version} documentation written to ${outputPath}`);
  }
  
  private async generateVersionDiff(): Promise<void> {
    const versions = this.options.versions.sort();
    
    for (let i = 0; i < versions.length - 1; i++) {
      const oldVersion = versions[i];
      const newVersion = versions[i + 1];
      
      const oldDoc = this.versionHistory.get(oldVersion);
      const newDoc = this.versionHistory.get(newVersion);
      
      if (oldDoc && newDoc) {
        const diff = this.compareVersions(oldDoc, newDoc);
        await this.writeDiff(oldVersion, newVersion, diff);
      }
    }
  }
  
  private compareVersions(
    oldDoc: OpenAPIDocument,
    newDoc: OpenAPIDocument
  ): VersionDiff {
    const diff: VersionDiff = {
      added: [],
      removed: [],
      changed: [],
      breaking: [],
    };
    
    const oldPaths = new Set(Object.keys(oldDoc.paths));
    const newPaths = new Set(Object.keys(newDoc.paths));
    
    // Find added paths
    for (const path of newPaths) {
      if (!oldPaths.has(path)) {
        diff.added.push(path);
      }
    }
    
    // Find removed paths (breaking change)
    for (const path of oldPaths) {
      if (!newPaths.has(path)) {
        diff.removed.push(path);
        diff.breaking.push(`Removed endpoint: ${path}`);
      }
    }
    
    // Find changed paths
    for (const path of oldPaths) {
      if (newPaths.has(path)) {
        const oldPath = oldDoc.paths[path];
        const newPath = newDoc.paths[path];
        
        if (JSON.stringify(oldPath) !== JSON.stringify(newPath)) {
          diff.changed.push(path);
          
          // Check for breaking changes
          const oldMethods = new Set(Object.keys(oldPath));
          const newMethods = new Set(Object.keys(newPath));
          
          for (const method of oldMethods) {
            if (!newMethods.has(method)) {
              diff.breaking.push(`Removed method ${method.toUpperCase()} from ${path}`);
            }
          }
        }
      }
    }
    
    return diff;
  }
  
  private async writeDiff(
    oldVersion: string,
    newVersion: string,
    diff: VersionDiff
  ): Promise<void> {
    const diffPath = path.join(
      this.options.outputDir!,
      `diff-v${oldVersion}-to-v${newVersion}.md`
    );
    
    const content = `# API Changes: v${oldVersion} → v${newVersion}

## Added Endpoints (${diff.added.length})
${diff.added.map(p => `- ${p}`).join('\n') || 'None'}

## Removed Endpoints (${diff.removed.length})
${diff.removed.map(p => `- ${p} ⚠️`).join('\n') || 'None'}

## Changed Endpoints (${diff.changed.length})
${diff.changed.map(p => `- ${p}`).join('\n') || 'None'}

## Breaking Changes (${diff.breaking.length})
${diff.breaking.map(c => `- ⚠️ ${c}`).join('\n') || 'None'}

---
Generated on ${new Date().toISOString()}
`;
    
    fs.writeFileSync(diffPath, content);
    console.log(`📊 Version diff written to ${diffPath}`);
  }
}

export default VersionPlugin;