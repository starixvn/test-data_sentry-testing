const Logger = require("./../../../../web/logger");
const moment = require("moment");
const constants = require("./constants");
const KenoProVietPhien = require("./models/KenoProViet_phien");
const KenoProVietOne = require("./models/bet-models").KenoProViet_one;

function calculateNextRoundTime(time) {
  const endOfUtcDayTime = moment.utc(time).hours(14).minutes(55).seconds(0).milliseconds(0);
  const startOfUtcDayTime = moment.utc(time).hours(23).minutes(0).seconds(0).milliseconds(0);
  let nextRoundTime = moment.utc(time).add(10, "minutes");

  if (nextRoundTime.isAfter(endOfUtcDayTime) && nextRoundTime.isBefore(startOfUtcDayTime)) {
    nextRoundTime.hours(23).minutes(10).seconds(0).milliseconds(0);
  }

  return nextRoundTime;
}

async function getBetableRounds() {
  const latestRound = await KenoProVietPhien.findOne({}, {}, { sort: { id: -1 } })
    .lean()
    .exec();

  const rounds = [];
  let id = latestRound.id;
  let time = moment.utc(latestRound.time);

  if (latestRound.result) {
    time = calculateNextRoundTime(time);
    id++;
  }

  for (let i = 0; i < constants.maxRoundsToBet; i++) {
    rounds.push({ id, time: time.format() });
    time = calculateNextRoundTime(time);
    id++;
  }

  return rounds;
}

const getRounds = async (player) => {
  const rounds = await getBetableRounds();

  const roundIds = rounds.map((r) => r.id);
  const bets = await KenoProVietOne.find({ phien: { $in: roundIds }, uid: player.UID }, { phien: true })
    .lean()
    .exec();

  for (let i = 0; i < rounds.length; i++) {
    rounds[i].hasBet = bets.some((bet) => bet.phien === rounds[i].id);
  }

  player.red({ kenoProViet: { rounds } });
};

module.exports = {
  getRounds: (player) => getRounds(player).catch(Logger.logError),
  getBetableRounds: () => getBetableRounds().catch(Logger.logError),
};
