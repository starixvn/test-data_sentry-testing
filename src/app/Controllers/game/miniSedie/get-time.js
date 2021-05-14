const ConfigHelper = require("./../../../Helpers/ConfigHelper");
const GameConfigs = require("./../../../Models/GameConfig/GameConfigs");
const Logger = require("./../../../web/logger");

module.exports = (player) => {
  GameConfigs.findOne({ name: ConfigHelper.GameTypes.MiniSedie }, { _id: false, enabled: true, disabled_message: true })
    .lean()
    .exec()
    .then((config) => {
      const disabled = config == null || !config.enabled;
      const disabledMessage = config == null ? "" : config.disabled_message;

      if (player.red && player.redT) {
        player.red({
          miniSedie: {
            remainingTime: player.redT.miniSedie.remainingTime,
            um: disabled,
            um_message: disabledMessage,
          },
        });
      }
    })
    .catch(Logger.logError);
};
