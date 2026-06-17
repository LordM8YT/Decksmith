module.exports.activate = async ({ registerAction }) => {
  registerAction({
    id: 'scene-switch',
    configFields: [
      {
        id: 'sceneName',
        label: 'Target scene',
        type: 'select',
        optionsSource: 'obs.scenes',
        placeholder: 'Choose an OBS scene'
      }
    ],
    onTrigger: async ({ assignment, services }) => {
      const sceneName = assignment?.config?.sceneName;

      if (!sceneName) {
        throw new Error('No OBS scene is configured for this key.');
      }

      await services.obs.switchScene(sceneName);

      return {
        sceneName
      };
    }
  });
};
