const Chance = require("chance");
const CronJob = require("cron").CronJob;

const GameIds = require("./../../../../config/appConfigs").gameIds;

const BalanceApi = require("./../../../apis/balanceApi");
const ConfigHelper = require("./../../../Helpers/ConfigHelper");
const GameConfigs = require("./../../../Models/GameConfig/GameConfigs");
const UserInfo = require("./../../../Models/UserInfo");
const Logger = require("./../../../web/logger");

const RoulettePhien = require("./Models/Roulette_phien");
const { RouletteOne, RouletteTmpOne } = require("./Models/Roulette_one");

const Constants = require("./constants");
const Bot = require("./bot");
const generateResult = require("./generate-ressult");

const runGame = (io) => {
  const job = new CronJob(
    "* * * * * *",
    () => proceed(io).catch(Logger.logError),
    () => {
      Logger.logError(
        `Roulette unexpectedly stopped at round #${io.roulette.roundId} because the calculated time of the next interval was negative.`
      );
      job.start();
    },
    true
  );
};

const proceed = async (io) => {
  const rouletteData = io.roulette;

  if (rouletteData.remainingTime === Constants.roundDuration) {
    await checkGameStatus(io);
  }

  if (!rouletteData.disabled) {
    rouletteData.remainingTime--;
  }

  if (rouletteData.remainingTime === Constants.placingBetDuration) {
    resetForNewRound(rouletteData);
    await Bot.reset(rouletteData);
  }

  if (rouletteData.remainingTime < 0) {
    await settleRound(io);
    rouletteData.remainingTime = Constants.roundDuration;
  } else if (rouletteData.remainingTime < Constants.placingBetDuration) {
    await Bot.run(rouletteData);
    pushRunningRoundInfoToAllRealPlayers(io);
  }
};

const checkGameStatus = async (io) => {
  const rouletteData = io.roulette;
  const rouletteConfigs = await GameConfigs.findOne({ name: ConfigHelper.GameTypes.Roulette });
  const previouslyDisabled = rouletteData.disabled;
  const configuredlyDisabled = !rouletteConfigs || !rouletteConfigs.enabled;

  ConfigHelper.updateConfig(ConfigHelper.GameTypes.Roulette, rouletteConfigs);

  if (rouletteData.disabled) {
    if (rouletteData.delayStartTime > 0) {
      rouletteData.delayStartTime--;
    } else if (!configuredlyDisabled) {
      rouletteData.delayStartTime = rouletteConfigs?.delayStartTime ?? 0;
    }
  }

  rouletteData.disabled = configuredlyDisabled || rouletteData.delayStartTime > 0;

  if (rouletteData.disabled) {
    const disabledMessage = rouletteConfigs?.disabled_message ?? "";
    const payload = { roulette: { um: true, um_message: disabledMessage } };

    rouletteData.remainingTime = Constants.roundDuration;

    io.sendAllUser(payload);
    io.sendAllAdmin(payload, Constants.viewName);

    if (!previouslyDisabled) {
      await GameConfigs.updateOne({ name: ConfigHelper.GameTypes.Roulette }, { disabledround: rouletteConfigs.roundId });
    }
  } else if (previouslyDisabled) {
    const gameConfigs = {
      minbet: rouletteConfigs.minbet,
      maxbet: rouletteConfigs.maxbet,
      choices_maxbet: rouletteConfigs.choices_maxbet,
      odds: rouletteConfigs.odds,
    };

    io.sendAllUser({ roulette: { remainingTime: rouletteData.remainingTime, gameConfigs } });
    io.sendAllAdmin({ roulette: { remainingTime: rouletteData.remainingTime, roundId: rouletteData.roundId } }, Constants.viewName);
  }
};

const resetForNewRound = (rouletteData) => {
  rouletteData.ingame = {};
  rouletteData.totalBets = {};
  rouletteData.winningPlayers = {};
};

const settleRound = async (io) => {
  const rouletteData = io.roulette;
  const result =
    rouletteData.roundId === rouletteData.settlementResultFromAdmin.roundId
      ? rouletteData.settlementResultFromAdmin.result
      : generateResult();
  const settlementResult = rouletteData.avaliableChoices.groupedByNumbers[result];
  const newRound = await RoulettePhien.create({ result, settlementResult, time: new Date() });

  if (newRound) {
    const finish = {
      roundId: newRound.id,
      time: newRound.time,
      result,
      settlementResult,
    };

    rouletteData.roundId = finish.roundId + 1;

    await settleBets(io, finish);
  }
};

