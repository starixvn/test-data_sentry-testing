const Logger = require("./../../../../web/logger");

const betModels = require("./models/bet-models");
const KenoProVietOne = betModels.KenoProViet_one;
const KenoProVietCuoc = betModels.KenoProViet_cuoc;
const KenoProVietPhien = require("./models/KenoProViet_phien");

const queryHistory = async (player, page, pageSize) => {
  const filter = { uid: player.UID };
  const numberOfSkippedOnes = (page - 1) * pageSize;
  const total = await KenoProVietOne.countDocuments(filter).exec();
  const roundProjection = { _id: false, time: false, __v: false, __archive: false };

  const onesProjection = {
    _id: false,
    uid: false,
    siteId: false,
    memberId: false,
    __v: false,
    __archive: false,
  };

  const betProjection = {
    _id: false,
    memberId: false,
    siteId: false,
    __v: false,
    __archive: false,
  };

  const ones = await KenoProVietOne.find(filter, onesProjection, {
    sort: { thanhtoan: 1, phien: -1, _id: -1 },
    skip: numberOfSkippedOnes,
    limit: pageSize,
  })
    .lean()
    .exec();

  const roundIds = ones.map((one) => one.phien);

  const bets = await KenoProVietCuoc.find({ uid: player.UID, phien: { $in: roundIds } }, betProjection, { sort: { _id: -1 } })
    .lean()
    .exec();

  const rounds = await KenoProVietPhien.find({ id: { $in: roundIds } }, roundProjection)
    .lean()
    .exec();

  let betLogs = [];

  if (ones && ones.length > 0) {
    betLogs = ones.map((one) => {
      const round = rounds.find((r) => r.id === one.phien);

      return {
        ...one,
        settlementResult: round ? round.settlementResult : null,
        result: round ? round.result : null,
        betLogDetails: bets.filter((bet) => bet.phien === one.phien),
      };
    });
  }

  player.red({ kenoProViet: { history: { betLogs, page, pageSize, total } } });
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
