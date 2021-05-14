const ConfigHelper = require("../../../Helpers/ConfigHelper");

const NoticeMessages = require("./../constants/notice-messages");

module.exports = (realPlayer) => {
  const rouletteData = realPlayer.redT.roulette;
  const configs = ConfigHelper.getConfigs(ConfigHelper.GameTypes.Roulette);
  const configuredlyDisabled = !configs || !configs.enabled;
  const disabled = configuredlyDisabled || rouletteData.delayStartTime > 0;

  if (!disabled) {
    if (rouletteData.realPlayers[realPlayer.UID]) {
      realPlayer.red({
        notice: {
          title: NoticeMessages.notice,
          text: NoticeMessages.youOrOtherLoggedInToThisAccount("Roulette"),
          load: false,
        },
      });
    } else {
      rouletteData.realPlayers[realPlayer.UID] = realPlayer;
      realPlayer.red({ toGame: "Roulette" });
    }
  } else {
    const disabledMessage = configs?.disabled_message ?? "";

    realPlayer.red({
      notice: { title: NoticeMessages.notice, text: disabledMessage, load: false },
    });
  }
};
