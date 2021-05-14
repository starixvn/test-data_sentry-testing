const getTime = require("./get-time");
const placeBet = require("./place-bet");
const getLogs = require("./get-logs");
const getHistory = require("./get-history");
const getRounds = require("./get-rounds").getRounds;
const getPlayerBets = require("./get-player-bets");
const getGameConfigs = require("./get-game-configs");
const { checkGamePermission } = require("../../../game-permission-check");
const ConfigHelper = require("../../../../Helpers/ConfigHelper");
const { kenoproviet } = require("../../../../../config/appConfigs").gameIds;

module.exports = function (player, payload) {

  const configs = ConfigHelper.getConfigs(ConfigHelper.GameTypes.KenoProViet);

  if (!checkGamePermission(player, configs, kenoproviet)) {
    return;
  }

  if (payload.view) {
    player.gameEvent.viewKenoProViet = !!payload.view;
  }

  if (!!payload.get_time) {
    getTime(player);
  }

  if (!!payload.bet) {
    placeBet(player, payload.bet);
  }

  if (!!payload.getLogs) {
    getLogs(player);
  }

  if (!!payload.getHistory) {
    getHistory(player, payload.getHistory);
  }

  if (!!payload.getRounds) {
    getRounds(player);
  }

  if (!!payload.getPlayerBets) {
    getPlayerBets(player, payload.roundId);
  }

  if (!!payload.getGameConfigs) {
    getGameConfigs(player);
  }
};
