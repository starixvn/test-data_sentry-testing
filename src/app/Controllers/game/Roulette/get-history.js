const Logger = require("./../../../web/logger");

const RoulettePhien = require("./Models/Roulette_phien");
const RouletteOne = require("./Models/Roulette_one").RouletteOne;
const RouletteCuoc = require("./Models/Roulette_cuoc");

const queryHistory = async (player, page, pageSize) => {
  const filter = { uid: player.UID, thanhtoan: true };
  const numberOfSkippedBets = (page - 1) * pageSize;
  const total = await RouletteOne.countDocuments(filter).exec();
  const betProjection = {
    _id: false,
    uid: false,
    thanhtoan: false,
    odds: false,
    siteId: false,
    memberId: false,
    __v: false,
    __archive: false,
  };
  const betLogDetailsProjection = {
    _id: false,
    uid: false,
    phien: false,
    memberId: false,
    siteId: false,
    __v: false,
  };
  const bets = await RouletteOne.find(filter, betProjection, { sort: { _id: -1 }, skip: numberOfSkippedBets, limit: pageSize })
    .lean()
    .exec();
  let betLogs = [];

  if (bets && bets.length > 0) {
    betLogs = await Promise.all(
      bets.map(async (bet) => {
        const betLogDetailsFilter = {
          phien: bet.phien,
          uid: player.UID,
        };
        const round = await RoulettePhien.findOne({ id: bet.phien }, { _id: false, result: true, settlementResult: true }).lean().exec();
        const betLogDetails = await RouletteCuoc.find(betLogDetailsFilter, betLogDetailsProjection, { sort: { _id: -1 } })
          .lean()
          .exec();

        return {
          ...bet,
          result: round.result,
          settlementResult: round.settlementResult,
          betLogDetails,
        };
      })
    );
  }

  player.red({
    roulette: {
      history: {
        betLogs,
        page,
        pageSize,
        total,
      },
    },
  });
};

module.exports = (player, payload) => {
  if (payload.page) {
    const page = payload.page >> 0;
    const pageSize = 8;

    if (page < 1) {
      return;
    }

    queryHistory(player, page, pageSize).catch(Logger.logError);
  }
};
