const ConfigHelper = require("./../../../../Helpers/ConfigHelper");

module.exports = (player) => {
  const kenoProVietData = player.redT.kenoProViet;
  const configs = ConfigHelper.getConfigs(ConfigHelper.GameTypes.KenoProViet);
  const configuredlyDisabled = !configs || !configs.enabled;

  const disabled = configuredlyDisabled || kenoProVietData.delayStartTime > 0;
  const disabledMessage = configs ? configs.disabled_message : "";

  if (player.red && player.redT) {
    player.red({
      kenoProViet: {
        remainingTime: kenoProVietData.remainingTime,
        um: disabled,
        um_message: disabledMessage,
      },
    });
  }
};
