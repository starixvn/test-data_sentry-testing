const Logger = require("./../../../web/logger");

const MiniSedieCuoc = require("./models/MiniSedie_cuoc");
const MiniSediePhien = require("./models/MiniSedie_phien");

const queryHistory = async (player, page, pageSize) => {
  const filter = { uid: player.UID, thanhtoan: true };
  const numberOfSkippedBets = (page - 1) * pageSize;
  const total = await MiniSedieCuoc.countDocuments(filter).exec();
  const roundProjection = { _id: false, time: false, __v: false, __archive: false };
  const betProjection = {
    _id: false,
    uid: false,
    thanhtoan: false,
    siteId: false,
    memberId: false,
    __v: false,
    __archive: false,
  };
  const bets = await MiniSedieCuoc.find(filter, betProjection, { sort: { _id: -1 }, skip: numberOfSkippedBets, limit: pageSize })
    .lean()
    .exec();
  let betLogs = [];

  if (bets && bets.length > 0) {
    betLogs = await Promise.all(
      bets.map(async (bet) => {
        const round = await MiniSediePhien.findOne({ id: bet.phien }, roundProjection).lean().exec();

        return {
          ...bet,
          settlementResult: round.settlementResult,
          result: {
            red1: round.red1,
            red2: round.red2,
            red3: round.red3,
            red4: round.red4,
          },
        };
      })
    );
  }

  player.red({ miniSedie: { history: { betLogs, page, pageSize, total } } });
};

module.exports = (player, payload) => {
  if (!!payload.page) {
    const page = payload.page >> 0;
    const pageSize = 8;

    if (page < 1) {
      return;
    }

    queryHistory(player, page, pageSize).catch(Logger.logError);
  }
};
