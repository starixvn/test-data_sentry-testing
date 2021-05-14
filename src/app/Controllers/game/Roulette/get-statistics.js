const Logger = require("./../../../web/logger");

const RoulettePhien = require("./Models/Roulette_phien");

const getStatistics = async (player) => {
  const numberOfAcquiredRounds = 300;
  const latestRounds = await RoulettePhien.find({}, "-_id result", { sort: { id: -1 }, limit: numberOfAcquiredRounds })
    .lean()
    .exec();
  const latestResults = latestRounds.map((round) => round.result);

  player.red({ roulette: { statistics: { latestResults } } });
};

module.exports = (player) => getStatistics(player).catch(Logger.logError);
