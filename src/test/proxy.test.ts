import * as assert from 'assert';
import * as vscode from 'vscode';
import * as http from 'http';
import ApiKeyManager from '../server/core/ApiKeyManager';
import { ApiKey } from '../server/types/ApiKey';
import { EventManager } from '../server/core/EventManager';
import GoogleApiForwarder from '../server/core/GoogleApiForwarder';
import proxy from './proxy-server';

import * as dotenv from 'dotenv';
dotenv.config();

suite('Proxy Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.');

  let proxyServer: http.Server;
  const proxyPort = 8080;
  let requestReceived = false;

  suiteSetup(() => {
    proxyServer = proxy.listen(proxyPort);
    proxy.on('request', () => {
      requestReceived = true;
    });
  });

  suiteTeardown(() => {
    proxyServer.close();
  });

  test('Test proxy connection', async function() {
    this.timeout(5000); // 5 second timeout

    const eventManager = new EventManager();
    const context = {
      secrets: {
        get: async (key: string) => undefined,
        store: async (key: string, value: string) => {},
        delete: async (key: string) => {},
      },
    } as unknown as vscode.ExtensionContext;

    const initialApiKeys: ApiKey[] = [
      {
        key: 'test-key',
        keyId: 'key1',
        status: 'available',
        currentRequests: 0,
        proxy: process.env.HTTPS_PROXY,
      },
    ];

    const apiKeyManager = new ApiKeyManager(initialApiKeys, eventManager, context);
    await apiKeyManager.loadKeys(initialApiKeys);

    const googleApiForwarder = new GoogleApiForwarder();

    const apiKey = apiKeyManager.getAvailableKey();
    assert.ok(apiKey, 'Could not get an available API key');

    // This will fail, but we are checking if the proxy is used
    try {
      await googleApiForwarder.forwardRequest('gemini-pro', 'generateContent', {}, apiKey!);
    } catch (error) {
      // We expect an error because the proxy will not be able to connect to the Google API
    }

    assert.strictEqual(requestReceived, true, 'Proxy was not used');
  });
});
