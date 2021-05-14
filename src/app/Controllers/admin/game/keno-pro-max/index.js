const config = require('../../../../../config/appConfigs');
const Logger = require('./../../../../web/logger');
const KenoProMaxPhien = require('./../../../../Models/KenoProMax/KenoProMax_phien');

module.exports = (client, data) => {
  if (data.view != null) {
    client.gameEvent.viewKenoProMax = data.view;
  }

  if (data.sync != null) {
    KenoProMaxPhien.findOne({}, ['id', 'result', 'settlementResult'], { sort: { 'id': -1 } }, (err, round) => {
      try {
        const kenoProMax = client.redT.kenoProMax;
        const { remainingTime, roundId } = kenoProMax;
        const { result, settlementResult } = round;

        client.red({ kenoProMax: { remainingTime, roundId, result, settlementResult } });
      } catch (error) {
        Logger.logError(error);
      }
    });
  }

  if (data.setResult != null && config.env !== 'PRO') {
    client.redT.kenoProMax.settlementResultFromAdmin = data.setResult;
  }
}