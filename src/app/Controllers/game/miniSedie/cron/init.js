const MiniSediePhien = require("./../models/MiniSedie_phien");
const Constants = require("./../constants");

const runGame = require("./run-game");

module.exports = (io) => {
  io.miniSedie = {
    roundId: 1,
    remainingTime: 0,
    ingame: {},
    totalBets: { ...Constants.resetTotalBets },
    disabled: false,
  };

  MiniSediePhien.findOne({}, "id", { sort: { _id: -1 } })
    .lean()
    .then((lastRound) => {
      if (!!lastRound) {
        io.miniSedie.roundId = lastRound.id + 1;
      }
    });

  runGame(io);
};
