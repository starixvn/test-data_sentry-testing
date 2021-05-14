const Logger = require("./../../../web/logger");
const ConfigHelper = require("./../../../Helpers/ConfigHelper");

const MiniSediePhien = require("./models/MiniSedie_phien");

const getRounds = async (limit) => {
  const rounds = await MiniSediePhien.find({}, { _id: false, __v: false, time: false }, { sort: { _id: -1 }, limit: limit })
    .lean()
    .exec();

  return rounds.map((round) => ({
    roundId: round.id,
    settlementResult: round.settlementResult,
    result: {
      red1: round.red1,
      red2: round.red2,
      red3: round.red3,
      red4: round.red4,
    },
  }));
};

const getLogs = async (player) => {
  if (!player.redT) {
    return;
  }

  const maxNumberOfRounds = 100;
  const miniSedieConfigs = ConfigHelper.getConfigs(ConfigHelper.GameTypes.MiniSedie);
  const gameConfigs = {
    minbet: miniSedieConfigs.minbet,
    maxbet: miniSedieConfigs.maxbet,
    choices_maxbet: miniSedieConfigs.choices_maxbet,
    odds: miniSedieConfigs.odds,
  };
  const { betTracks: ownBets } = player.redT.miniSedie.ingame[player.profile.name] || { betTracks: {} };
  const roundHistory = await getRounds(maxNumberOfRounds);

  player.red({ miniSedie: { gameConfigs, ownBets, roundHistory } });
};

module.exports = (player) => getLogs(player).catch(Logger.logError);
