const config = require('../../../../../config/appConfigs');
const BaccaratPhien = require('../../../../Models/Baccarat/baccarat-phien');
const Logger = require('./../../../../web/logger');

module.exports = (client, data) => {
  if (data.view != null) {
    client.gameEvent.viewBaccarat = data.view;
  }

  if (data.sync != null) {
    BaccaratPhien.findOne({}, ['id', 'player', 'banker', 'result'], { sort: { 'id': -1 } }, (err, round) => {
      try {
        const baccarat = client.redT.game.baccarat;
        const { remainingTime, roundId } = baccarat;
        const { player, banker, result: settlementResult } = round;

        client.red({
          baccarat: {
            remainingTime,
            roundId,
            settlementResult,
            result: {
              playerCards: Object.values(player),
              bankerCards: Object.values(banker)
            }
          }
        });
      } catch (error) {
        Logger.logError(error);
      }
    });
  }

  if (data.setResult != null && config.env !== 'PRO') {
    client.redT.game.baccarat.settlementResultFromAdmin = data.setResult;
  }
}