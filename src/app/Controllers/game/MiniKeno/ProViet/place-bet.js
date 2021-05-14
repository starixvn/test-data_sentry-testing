const moment = require("moment");

const ConfigHelper = require("./../../../../Helpers/ConfigHelper");
const NoticeMessages = require("./../../constants/notice-messages");
const GameConstants = require("./constants");
const BaseConstants = require("./../constants");
const RoundTimeHelper = require("./round-time-helpers");

const GameIds = require("./../../../../../config/appConfigs").gameIds;

const BalanceApi = require("./../../../../apis/balanceApi");
const BetChoiceMapper = require("./../../../../apis/betChoiceMapper");
const Logger = require("./../../../../web/logger");

const { KenoProViet_cuoc, KenoProViet_one } = require("./models/bet-models");

const validateBetRequest = (player, { amount, betChoice, roundId }) => {
  if (!amount || !betChoice || !roundId) {
    return false;
  }

  const kenoProVietData = player.redT.kenoProViet;
  const configs = ConfigHelper.getConfigs(ConfigHelper.GameTypes.KenoProViet);

  const playerName = player.profile.name;
  const existBets = kenoProVietData.ingame[roundId] && kenoProVietData.ingame[roundId][playerName];

  const { betTracks } = existBets || { betTracks: {} };

  const totalAmount = BaseConstants.choices.reduce((total, choice) => total + (betTracks[choice] || 0), 0) + amount;

  const maxBetPerChoice = configs.choices_maxbet[betChoice];
  const remainingTimeNextRounds = generateRoundRemainingTime(roundId, kenoProVietData.roundId, kenoProVietData.roundEndTime);

  const criteria = [
    {
      failure: roundId < kenoProVietData.roundId,
      notice: NoticeMessages.cannotPlaceBet,
    },
    {
      failure:
        (roundId <= kenoProVietData.roundId + GameConstants.maxRoundsToBet &&
          remainingTimeNextRounds < GameConstants.durations.lockingBets) ||
        roundId > kenoProVietData.roundId + GameConstants.maxRoundsToBet,
      notice: NoticeMessages.cannotPlaceBet,
    },
    {
      failure: !configs.enabled,
      notice: NoticeMessages.cannotPlaceBet,
    },
    {
      failure: kenoProVietData.roundId === roundId && kenoProVietData.remainingTime <= GameConstants.durations.lockingBets,
      notice: NoticeMessages.placeBetNextRound,
    },
    {
      failure: amount > maxBetPerChoice || betTracks[betChoice] + amount > maxBetPerChoice,
      notice: NoticeMessages.maxBetForChoice(maxBetPerChoice),
    },
    {
      failure: amount < configs.minbet,
      notice: NoticeMessages.minBet(configs.minbet),
    },
    {
      failure: amount > configs.maxbet,
      notice: NoticeMessages.maxBet(configs.maxbet),
    },
    {
      failure: totalAmount > configs.maxbet,
      notice: NoticeMessages.maxBet(configs.maxbet),
    },
  ];

  const failedCriterion = criteria.find((criterion) => criterion.failure);

  if (failedCriterion) {
    player.red({ kenoProViet: { notice: failedCriterion.notice, endBet: -1 } });

    return false;
  }

  return true;
};

const generateRoundRemainingTime = (roundId, currentRoundId, currentRoundEndTime) => {
  const now = moment(Date.now());
  const endRoundTime = moment(RoundTimeHelper.generateRoundEndTime(roundId, currentRoundId, currentRoundEndTime));
  const duration = moment.duration(endRoundTime.diff(now));
  const remainingTime = duration.get("hours") * 3600 + duration.get("minutes") * 60 + duration.get("seconds");

  return remainingTime;
};

