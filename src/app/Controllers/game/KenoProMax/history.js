const KenoProMaxCuoc = require("../../../Models/KenoProMax/KenoProMax_cuoc");
const KenoProMaxPhien = require("../../../Models/KenoProMax/KenoProMax_phien");
const Logger = require("../../../web/logger");

const queryHistory = async (realPlayer, page, pageSize) => {
  const filter = { uid: realPlayer.UID, thanhtoan: true };
  const numberOfSkippedBets = (page - 1) * pageSize;
  const total = await KenoProMaxCuoc.countDocuments(filter).exec();
  const bets = await KenoProMaxCuoc.find(
    filter,
    {
      _id: false,
      uid: false,
      thanhtoan: false,
      siteId: false,
      memberId: false,
      __v: false,
      __archive: false,
    },
    { sort: { _id: -1 }, skip: numberOfSkippedBets, limit: pageSize }
  )
    .lean()
    .exec();
  let betLogs = [];

  if (bets && bets.length > 0) {
    betLogs = await Promise.all(
      bets.map(async (bet) => {
        const round = await KenoProMaxPhien.findOne({ id: bet.phien }).lean().exec();

        return { ...bet, result: round.result, settlementResult: round.settlementResult };
      })
    );
  }

  realPlayer.red({
    kenoProMax: {
      history: {
        betLogs,
        page,
        pageSize,
        total,
      },
    },
  });
};

module.exports = (realPlayer, data) => {
  if (!!data.page) {
    const page = data.page >> 0;
    const pageSize = 8;

    if (page < 1) {
      return;
    }

    queryHistory(realPlayer, page, pageSize).catch(Logger.logError);
  }
};
