const inGame = require("./in-game");
const outGame = require("./out-game");
const { placeBet } = require("./place-bet");
const getHistory = require("./get-history");
const getStatistics = require("./get-statistics");
const ConfigHelper = require("../../../Helpers/ConfigHelper");
const { checkGamePermission } = require("../../game-permission-check");
const { roulette } = require("../../../../config/appConfigs").gameIds;

module.exports = (realPlayer, data) => {
  const configs = ConfigHelper.getConfigs(ConfigHelper.GameTypes.Roulette);

  if (!checkGamePermission(realPlayer, configs, roulette)) {
    return;
  }

  if (data.ingame) {
    inGame(realPlayer);
  }

  if (data.outgame) {
    outGame(realPlayer);
  }

  if (data.bet) {
    placeBet(realPlayer, data.bet);
  }

  if (data.getHistory) {
    getHistory(realPlayer, data.getHistory);
  }

  if (data.getStatistics) {
    getStatistics(realPlayer);
  }
};
