const { createDefaultDeckProfile } = require('./defaultDeckProfile');

class StreamDeckService {
  constructor({ onButtonDown = null } = {}) {
    this.driver = null;
    this.devices = [];
    this.activeDeck = null;
    this.activeDevicePath = null;
    this.activeProfile = createDefaultDeckProfile();
    this.driverStatus = {
      available: false,
      reason: 'Driver not loaded yet.'
    };
    this.lastError = null;
    this.lastInputEvent = null;
    this.boundListeners = null;
    this.onButtonDown = onButtonDown;
  }

  async start() {
    await this.rescan();
  }

  async dispose() {
    await this.closeActiveDeck();
  }

  async rescan() {
    const driver = await this.loadDriver();

    if (!driver) {
      this.devices = [];
      this.activeProfile = createDefaultDeckProfile();
      return this.getState();
    }

    try {
      const discoveredDevices = await driver.listStreamDecks();
      this.devices = discoveredDevices.map((device) => ({
        path: device.path,
        model: device.model,
        modelName: driver.getStreamDeckModelName(device.model),
        serialNumber: device.serialNumber ?? null
      }));

      const activeDeviceStillConnected = this.activeDevicePath
        && this.devices.some((device) => device.path === this.activeDevicePath);

      if (!activeDeviceStillConnected) {
        await this.closeActiveDeck();
      }

      if (!this.activeDeck && this.devices.length > 0) {
        await this.openDevice(this.devices[0].path);
      } else if (this.activeDeck) {
        await this.refreshActiveProfile();
      } else {
        this.activeProfile = createDefaultDeckProfile();
      }
    } catch (error) {
      this.lastError = error.message;
      this.activeProfile = createDefaultDeckProfile();
    }

    return this.getState();
  }

  getDeckProfile() {
    return this.activeProfile;
  }

  getState() {
    return {
      driver: this.driverStatus,
      devices: this.devices,
      activeDevicePath: this.activeDevicePath,
      profile: this.activeProfile,
      lastError: this.lastError,
      lastInputEvent: this.lastInputEvent,
      setupHints: this.getSetupHints()
    };
  }

  async renderKey({ deckId, keyIndex, imageData, color }) {
    if (!this.activeDeck) {
      return {
        ok: false,
        reason: 'NO_ACTIVE_DEVICE'
      };
    }

    if (deckId && deckId !== this.activeProfile.id) {
      return {
        ok: false,
        reason: 'DECK_MISMATCH'
      };
    }

    const button = this.activeProfile.buttons.find((candidate) => candidate.index === keyIndex);

    if (!button) {
      return {
        ok: false,
        reason: 'UNKNOWN_KEY'
      };
    }

    if (color) {
      await this.activeDeck.fillKeyColor(keyIndex, color.r, color.g, color.b);

      return {
        ok: true
      };
    }

    if (!imageData?.data) {
      return {
        ok: false,
        reason: 'NO_IMAGE_DATA'
      };
    }

    const format = imageData.format || 'rgba';
    const bytesPerPixel = format === 'rgb' || format === 'bgr' ? 3 : 4;
    const expectedBytes = button.pixelSize.width * button.pixelSize.height * bytesPerPixel;

    if (imageData.data.length !== expectedBytes) {
      return {
        ok: false,
        reason: 'INVALID_IMAGE_BUFFER',
        expectedBytes,
        receivedBytes: imageData.data.length
      };
    }

    await this.activeDeck.fillKeyBuffer(
      keyIndex,
      Uint8Array.from(imageData.data),
      { format }
    );

    return {
      ok: true
    };
  }

  async loadDriver() {
    if (this.driver) {
      return this.driver;
    }

    try {
      this.driver = require('@elgato-stream-deck/node');
      this.driverStatus = {
        available: true,
        reason: null
      };

      return this.driver;
    } catch (error) {
      this.driverStatus = {
        available: false,
        reason: error.message
      };
      this.lastError = error.message;
      return null;
    }
  }

  async openDevice(devicePath) {
    const driver = await this.loadDriver();

    if (!driver) {
      return;
    }

    if (this.activeDeck && this.activeDevicePath === devicePath) {
      return;
    }

    await this.closeActiveDeck();

    this.activeDeck = await driver.openStreamDeck(devicePath);
    this.activeDevicePath = devicePath;
    this.attachDeckListeners();
    await this.refreshActiveProfile();
  }

  async closeActiveDeck() {
    if (!this.activeDeck) {
      this.activeDevicePath = null;
      return;
    }

    this.detachDeckListeners();

    try {
      await this.activeDeck.close();
    } catch (error) {
      this.lastError = error.message;
    }

    this.activeDeck = null;
    this.activeDevicePath = null;
    this.activeProfile = createDefaultDeckProfile();
  }

  attachDeckListeners() {
    if (!this.activeDeck) {
      return;
    }

    this.boundListeners = {
      down: (control) => {
        this.lastInputEvent = {
          type: 'down',
          index: control.index,
          at: new Date().toISOString()
        };

        if (control.type === 'button' && this.onButtonDown) {
          this.onButtonDown({
            index: control.index,
            slotId: `button:${control.index}`
          });
        }
      },
      up: (control) => {
        this.lastInputEvent = {
          type: 'up',
          index: control.index,
          at: new Date().toISOString()
        };
      },
      error: (error) => {
        this.lastError = error instanceof Error ? error.message : String(error);
      }
    };

    this.activeDeck.on('down', this.boundListeners.down);
    this.activeDeck.on('up', this.boundListeners.up);
    this.activeDeck.on('error', this.boundListeners.error);
  }

  detachDeckListeners() {
    if (!this.activeDeck || !this.boundListeners) {
      return;
    }

    this.activeDeck.off('down', this.boundListeners.down);
    this.activeDeck.off('up', this.boundListeners.up);
    this.activeDeck.off('error', this.boundListeners.error);
    this.boundListeners = null;
  }

  async refreshActiveProfile() {
    if (!this.activeDeck) {
      this.activeProfile = createDefaultDeckProfile();
      return;
    }

    const buttons = this.activeDeck.CONTROLS
      .filter((control) => control.type === 'button')
      .map((control) => ({
        slotId: `button:${control.index}`,
        index: control.index,
        hidIndex: control.hidIndex,
        row: control.row,
        column: control.column,
        feedbackType: control.feedbackType,
        pixelSize: control.pixelSize || { width: 96, height: 96 }
      }));

    const dimensions = buttons.reduce((result, button) => ({
      rows: Math.max(result.rows, button.row + 1),
      columns: Math.max(result.columns, button.column + 1)
    }), { rows: 0, columns: 0 });
    const activeDeviceInfo = this.devices.find((device) => device.path === this.activeDevicePath);
    const stableDeckId = activeDeviceInfo?.serialNumber
      ? `streamdeck:${activeDeviceInfo.serialNumber}`
      : this.activeDevicePath;

    this.activeProfile = {
      id: stableDeckId,
      model: this.activeDeck.MODEL,
      productName: this.activeDeck.PRODUCT_NAME,
      serialNumber: activeDeviceInfo?.serialNumber || null,
      rows: dimensions.rows,
      columns: dimensions.columns,
      isMock: false,
      buttons
    };
  }

  getSetupHints() {
    const hints = [];

    if (!this.driverStatus.available) {
      hints.push('Install dependencies with npm install before launching OpenDeck.');
    }

    if (process.platform === 'linux') {
      hints.push('If your device is not detected, install the desktop udev rules from linux/udev and reconnect the Stream Deck.');
    }

    return hints;
  }
}

module.exports = {
  StreamDeckService
};
