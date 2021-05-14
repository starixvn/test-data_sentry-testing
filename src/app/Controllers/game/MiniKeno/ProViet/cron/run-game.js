const CronJob = require("cron").CronJob;
const moment = require("moment");

const KenoProVietPhien = require("./../models/KenoProViet_phien");
const GameConfigs = require("./../../../../../Models/GameConfig/GameConfigs");
const Logger = require("./../../../../../web/logger");
const ConfigHelper = require("./../../../../../Helpers/ConfigHelper");

const Constants = require("./../constants");
const settleBets = require("./../settle-bets");

const runGame = (inIO) => {
  const io = inIO;
  const kenoProVietData = io.kenoProViet || {};

  kenoProVietData.remainingTime = getRemainingTime(kenoProVietData.roundEndTime);
  kenoProVietData.disabled = false;

  const job = new CronJob(
    "* * * * * *",
    () => proceed(io, kenoProVietData).catch(Logger.logError),
    () => {
      Logger.logError("kenoProViet unexpectedly stopped because the calculated time of the next interval was negative.");
      job.start();
    },
    true
  );
};

const getRemainingTime = (roundEndTime) => {
  const now = moment.now();
  const endRound = moment(roundEndTime);
  const duration = moment.duration(endRound.diff(now));
  const durationInSeconds = duration.get("hours") * 3600 + duration.get("minutes") * 60 + duration.get("seconds");

  if (durationInSeconds < 0) {
    Logger.logError(`ProViet remaining time is negative. RoundEndTime ${roundEndTime} remainingTime ${durationInSeconds}`);
  }

  return durationInSeconds;
};

const proceed = async (io, kenoProVietData) => {
  if (kenoProVietData.remainingTime % Constants.durations.checkingStatus === 0 || kenoProVietData.disabled) {
    await checkGameStatus(io);
  }

  if (kenoProVietData.remainingTime > 0) {
    kenoProVietData.remainingTime--;
  }

  if (kenoProVietData.finished) {
    kenoProVietData.remainingTime = 0;

    await settleBets(io, kenoProVietData.finishedRound);
    await resetForNewRound(kenoProVietData);
  } else if (kenoProVietData.remainingTime > Constants.durations.lockingBets) {
    pushRunningRoundInfoToAllRealPlayers(io);
  }
};

const checkGameStatus = async (io) => {
  const kenoProVietData = io.kenoProViet || {};
  const config = await GameConfigs.findOne({ name: ConfigHelper.GameTypes.KenoProViet }).lean().exec();
  const configuredlyDisabled = !config || !config.enabled;
  const previouslyDisabled = kenoProVietData.disabled;

  ConfigHelper.updateConfig(ConfigHelper.GameTypes.KenoProViet, config);

  if (kenoProVietData.disabled) {
    if (kenoProVietData.delayStartTime > 0) {
      kenoProVietData.delayStartTime--;
    } else if (!configuredlyDisabled) {
      kenoProVietData.delayStartTime = config && config.delayStartTime ? config.delayStartTime : 0;
    }
  }

  kenoProVietData.disabled = configuredlyDisabled || kenoProVietData.delayStartTime > 0;

  if (kenoProVietData.disabled) {
    const disabledMessage = config ? config.disabled_message : "";

    io.sendAllUser({ kenoProViet: { um: true, um_message: disabledMessage } });

    if (!previouslyDisabled) {
      await GameConfigs.updateOne({ name: ConfigHelper.GameTypes.KenoProViet }, { disabledround: kenoProVietData.roundId });
    }
  } else if (previouslyDisabled) {
    await getAndUpdateNewRound(kenoProVietData);

    io.sendAllUser({
      kenoProViet: {
        roundId: kenoProVietData.roundId,
        remainingTime: kenoProVietData.remainingTime,
        gameConfigs: {
          minbet: config.minbet,
          maxbet: config.maxbet,
          choices_maxbet: config.choices_maxbet,
          odds: config.odds,
        },
        um: false,
      },
    });
  } else {
    io.sendAllUser({ kenoProViet: { remainingTime: kenoProVietData.remainingTime, um: kenoProVietData.disabled } });
  }
};

const resetForNewRound = async (kenoProVietData) => {
  delete kenoProVietData.ingame[kenoProVietData.roundId];

  await getAndUpdateNewRound(kenoProVietData);

  //reset data received from Admin2
  kenoProVietData.finished = false;
  kenoProVietData.finishedRound = {};
};

const getAndUpdateNewRound = async (kenoProVietData) => {
  const nextRound = await KenoProVietPhien.findOne({}, "id time", { sort: { _id: -1 } })
    .lean()
    .exec();

  kenoProVietData.roundId = nextRound.id;
  kenoProVietData.roundEndTime = nextRound.time;
  kenoProVietData.remainingTime = getRemainingTime(nextRound.time);
};

const pushRunningRoundInfoToAllRealPlayers = (io) => {
  const kenoProVietData = io.kenoProViet || {};
  const adminData = {
    kenoProViet: {
      ingame: kenoProVietData.ingame,
    },
  };

  Object.values(io.admins).forEach((admin) => {
    admin.forEach((client) => {
      if (client.gameEvent && client.gameEvent.viewkenoProViet) {
        client.red(adminData);
      }
    });
  });
};

const resetNewRoundAndCleanPreviousRound = async (io) => {
  const kenoProVietData = io.kenoProViet;
  const nextRound = await KenoProVietPhien.findOne({}, "id time", { sort: { id: -1 } })
    .lean()
    .exec();

  kenoProVietData.roundId = nextRound.id;
  kenoProVietData.roundEndTime = nextRound.time;

  // delete betTracks of previous rounds
  Object.keys(kenoProVietData.ingame).forEach((roundId) => {
    if (roundId < kenoProVietData.roundId) {
      delete kenoProVietData.ingame[roundId];
    }
  });

  //reset data received from Admin2
  kenoProVietData.finished = false;
  kenoProVietData.finishedRound = {};
  kenoProVietData.remainingTime = getRemainingTime(kenoProVietData.roundEndTime);
};

module.exports = {
  runGame,
  resetNewRoundAndCleanPreviousRound,
};
