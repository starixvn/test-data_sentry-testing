const logger = require("./../../../web/logger");
const ConfigHelper = require("./../../../Helpers/ConfigHelper");
const GameConfigs = require("../../../Models/GameConfig/GameConfigs");
const NoticeMessage = require("../constants/notice-messages");

const removeOutRoomUser = (outPlayer, userId) => {
  try {
    const io = outPlayer.redT;
    if (io && io.game) {
      let baccarat = io.game.baccarat;
      if (baccarat && (baccarat.realPlayers[userId] || baccarat.players[userId])) {
        delete baccarat.realPlayers[userId];
        delete baccarat.players[userId];

        Object.values(baccarat.realPlayers).forEach((realPlayer) => {
          if (outPlayer !== realPlayer) {
            realPlayer.red({ baccarat: { outgame: { playerId: userId } } });
          }
        });
      }
    }
  } catch (ex) {
    logger.logError(ex);
  }
};

const registerBaccarat = (client) => {
  const baccarat = client.redT.game.baccarat;

  removeOutRoomUser(client, client.UID);

  GameConfigs.findOne({ name: ConfigHelper.GameTypes.Baccarat })
    .then((data) => {
      ConfigHelper.updateConfig(ConfigHelper.GameTypes.Baccarat, data);

      if (data != null && data.enabled) {
        if (baccarat.realPlayers[client.UID]) {
          client.red({
            notice: {
              title: NoticeMessage.notice,
              text: NoticeMessage.youOrOtherLoggedInToThisAccount(NoticeMessage.baccarat),
              load: false,
            },
          });
        } else {
          baccarat.realPlayers[client.UID] = client;
          client.red({ toGame: NoticeMessage.baccarat });
        }
      } else {
        client.red({
          notice: {
            title: NoticeMessage.notice,
            text: data.disabled_message,
            load: false,
          },
        });
      }
    })
    .catch((error) => logger.logError(error));
};

module.exports = {
  removeOutRoomUser,
  registerBaccarat,
};
