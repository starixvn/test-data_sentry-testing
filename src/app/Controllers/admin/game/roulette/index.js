const RoulettePhien = require("./../../../game/Roulette/Models/Roulette_phien");
const { logError } = require("./../../../../web/logger");
const config = require("./../../../../../config/appConfigs");

module.exports = (client, data) => {
  if (data.view) {
    client.gameEvent.viewRoulette = true;
  }

  if (data.sync) {
    RoulettePhien.findOne({}, ["id", "result"], { sort: { id: -1 } }, (err, lastRound) => {
      try {
        const roulette = client.redT.roulette;
        client.red({
          roulette: {
            roundId: lastRound.id + 1,
            remainingTime: roulette.remainingTime,
            result: lastRound.result,
          },
        });
      } catch (error) {
        logError(error);
      }
    });
  }

  if (data.setResult != null && config.env !== "PRO") {
    client.redT.roulette.settlementResultFromAdmin = data.setResult;
  }
};
