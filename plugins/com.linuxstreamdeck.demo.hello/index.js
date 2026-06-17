module.exports.activate = async ({ registerAction, logger }) => {
  registerAction({
    id: 'hello-world',
    onTrigger: async ({ slot, deck }) => {
      logger.info(`hello-world triggered from ${slot.slotId} on ${deck.productName}`);
      return {
        message: `Hello from key ${slot.index + 1}`
      };
    }
  });

  registerAction({
    id: 'focus-mode',
    onTrigger: async ({ slot, deck }) => {
      logger.info(`focus-mode triggered from ${slot.slotId} on ${deck.productName}`);
      return {
        message: `Focus mode requested on key ${slot.index + 1}`
      };
    }
  });
};