const handleSuccessBet = async (player, kenoProVietData, red, betChoice, amount, roundId) => {
  const existingBetFilter = { uid: player.UID, phien: roundId };
  const existingBet = await KenoProViet_one.findOne(existingBetFilter).exec();
  const configs = ConfigHelper.getConfigs(ConfigHelper.GameTypes.KenoProViet);

  if (existingBet) {
    existingBet[betChoice] += amount;
    await existingBet.save();
  } else {
    const newBet = {
      uid: player.UID,
      name: player.profile.name,
      phien: roundId,
      time: new Date(),
      odds: configs.odds,
    };
    const existingBetIncrement = { [betChoice]: amount };

    if (player.session) {
      newBet.memberId = player.session.memberId;
      newBet.siteId = player.session.siteId;
    }

    await KenoProViet_one.updateOne(
      existingBetFilter,
      { $inc: existingBetIncrement, $setOnInsert: newBet },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }

  await insertBetLog(player, roundId, betChoice, amount);

  notifyPlacingBetResult(player, kenoProVietData, red, betChoice, amount, roundId);
};

const insertBetLog = async (player, roundId, betChoice, amount) => {
  const newBetLog = {
    uid: player.UID,
    name: player.profile.name,
    phien: roundId,
    time: new Date(),
    choice: betChoice,
    amount,
  };

  if (player.session) {
    newBetLog.memberId = player.session.memberId;
    newBetLog.siteId = player.session.siteId;
  }

  await KenoProViet_cuoc.create(newBetLog);
};

const handleFailedBet = (player, kenoProVietData, betChoice, amount, roundId) => {
  const name = player.profile.name;

  if (kenoProVietData.ingame && kenoProVietData.ingame[roundId]) {
    const playerInGame = kenoProVietData.ingame[roundId][name];

    playerInGame.betTracks[betChoice] -= amount;
  }

  player.red({ kenoProViet: { endBet: -1 } });
};

const notifyPlacingBetResult = (player, kenoProVietData, red, betChoice, amount, roundId) => {
  const name = player.profile.name;

  if (kenoProVietData.ingame && kenoProVietData.ingame[roundId][name]) {
    const playerInGame = kenoProVietData.ingame[roundId][name];
    const ownBets = playerInGame.betTracks;

    if (player.redT && player.redT.users) {
      player.redT.users[player.UID].forEach((player) => {
        player.red({
          kenoProViet: { endBet: amount, ownBets, roundId },
          user: { red },
        });
      });
    }
  }
};

const proceedBet = (player, payload) =>
  new Promise((resolve, reject) => {
    if (!player.redT || !player.redT.kenoProViet) {
      return;
    }

    const kenoProVietData = player.redT.kenoProViet;
    const amount = payload.amount >> 0;
    const betChoice = payload.betChoice;
    const roundId = payload.roundId;
    const betInfo = {
      gameId: GameIds.kenoproviet,
      gameRoundId: payload.roundId,
      choiceId: BetChoiceMapper.convertKeno(betChoice),
      cuoc: amount,
      inSufficientBalance: { kenoProViet: { notice: NoticeMessages.notEnoughMoney, endBet: -1 } },
      roundEndTime: RoundTimeHelper.generateRoundEndTime(payload.roundId, kenoProVietData.roundId, kenoProVietData.roundEndTime),
    };

    const handleSuccessBetSync = ({ red }) =>
      handleSuccessBet(player, kenoProVietData, red, betChoice, amount, roundId).then(resolve).catch(reject);
    const handleFailedBetSync = () => {
      handleFailedBet(player, kenoProVietData, betChoice, amount, roundId);
      resolve();
    };

    BalanceApi.placeBet({ id: player.UID }, betInfo, player, handleSuccessBetSync, handleFailedBetSync);
  });

const initBetTrack = (betChoice, amount) => {
  let betTracks = { ...BaseConstants.defaultBetTracks };
  betTracks[betChoice] = amount;

  return betTracks;
};

const placeBet = (player, payload) => {
  try {
    if (validateBetRequest(player, payload)) {
      const amount = payload.amount >> 0;
      const betChoice = payload.betChoice;
      const roundId = payload.roundId;

      const name = player.profile.name;
      const kenoProVietData = player.redT.kenoProViet;

      if (kenoProVietData.ingame[roundId]) {
        if (kenoProVietData.ingame[roundId][name]) {
          const playerBets = kenoProVietData.ingame[roundId][name].betTracks;
          playerBets[betChoice] += amount;
        } else {
          kenoProVietData.ingame[roundId][name] = initPlayerBetTracks(name, betChoice, amount);
        }
      } else {
        kenoProVietData.ingame[roundId] = {};
        kenoProVietData.ingame[roundId][name] = initPlayerBetTracks(name, betChoice, amount);
      }

      proceedBet(player, payload).catch((err) => {
        Logger.logError(err);
      });
    }
  } catch (err) {
    Logger.logError(err);
  }
};

const initPlayerBetTracks = (name, betChoice, amount) => {
  const betTracks = initBetTrack(betChoice, amount);
  const newPlayer = {
    name: name,
    betTracks: betTracks,
  };

  return newPlayer;
};

module.exports = placeBet;