const settleBets = async (io, finish) => {
  const realPlayersBets = await RouletteOne.find({ phien: finish.roundId }).exec();
  const botsBets = await RouletteTmpOne.find({ phien: finish.roundId }).exec();
  const allPlayersBets = realPlayersBets.concat(botsBets);

  if (allPlayersBets && allPlayersBets.length > 0) {
    const rouletteConfigs = ConfigHelper.getConfigs(ConfigHelper.GameTypes.Roulette);

    await Promise.all(
      allPlayersBets.map(async (bet) => {
        const betResult = calculateBetResult(finish.settlementResult, bet, rouletteConfigs.odds);

        bet.totalAmount = betResult.totalBetAmount;
        bet.betwin = betResult.totalWin;
        bet.thanhtoan = true;

        await bet.save();
        await callEndGame(bet, finish, betResult, io.users);
        await notifyBetResult(io, bet.uid, betResult);
      })
    );
  }

  pushRoundResultToAllRealPlayers(io, finish);
};

const calculateBetResult = (settlementResult, bet, odds) => {
  const betResult = Object.entries(settlementResult).reduce(
    (result, [typeOfBets, winningChoices]) => {
      const choicesPerType = bet[typeOfBets];

      if (choicesPerType) {
        const oddsOfType = odds[typeOfBets] ?? 0;
        const winningByChoicesOfType = {};

        Object.entries(choicesPerType).forEach(([betChoice, betAmount]) => {
          const win = winningChoices.includes(betChoice);
          const winAmount = win ? betAmount * oddsOfType : 0;

          result.totalBetAmount += betAmount;
          result.totalWin += winAmount;

          if (winAmount > 0) {
            result.netWin += winAmount - betAmount;
            winningByChoicesOfType[betChoice] = winAmount;
          } else {
            result.totalLost += betAmount;
          }

          return result;
        });

        if (Object.keys(winningByChoicesOfType).length !== 0) {
          result.winningByChoices[typeOfBets] = winningByChoicesOfType;
        }
      }

      return result;
    },
    {
      totalBetAmount: 0,
      totalWin: 0,
      netWin: 0,
      totalLost: 0,
      winningByChoices: {},
    }
  );

  betResult.totalWin = parseFloat(betResult.totalWin.toFixed(2));
  betResult.netWin = parseFloat(betResult.netWin.toFixed(2));

  return betResult;
};

const callEndGame = (bet, finish, betResult, users) => {
  const gameInfo = {
    gameId: GameIds.roulette,
    gameRoundId: finish.roundId,
    memberId: bet.memberId,
    siteId: bet.siteId,
    time: finish.time,
  };
  const settlementInfo = {
    redPlay: betResult.totalBetAmount,
  };

  if (betResult.totalWin > 0) {
    settlementInfo.red = betResult.totalWin;
  }

  if (betResult.netWin > 0) {
    settlementInfo.redWin = betResult.netWin;
  }

  if (betResult.totalLost > 0) {
    settlementInfo.redLost = betResult.totalLost;
  }

  return new Promise((resolve) => BalanceApi.endGame(bet.uid, gameInfo, settlementInfo, users, resolve));
};

const pushRunningRoundInfoToAllRealPlayers = (io) => {
  const rouletteData = io.roulette;
  const adminData = {
    roulette: {
      totalBets: rouletteData.totalBets,
      ingame: rouletteData.ingame,
    },
  };

  Object.values(rouletteData.realPlayers).forEach((realPlayer) => {
    realPlayer.red({ roulette: { totalBets: rouletteData.totalBets } });
  });

  io.sendAllAdmin(adminData, Constants.viewName);
};

const pushRoundResultToAllRealPlayers = (io, finish) => {
  const rouletteData = io.roulette;

  Object.values(rouletteData.realPlayers).forEach((realPlayer) => {
    realPlayer.red({
      roulette: {
        finish: {
          roundId: finish.roundId,
          result: finish.result,
          winningPlayers: rouletteData.winningPlayers,
        },
      },
    });
  });

  io.sendAllAdmin({ roulette: { finish } }, Constants.viewName);
};

const notifyBetResult = async (io, uid, betResult) => {
  const rouletteData = io.roulette;
  const status = { winningByChoices: betResult.winningByChoices };

  if (betResult.totalWin > 0) {
    status.win = true;
    status.bet = betResult.totalWin;
    rouletteData.winningPlayers[uid] = status;

    if (rouletteData.players[uid]) {
      rouletteData.players[uid].red += betResult.totalWin;
    }
  } else {
    status.win = false;
    status.bet = betResult.totalLost;
  }

  if (rouletteData.realPlayers[uid]) {
    rouletteData.realPlayers[uid].red({ roulette: { status } });
  } else if (io.users[uid]) {
    // Send latest balance to players who are not in the room anymore.
    for (const outGameRealPlayer of io.users[uid]) {
      const userInfo = await UserInfo.findOne({ id: uid }, "-_id red currency").lean().exec();

      if (userInfo) {
        outGameRealPlayer.red({
          user: { red: userInfo.red, currency: userInfo.currency },
        });
      }
    }
  }
};

module.exports = runGame;
