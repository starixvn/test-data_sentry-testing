const inGame = require("./inGame");
const outGame = require("./outGame");
const placeBet = require("./placeBet");
const history = require("./history");
const ConfigHelper = require("../../../Helpers/ConfigHelper");
const { checkGamePermission } = require("../../game-permission-check");
const { kenopromax } = require("../../../../config/appConfigs").gameIds;

module.exports = (realPlayer, data) => {
  const configs = ConfigHelper.getConfigs(ConfigHelper.GameTypes.KenoProMax);

  if (!checkGamePermission(realPlayer, configs, kenopromax)) {
    return;
  }

  if (!!data.ingame) {
    inGame(realPlayer);
  }

  if (!!data.outgame) {
    outGame(realPlayer);
  }

  if (!!data.bet) {
    placeBet(realPlayer, data.bet);
  }

  if (!!data.viewlogs) {
    history(realPlayer, data.viewlogs);
  }
};
