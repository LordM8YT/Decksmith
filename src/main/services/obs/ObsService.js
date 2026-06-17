const { OBSWebSocket } = require('obs-websocket-js');

class ObsService {
  constructor({ store }) {
    this.store = store;
    this.client = null;
    this.state = {
      config: this.store.getObsConnection(),
      connected: false,
      connecting: false,
      obsWebSocketVersion: null,
      currentProgramSceneName: null,
      scenes: [],
      lastError: null,
      setupHint: null
    };
    this.boundHandlers = null;
  }

  async start() {
    this.state.config = this.store.getObsConnection();

    if (this.state.config.autoConnect !== false) {
      await this.connect({
        suppressThrow: true,
        tryFallbacks: true
      });
    }
  }

  async dispose() {
    await this.disconnect();
  }

  getState() {
    return this.state;
  }

  async updateConnectionConfig(partialConfig) {
    this.state.config = await this.store.updateObsConnection(sanitizeObsConfig(partialConfig));
    return this.getState();
  }

  async connect({ suppressThrow = false, tryFallbacks = true } = {}) {
    await this.disconnect();

    this.state.connecting = true;
    this.state.lastError = null;
    this.state.setupHint = null;

    const candidates = buildConnectionCandidates(this.state.config.url, tryFallbacks);
    let lastError = null;

    for (const url of candidates) {
      const client = new OBSWebSocket();

      try {
        const result = await client.connect(
          url,
          this.state.config.password || undefined,
          { rpcVersion: 1 }
        );

        this.client = client;
        this.attachClientHandlers();
        this.state.connected = true;
        this.state.connecting = false;
        this.state.obsWebSocketVersion = result.obsWebSocketVersion;
        this.state.lastError = null;
        this.state.setupHint = null;

        if (url !== this.state.config.url) {
          this.state.config = await this.store.updateObsConnection({ url });
        }

        await this.refreshScenes();
        return this.getState();
      } catch (error) {
        lastError = error;

        try {
          await client.disconnect();
        } catch (_disconnectError) {
          // Ignore cleanup failures while trying fallback endpoints.
        }
      }
    }

    this.state.connecting = false;
    this.state.connected = false;
    this.state.scenes = [];
    this.state.currentProgramSceneName = null;
    this.state.obsWebSocketVersion = null;
    this.state.lastError = formatObsError(lastError, candidates);
    this.state.setupHint = buildSetupHint(lastError);

    if (!suppressThrow) {
      throw new Error(this.state.lastError);
    }

    return this.getState();
  }

  async disconnect() {
    if (this.client) {
      this.detachClientHandlers();

      try {
        await this.client.disconnect();
      } catch (_error) {
        // Ignore disconnect failures during shutdown or reconnect.
      }
    }

    this.client = null;
    this.state.connected = false;
    this.state.connecting = false;
    this.state.obsWebSocketVersion = null;
    this.state.currentProgramSceneName = null;
    this.state.scenes = [];
    this.state.lastError = null;
    this.state.setupHint = null;
    return this.getState();
  }

  async refreshScenes() {
    if (!this.client || !this.state.connected) {
      return this.getState();
    }

    try {
      const response = await this.client.call('GetSceneList');
      this.state.scenes = (response.scenes || []).map((scene) => ({
        sceneIndex: scene.sceneIndex,
        sceneName: scene.sceneName,
        sceneUuid: scene.sceneUuid
      }));
      this.state.currentProgramSceneName = response.currentProgramSceneName || null;
      this.state.lastError = null;
      this.state.setupHint = null;
    } catch (error) {
      this.state.lastError = error.message;
      throw error;
    }

    return this.getState();
  }

  async switchScene(sceneName) {
    if (!this.client || !this.state.connected) {
      throw new Error('OBS is not connected.');
    }

    if (!sceneName) {
      throw new Error('A scene name is required.');
    }

    await this.client.call('SetCurrentProgramScene', {
      sceneName
    });

    this.state.currentProgramSceneName = sceneName;
    this.state.lastError = null;
    this.state.setupHint = null;
    return this.getState();
  }

