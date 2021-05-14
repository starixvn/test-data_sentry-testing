const KenoProVietPhien = require("./../models/KenoProViet_phien");
const KenoProVietOne = require("./../models/bet-models").KenoProViet_one;
const Constants = require("./../../constants");
const Logger = require("./../../../../../web/logger");
const getBetableRounds = require("../get-rounds").getBetableRounds;
const { runGame } = require("./run-game");

async function getIngameData() {
  const ingame = {};

  const rounds = await getBetableRounds();
  const roundIds = rounds.map((r) => r.id);
  const onesProjection = {
    _id: false,
    uid: false,
    thanhtoan: false,
    betwin: false,
    time: false,
    odds: false,
    siteId: false,
    memberId: false,
    __v: false,
    __archive: false,
  };

  const ones = await KenoProVietOne.find({ phien: { $in: roundIds } }, onesProjection)
    .lean()
    .exec();

  roundIds.forEach((roundId) => {
    const onesInRound = ones.filter((x) => x.phien === roundId);
    ingame[roundId] = {};
    onesInRound.forEach((one) => {
      ingame[roundId][one.name] = {
        betTracks: one,
      };
    });
  });

  return ingame;
}

module.exports = function (inIO) {
  const io = inIO;

  io.kenoProViet = {
    remainingTime: 0,
    ingame: {},
    totalBets: { ...Constants.defaultBetTracks },
    disabled: false,
  };

  KenoProVietPhien.findOne({}, "id time", { sort: { _id: -1 } })
    .lean()
    .then((lastRound) => {
      if (!!lastRound) {
        io.kenoProViet.roundId = lastRound.id;
        io.kenoProViet.roundEndTime = lastRound.time;

        runGame(io);
      } else {
        Logger.logCritical("Not found latest round of Vietlott");
      }
    });

  getIngameData()
    .then((ingame) => {
      io.kenoProViet.ingame = ingame;
    })
    .catch((err) => Logger.logError(err));
};
