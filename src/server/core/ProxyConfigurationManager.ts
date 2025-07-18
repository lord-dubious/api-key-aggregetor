import { ProxyConfiguration, PROXY_STORAGE_KEYS } from '../types/Proxy';
import * as vscode from 'vscode';

/**
 * Manages proxy configuration settings and persistence
 */
export class ProxyConfigurationManager {
  private context: vscode.ExtensionContext;
  private defaultConfig: ProxyConfiguration = {
    autoAssignmentEnabled: true,
    loadBalancingStrategy: 'least_loaded',
    healthCheckInterval: 60000, // 1 minute
    maxErrorsBeforeDisable: 3,
    rebalanceThreshold: 1
  };

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /**
   * Load proxy configuration from storage
   */
  public async loadConfiguration(): Promise<ProxyConfiguration> {
    try {
      const storedConfigJson = await this.context.secrets.get(PROXY_STORAGE_KEYS.PROXY_SETTINGS);
      
      if (storedConfigJson) {
        const storedConfig = JSON.parse(storedConfigJson);
        
        // Merge with defaults to ensure all properties exist
        const config: ProxyConfiguration = {
          ...this.defaultConfig,
          ...storedConfig
        };
        
        console.log('ProxyConfigurationManager: Loaded configuration from storage');
        return config;
      } else {
        console.log('ProxyConfigurationManager: No stored configuration found, using defaults');
        return { ...this.defaultConfig };
      }
    } catch (error) {
      console.error('ProxyConfigurationManager: Error loading configuration, using defaults:', error);
      return { ...this.defaultConfig };
    }
  }

  /**
   * Save proxy configuration to storage
   */
  public async saveConfiguration(config: ProxyConfiguration): Promise<void> {
    try {
      await this.context.secrets.store(
        PROXY_STORAGE_KEYS.PROXY_SETTINGS,
        JSON.stringify(config)
      );
      console.log('ProxyConfigurationManager: Configuration saved to storage');
    } catch (error) {
      console.error('ProxyConfigurationManager: Error saving configuration:', error);
      throw error;
    }
  }

  /**
   * Update specific configuration settings
   */
  public async updateConfiguration(updates: Partial<ProxyConfiguration>): Promise<ProxyConfiguration> {
    const currentConfig = await this.loadConfiguration();
    const newConfig: ProxyConfiguration = {
      ...currentConfig,
      ...updates
    };
    
    await this.saveConfiguration(newConfig);
    return newConfig;
  }

  /**
   * Reset configuration to defaults
   */
  public async resetConfiguration(): Promise<ProxyConfiguration> {
    const defaultConfig = { ...this.defaultConfig };
    await this.saveConfiguration(defaultConfig);
    console.log('ProxyConfigurationManager: Configuration reset to defaults');
    return defaultConfig;
  }

  /**
   * Migrate legacy proxy configuration to new system
   */
  public async migrateLegacyConfiguration(): Promise<void> {
    try {
      // Check for legacy rotating proxy setting
      const legacyProxiesJson = await this.context.secrets.get("geminiProxies");
      const legacyRotatingProxy = await this.context.secrets.get("geminiRotatingProxy");
      
      if (legacyProxiesJson || legacyRotatingProxy) {
        console.log('ProxyConfigurationManager: Found legacy configuration, migrating...');
        
        const currentConfig = await this.loadConfiguration();
        let needsUpdate = false;
        
        // If legacy rotating proxy was enabled, disable auto-assignment
        if (legacyRotatingProxy === 'true') {
          currentConfig.autoAssignmentEnabled = false;
          needsUpdate = true;
          console.log('ProxyConfigurationManager: Migrated legacy rotating proxy setting');
        }
        
        if (needsUpdate) {
          await this.saveConfiguration(currentConfig);
        }
        
        console.log('ProxyConfigurationManager: Legacy configuration migration completed');
      }
    } catch (error) {
      console.error('ProxyConfigurationManager: Error during legacy migration:', error);
      // Don't throw - migration failures shouldn't break the system
    }
  }

  /**
   * Validate configuration values
   */
  public validateConfiguration(config: Partial<ProxyConfiguration>): string[] {
    const errors: string[] = [];
    
    if (config.healthCheckInterval !== undefined) {
      if (config.healthCheckInterval < 10000) {
        errors.push('Health check interval must be at least 10 seconds');
      }
      if (config.healthCheckInterval > 600000) {
        errors.push('Health check interval must be at most 10 minutes');
      }
    }
    
    if (config.maxErrorsBeforeDisable !== undefined) {
      if (config.maxErrorsBeforeDisable < 1) {
        errors.push('Max errors before disable must be at least 1');
      }
      if (config.maxErrorsBeforeDisable > 10) {
        errors.push('Max errors before disable must be at most 10');
      }
    }
    
    if (config.rebalanceThreshold !== undefined) {
      if (config.rebalanceThreshold < 0) {
        errors.push('Rebalance threshold must be non-negative');
      }
      if (config.rebalanceThreshold > 5) {
        errors.push('Rebalance threshold must be at most 5');
      }
    }
    
    if (config.loadBalancingStrategy !== undefined) {
      const validStrategies = ['round_robin', 'least_loaded', 'random'];
      if (!validStrategies.includes(config.loadBalancingStrategy)) {
        errors.push(`Load balancing strategy must be one of: ${validStrategies.join(', ')}`);
      }
    }
    
    return errors;
  }

  /**
   * Export configuration for backup
   */
  public async exportConfiguration(): Promise<string> {
    const config = await this.loadConfiguration();
    return JSON.stringify(config, null, 2);
  }

  /**
   * Import configuration from backup
   */
  public async importConfiguration(configJson: string): Promise<ProxyConfiguration> {
    try {
      const config = JSON.parse(configJson) as Partial<ProxyConfiguration>;
      
      // Validate the imported configuration
      const errors = this.validateConfiguration(config);
      if (errors.length > 0) {
        throw new Error(`Invalid configuration: ${errors.join(', ')}`);
      }
      
      // Merge with defaults to ensure all properties exist
      const fullConfig: ProxyConfiguration = {
        ...this.defaultConfig,
        ...config
      };
      
      await this.saveConfiguration(fullConfig);
      console.log('ProxyConfigurationManager: Configuration imported successfully');
      return fullConfig;
    } catch (error) {
      console.error('ProxyConfigurationManager: Error importing configuration:', error);
      throw new Error(`Failed to import configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get default configuration
   */
  public getDefaultConfiguration(): ProxyConfiguration {
    return { ...this.defaultConfig };
  }

  /**
   * Check if configuration has been customized from defaults
   */
  public async isConfigurationCustomized(): Promise<boolean> {
    const currentConfig = await this.loadConfiguration();
    return JSON.stringify(currentConfig) !== JSON.stringify(this.defaultConfig);
  }
}