  attachClientHandlers() {
    if (!this.client) {
      return;
    }

    this.boundHandlers = {
      connectionClosed: (error) => {
        this.state.connected = false;
        this.state.connecting = false;
        this.state.currentProgramSceneName = null;
        this.state.scenes = [];
        this.state.lastError = error?.message || 'OBS connection closed.';
        this.state.setupHint = buildSetupHint(error);
      },
      connectionError: (error) => {
        this.state.lastError = error?.message || 'OBS connection error.';
        this.state.setupHint = buildSetupHint(error);
      },
      currentProgramSceneChanged: ({ sceneName }) => {
        this.state.currentProgramSceneName = sceneName;
      },
      sceneListChanged: () => {
        void this.refreshScenes().catch((error) => {
          this.state.lastError = error.message;
          this.state.setupHint = buildSetupHint(error);
        });
      }
    };

    this.client.on('ConnectionClosed', this.boundHandlers.connectionClosed);
    this.client.on('ConnectionError', this.boundHandlers.connectionError);
    this.client.on('CurrentProgramSceneChanged', this.boundHandlers.currentProgramSceneChanged);
    this.client.on('SceneListChanged', this.boundHandlers.sceneListChanged);
  }

  detachClientHandlers() {
    if (!this.client || !this.boundHandlers) {
      return;
    }

    this.client.off('ConnectionClosed', this.boundHandlers.connectionClosed);
    this.client.off('ConnectionError', this.boundHandlers.connectionError);
    this.client.off('CurrentProgramSceneChanged', this.boundHandlers.currentProgramSceneChanged);
    this.client.off('SceneListChanged', this.boundHandlers.sceneListChanged);
    this.boundHandlers = null;
  }
}

function sanitizeObsConfig(partialConfig) {
  const sanitized = {};

  if ('url' in partialConfig) {
    sanitized.url = String(partialConfig.url || 'ws://127.0.0.1:4455').trim() || 'ws://127.0.0.1:4455';
  }

  if ('password' in partialConfig) {
    sanitized.password = String(partialConfig.password || '');
  }

  if ('autoConnect' in partialConfig) {
    sanitized.autoConnect = partialConfig.autoConnect !== false;
  }

  return sanitized;
}

function buildConnectionCandidates(configuredUrl, tryFallbacks) {
  const primaryUrl = sanitizeObsUrl(configuredUrl || 'ws://127.0.0.1:4455');
  const urls = [primaryUrl];

  if (tryFallbacks && isDefaultObsUrl(primaryUrl)) {
    urls.push('ws://127.0.0.1:4444');
    urls.push('ws://localhost:4455');
    urls.push('ws://localhost:4444');
  }

  return Array.from(new Set(urls));
}

function sanitizeObsUrl(url) {
  return String(url || 'ws://127.0.0.1:4455').trim() || 'ws://127.0.0.1:4455';
}

function isDefaultObsUrl(url) {
  return [
    'ws://127.0.0.1:4455',
    'ws://localhost:4455',
    'ws://127.0.0.1:4444',
    'ws://localhost:4444'
  ].includes(url);
}

function formatObsError(error, attemptedUrls) {
  const message = error?.message || 'Unable to connect to OBS.';

  if (message.includes('ECONNREFUSED')) {
    return `Could not reach the OBS WebSocket server. Tried: ${attemptedUrls.join(', ')}.`;
  }

  if (message.toLowerCase().includes('authentication')) {
    return 'OBS rejected the WebSocket password. Update the password and try again.';
  }

  return message;
}

function buildSetupHint(error) {
  const message = error?.message || '';

  if (message.includes('ECONNREFUSED')) {
    return 'Open OBS, go to Tools > WebSocket Server Settings, enable the server, and confirm the port is 4455.';
  }

  if (message.toLowerCase().includes('authentication')) {
    return 'Open OBS > Tools > WebSocket Server Settings and copy the same server password into OpenDeck.';
  }

  return 'Verify OBS is running with its WebSocket server enabled, then try reconnecting.';
}

module.exports = {
  ObsService
};
