const moment = require("moment");
const momentTz = require("moment-timezone");

const GameConstants = require("./constants");

const notInBreakTime = () => {
  const time = moment(Date.now());
  const firstEnd = firstRoundEndTime(time);
  const lastEnd = lastRoundEndTime(time);

  const isAfter = time.isAfter(lastEnd);
  const isBefore = time.isBefore(firstEnd);

  return !isAfter && !isBefore;
};

const convertToGmt7 = (dateTimeUtc) => {
  return moment(dateTimeUtc).tz("Asia/Ho_Chi_Minh", false);
}

const firstRoundEndTime = (nowUtc) => {  
  return moment(convertToGmt7(nowUtc)).hours(6).minutes(10).seconds(0).milliseconds(0).utc();
};

const lastRoundEndTime = (nowUtc) => {
  return moment(convertToGmt7(nowUtc)).hours(21).minutes(55).seconds(0).milliseconds(0).utc();
};

const generateRoundEndTime = (roundId, currentRoundId, currentRoundEndTime) => {
  const lastRound = lastRoundEndTime(currentRoundEndTime);
  const remainingRoundEndMinutes = (roundId - currentRoundId) * GameConstants.durations.wholeRoundMinutes;

  let time = moment.utc(currentRoundEndTime).add(remainingRoundEndMinutes, "minutes");

  if (time.isAfter(lastRound)) {
    time.add(GameConstants.breakMinutes, "minutes");
  }

  return time.toDate();
};

module.exports = {
  firstRoundEndTime: firstRoundEndTime,
  lastRoundEndTime: lastRoundEndTime,
  notInBreakTime: notInBreakTime,
  generateRoundEndTime: generateRoundEndTime,
};
