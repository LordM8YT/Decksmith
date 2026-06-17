const fs = require('node:fs/promises');
const path = require('node:path');

class AppStateStore {
  constructor({ filePath }) {
    this.filePath = filePath;
    this.state = createDefaultState();
  }

  async load() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });

    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      this.state = mergeState(parsed);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }

      await this.save();
    }
  }

  async save() {
    await fs.writeFile(this.filePath, JSON.stringify(this.state, null, 2), 'utf8');
  }

  getState() {
    return this.state;
  }

  getDeckAssignments(deckId) {
    if (!this.state.layoutAssignmentsByDeck[deckId]) {
      this.state.layoutAssignmentsByDeck[deckId] = {};
    }

    return this.state.layoutAssignmentsByDeck[deckId];
  }

  getObsConnection() {
    return this.state.obsConnection;
  }

  async updateObsConnection(partialConfig) {
    this.state.obsConnection = {
      ...this.state.obsConnection,
      ...partialConfig
    };
    await this.save();
    return this.state.obsConnection;
  }
}

function createDefaultState() {
  return {
    version: 1,
    layoutAssignmentsByDeck: {},
    obsConnection: {
      url: 'ws://127.0.0.1:4455',
      password: '',
      autoConnect: true
    }
  };
}

function mergeState(parsed) {
  const defaults = createDefaultState();

  return {
    ...defaults,
    ...parsed,
    layoutAssignmentsByDeck: {
      ...defaults.layoutAssignmentsByDeck,
      ...(parsed?.layoutAssignmentsByDeck || {})
    },
    obsConnection: {
      ...defaults.obsConnection,
      ...(parsed?.obsConnection || {})
    }
  };
}

module.exports = {
  AppStateStore
};
