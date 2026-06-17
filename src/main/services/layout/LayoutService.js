class LayoutService {
  constructor({ store }) {
    this.store = store;
  }

  getDeckLayout(deckProfile) {
    const assignments = this.ensureDeckAssignments(deckProfile);

    return {
      deckId: deckProfile.id,
      slots: deckProfile.buttons.map((button) => ({
        ...button,
        assignment: assignments[button.slotId] ?? null
      }))
    };
  }

  async assignAction(deckProfile, slotId, actionId, initialConfig = {}) {
    const assignments = this.ensureDeckAssignments(deckProfile);
    const slot = deckProfile.buttons.find((button) => button.slotId === slotId);

    if (!slot) {
      throw new Error(`Unknown slot "${slotId}" for deck "${deckProfile.id}".`);
    }

    assignments[slotId] = {
      actionId,
      config: {
        ...initialConfig
      },
      assignedAt: new Date().toISOString()
    };
    await this.store.save();
  }

  async updateAssignmentConfig(deckProfile, slotId, configPatch) {
    const assignments = this.ensureDeckAssignments(deckProfile);
    const assignment = assignments[slotId];

    if (!(slotId in assignments)) {
      throw new Error(`Unknown slot "${slotId}" for deck "${deckProfile.id}".`);
    }

    if (!assignment) {
      throw new Error(`Slot "${slotId}" has no assigned action to configure.`);
    }

    assignment.config = {
      ...(assignment.config || {}),
      ...configPatch
    };
    await this.store.save();
  }

  async clearAction(deckProfile, slotId) {
    const assignments = this.ensureDeckAssignments(deckProfile);

    if (!(slotId in assignments)) {
      throw new Error(`Unknown slot "${slotId}" for deck "${deckProfile.id}".`);
    }

    assignments[slotId] = null;
    await this.store.save();
  }

  ensureDeckAssignments(deckProfile) {
    const assignments = this.store.getDeckAssignments(deckProfile.id);

    for (const button of deckProfile.buttons) {
      if (!(button.slotId in assignments)) {
        assignments[button.slotId] = null;
      }
    }

    return assignments;
  }
}

module.exports = {
  LayoutService
};
