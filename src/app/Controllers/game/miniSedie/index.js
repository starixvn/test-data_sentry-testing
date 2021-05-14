const getTime = require("./get-time");
const placeBet = require("./place-bet");
const getLogs = require("./get-logs");
const getHistory = require("./get-history");
const ConfigHelper = require("../../../Helpers/ConfigHelper");
const { checkGamePermission } = require("../../game-permission-check");
const { minisedie } = require("../../../../config/appConfigs").gameIds;

module.exports = (player, payload) => {
  const configs = ConfigHelper.getConfigs(ConfigHelper.GameTypes.MiniSedie);

  if (!checkGamePermission(player, configs, minisedie)) {
    return false;
  }

  if (payload.view) {
    player.gameEvent.viewMiniSedie = !!payload.view;
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
};
