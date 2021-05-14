const KenoProVietPhien = require("./models/KenoProViet_phien");

const settleBets = require("./settle-bets");
const { resetNewRoundAndCleanPreviousRound } = require("./cron/run-game");
const Logger = require("./../../../../web/logger");

const settleRound = async (io, finish) => {
  const kenoProVietData = io.kenoProViet;

  if (finish.roundId == kenoProVietData.roundId) {
    io.kenoProViet.finished = true;
    io.kenoProViet.finishedRound = finish;
  } else {
    const round = await KenoProVietPhien.findOne({ id: finish.roundId }, "id settled").lean().exec();

    if (round.settled) return;

    await settleBets(io, finish);

    if (finish.roundId > kenoProVietData.roundId) {
      await resetNewRoundAndCleanPreviousRound(io);
    }
  }
};

module.exports = (io, finish) =>
  settleRound(io, finish).catch((err) => {
    Logger.logError(err);
  });
