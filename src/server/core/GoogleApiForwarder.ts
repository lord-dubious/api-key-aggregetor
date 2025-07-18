import { GoogleGenAI } from '@google/genai';
import { ApiKey } from '../types';
import config from '../config';

// 定义一个简单的错误类型，用于传递 Google API 错误信息，特别是包含 Key 信息
export class GoogleApiError extends Error {
  statusCode?: number;
  apiKey?: string;
  isRateLimitError: boolean;
  isProxyError: boolean;
  proxyUrl?: string;

  constructor(
    message: string, 
    statusCode?: number, 
    apiKey?: string, 
    isRateLimitError: boolean = false,
    isProxyError: boolean = false,
    proxyUrl?: string
  ) {
    super(message);
    this.name = 'GoogleApiError';
    this.statusCode = statusCode;
    this.apiKey = apiKey;
    this.isRateLimitError = isRateLimitError;
    this.isProxyError = isProxyError;
    this.proxyUrl = proxyUrl;
  }
}

import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

class GoogleApiForwarder {
  private maxProxyRetries: number = 1;
  private requestTimeout: number = 30000; // 30 seconds
  
  /**
   * Set the maximum number of proxy retries
   */
  public setMaxProxyRetries(retries: number): void {
    this.maxProxyRetries = retries;
  }
  
  /**
   * Get the proxy URL to use for a request
   * Returns rotating proxy if configured, otherwise returns the API key's assigned proxy
   */
  private getProxyForRequest(apiKey: ApiKey): string | undefined {
    // If rotating proxy is configured, use it instead of individual proxy assignments
    if (config.USE_ROTATING_PROXY && config.ROTATING_PROXY) {
      console.log(`GoogleApiForwarder: Using rotating proxy for key ${apiKey.keyId}`);
      return config.ROTATING_PROXY;
    }
    
    // Otherwise, use the individual proxy assigned to this API key
    return apiKey.proxy;
  }
  
  /**
   * Create an appropriate proxy agent based on the proxy URL
   */
  private createProxyAgent(proxyUrl: string): any {
    try {
      if (!proxyUrl) {
        return undefined;
      }
      
      const url = new URL(proxyUrl);
      
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        return new HttpsProxyAgent(proxyUrl);
      } else if (url.protocol === 'socks:' || url.protocol === 'socks5:') {
        return new SocksProxyAgent(proxyUrl);
      } else {
        console.warn(`GoogleApiForwarder: Unsupported proxy protocol: ${url.protocol}`);
        return undefined;
      }
    } catch (error) {
      console.error('GoogleApiForwarder: Error creating proxy agent:', error);
      return undefined;
    }
  }
  
  /**
   * Check if an error is likely caused by a proxy issue
   */
  private isProxyError(error: any): boolean {
    if (!error) {
      return false;
    }
    
    // Common proxy error patterns
    const proxyErrorPatterns = [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ECONNRESET',
      'socket hang up',
      'proxy',
      'tunnel',
      'unable to verify the first certificate',
      'certificate has expired',
      'certificate is not trusted',
      'unable to get local issuer certificate',
      'self signed certificate',
      'proxy authentication required'
    ];
    
    const errorString = error.toString().toLowerCase();
    return proxyErrorPatterns.some(pattern => errorString.includes(pattern.toLowerCase()));
  }

  /**
   * Forward a request to the Google API with proxy support and error handling
   */
  async forwardRequest(
    modelId: string, 
    methodName: string, 
    requestBody: any, 
    apiKey: ApiKey,
    retryCount: number = 0
  ): Promise<{ response?: any, stream?: AsyncIterable<any>, error?: GoogleApiError }> {
    // Get the proxy to use for this request (rotating or individual)
    const proxyUrl = this.getProxyForRequest(apiKey);
    const agent = proxyUrl ? this.createProxyAgent(proxyUrl) : undefined;
    
    // Log proxy usage
    if (proxyUrl) {
      const proxyType = config.USE_ROTATING_PROXY ? 'rotating proxy' : 'individual proxy';
      console.log(`GoogleApiForwarder: Using ${proxyType} ${proxyUrl} for key ${apiKey.keyId}`);
    } else {
      console.log(`GoogleApiForwarder: No proxy used for key ${apiKey.keyId}`);
    }
    
    // Initialize GoogleGenAI with proxy support
    const httpOptions = agent ? { agent, timeout: this.requestTimeout } : { timeout: this.requestTimeout };
    const ai = new GoogleGenAI({
      apiKey: apiKey.key,
      httpOptions: httpOptions
    });

    try {
      let result;
      if (methodName === 'generateContent') {
        // 处理非流式请求 - 使用新的 @google/genai SDK API
        result = await ai.models.generateContent({
          model: modelId,
          contents: requestBody.contents || requestBody,
          config: requestBody.config || {}
        });
        console.info(`GoogleApiForwarder: 转发非流式请求到模型 ${modelId} 使用 Key ${apiKey.key}`);
        return { response: result };
      } else if (methodName === 'streamGenerateContent') {
        // 处理流式请求 - 使用新的 @google/genai SDK API
        result = await ai.models.generateContentStream({
          model: modelId,
          contents: requestBody.contents || requestBody,
          config: requestBody.config || {}
        });
        console.info(`GoogleApiForwarder: 转发流式请求到模型 ${modelId} 使用 Key ${apiKey.key}`);
        return { stream: result };
      } else {
        // 理论上这部分代码不会被执行，因为 ProxyRoute 已经做了方法名验证
        // 但作为防御性编程，保留此处的错误处理
        const unsupportedMethodError = new GoogleApiError(
          `Unsupported API method: ${methodName}`,
          400, // Bad Request
          apiKey.key,
          false
        );
        console.error(`GoogleApiForwarder: 不支持的 API 方法 (${apiKey.key}):`, methodName);
        return { error: unsupportedMethodError };
      }

    } catch (error: any) {
      console.error(`GoogleApiForwarder: 调用 Google API 时发生错误 (${apiKey.key}):`, JSON.stringify(error));

      // 尝试识别速率限制错误 (HTTP 429) 或其他 Google API 错误
      const statusCode = error.response?.status || error.statusCode;
      const isRateLimit = statusCode === 429; // Google API 返回 429 表示速率限制
      const isProxyError = this.isProxyError(error);
      
      // If this is a proxy error and we have retries left, try again without proxy
      if (isProxyError && proxyUrl && retryCount < this.maxProxyRetries) {
        console.warn(`GoogleApiForwarder: Proxy error detected, retrying without proxy for key ${apiKey.keyId}`);
        
        if (config.USE_ROTATING_PROXY) {
          // For rotating proxy, we can't retry without proxy easily, so just fail
          console.warn(`GoogleApiForwarder: Rotating proxy failed, no fallback available`);
        } else {
          // For individual proxy, create a copy of the API key without the proxy
          const apiKeyWithoutProxy: ApiKey = {
            ...apiKey,
            proxy: undefined
          };
          
          // Retry the request without proxy
          return this.forwardRequest(modelId, methodName, requestBody, apiKeyWithoutProxy, retryCount + 1);
        }
      }

      // 创建自定义错误对象，包含 Key 信息和是否为速率限制错误
      const googleApiError = new GoogleApiError(
        `Google API Error: ${error.message}`,
        statusCode,
        apiKey.key,
        isRateLimit,
        isProxyError,
        proxyUrl
      );

      return { error: googleApiError };
    }
  }
}

export default GoogleApiForwarder;