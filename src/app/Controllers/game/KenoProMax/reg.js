const ConfigHelper = require("../../../Helpers/ConfigHelper");
const GameConfigs = require("../../../Models/GameConfig/GameConfigs");
const Logger = require("../../../web/logger");

const NoticeMessages = require("./../constants/notice-messages");

module.exports = (realPlayer) => {
  const kenoProMaxData = realPlayer.redT.kenoProMax;

  GameConfigs.findOne({ name: ConfigHelper.GameTypes.KenoProMax })
    .exec()
    .then((config) => {
      ConfigHelper.updateConfig(ConfigHelper.GameTypes.KenoProMax, config);

      if (config && config.enabled) {
        if (kenoProMaxData.realPlayers[realPlayer.UID]) {
          realPlayer.red({
            notice: {
              title: NoticeMessages.notice,
              text: NoticeMessages.youOrOtherLoggedInToThisAccount("Keno Pro Max"),
              load: false,
            },
          });
        } else {
          kenoProMaxData.realPlayers[realPlayer.UID] = realPlayer;
          realPlayer.red({ toGame: "KenoProMax" });
        }
      } else {
        const disabledMessage = config === null ? "" : config.disabled_message;

        realPlayer.red({
          notice: { title: NoticeMessages.notice, text: disabledMessage, load: false },
        });
      }
    })
    .catch((error) => Logger.logError(error));
};
