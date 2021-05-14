const joinRoom = require('./join-room');
const leaveRoom = require('./leave-room');
const placeBet = require('./place-bet');
const userHistory = require('./user-history');
const logger = require('./../../../web/logger');
const ConfigHelper = require('../../../Helpers/ConfigHelper');
const { checkGamePermission } = require('../../game-permission-check');
const { baccarat } = require("../../../../config/appConfigs").gameIds;

module.exports = (client, data) => {
  try {
    const configs = ConfigHelper.getConfigs(ConfigHelper.GameTypes.Baccarat);
  
    if (!checkGamePermission(client, configs, baccarat)) {
      return;
    }

    if (!!data.ingame) {
      joinRoom(client);
    }
  
    if (!!data.outgame) {
      leaveRoom(client);
    }
  
    if (!!data.bet) {
      placeBet(client, data.bet);
    }
  
    if (!!data.log) {
      userHistory(client, data.log);
    }
  } catch (error) {
    logger.logError(error);
  }
}