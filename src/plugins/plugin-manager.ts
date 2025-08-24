/**
 * Plugin system for jest-swag
 */

import { OpenAPIDocument } from '../generator/openapi-generator';
import { ApiSpec } from '../utils';

export interface Plugin {
  name: string;
  version?: string;
  
  // Lifecycle hooks
  beforeGenerate?: (specs: ApiSpec[]) => ApiSpec[] | Promise<ApiSpec[]>;
  afterGenerate?: (document: OpenAPIDocument) => OpenAPIDocument | Promise<OpenAPIDocument>;
  beforeWrite?: (document: OpenAPIDocument) => OpenAPIDocument | Promise<OpenAPIDocument>;
  afterWrite?: (path: string) => void | Promise<void>;
  
  // Transform hooks
  transformSpec?: (spec: ApiSpec) => ApiSpec | Promise<ApiSpec>;
  transformSchema?: (schema: any) => any | Promise<any>;
  
  // Custom validators
  validate?: (document: OpenAPIDocument) => { valid: boolean; errors?: string[] };
}

export class PluginManager {
  private static instance: PluginManager;
  private plugins: Plugin[] = [];
  
  private constructor() {}
  
  static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }
  
  /**
   * Register a plugin
   */
  register(plugin: Plugin): void {
    console.log(`📦 Registering plugin: ${plugin.name}`);
    this.plugins.push(plugin);
  }
  
  /**
   * Register multiple plugins
   */
  registerAll(plugins: Plugin[]): void {
    plugins.forEach(plugin => this.register(plugin));
  }
  
  /**
   * Unregister a plugin by name
   */
  unregister(name: string): void {
    this.plugins = this.plugins.filter(p => p.name !== name);
  }
  
  /**
   * Clear all plugins
   */
  clear(): void {
    this.plugins = [];
  }
  
  /**
   * Execute beforeGenerate hooks
   */
  async executeBeforeGenerate(specs: ApiSpec[]): Promise<ApiSpec[]> {
    let result = specs;
    
    for (const plugin of this.plugins) {
      if (plugin.beforeGenerate) {
        try {
          result = await plugin.beforeGenerate(result);
        } catch (error) {
          console.error(`Error in plugin ${plugin.name} beforeGenerate:`, error);
        }
      }
    }
    
    return result;
  }
  
  /**
   * Execute afterGenerate hooks
   */
  async executeAfterGenerate(document: OpenAPIDocument): Promise<OpenAPIDocument> {
    let result = document;
    
    for (const plugin of this.plugins) {
      if (plugin.afterGenerate) {
        try {
          result = await plugin.afterGenerate(result);
        } catch (error) {
          console.error(`Error in plugin ${plugin.name} afterGenerate:`, error);
        }
      }
    }
    
    return result;
  }
  
  /**
   * Execute beforeWrite hooks
   */
  async executeBeforeWrite(document: OpenAPIDocument): Promise<OpenAPIDocument> {
    let result = document;
    
    for (const plugin of this.plugins) {
      if (plugin.beforeWrite) {
        try {
          result = await plugin.beforeWrite(result);
        } catch (error) {
          console.error(`Error in plugin ${plugin.name} beforeWrite:`, error);
        }
      }
    }
    
    return result;
  }
  
  /**
   * Execute afterWrite hooks
   */
  async executeAfterWrite(path: string): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.afterWrite) {
        try {
          await plugin.afterWrite(path);
        } catch (error) {
          console.error(`Error in plugin ${plugin.name} afterWrite:`, error);
        }
      }
    }
  }
  
  /**
   * Transform a spec through all plugins
   */
  async transformSpec(spec: ApiSpec): Promise<ApiSpec> {
    let result = spec;
    
    for (const plugin of this.plugins) {
      if (plugin.transformSpec) {
        try {
          result = await plugin.transformSpec(result);
        } catch (error) {
          console.error(`Error in plugin ${plugin.name} transformSpec:`, error);
        }
      }
    }
    
    return result;
  }
  
  /**
   * Transform a schema through all plugins
   */
  async transformSchema(schema: any): Promise<any> {
    let result = schema;
    
    for (const plugin of this.plugins) {
      if (plugin.transformSchema) {
        try {
          result = await plugin.transformSchema(result);
        } catch (error) {
          console.error(`Error in plugin ${plugin.name} transformSchema:`, error);
        }
      }
    }
    
    return result;
  }
  
  /**
   * Validate document through all plugins
   */
  validate(document: OpenAPIDocument): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    for (const plugin of this.plugins) {
      if (plugin.validate) {
        try {
          const result = plugin.validate(document);
          if (!result.valid && result.errors) {
            errors.push(...result.errors.map(e => `[${plugin.name}] ${e}`));
          }
        } catch (error) {
          console.error(`Error in plugin ${plugin.name} validate:`, error);
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
  
  /**
   * Get registered plugins
   */
  getPlugins(): Plugin[] {
    return [...this.plugins];
  }
}

// Export singleton instance
export default PluginManager.getInstance();