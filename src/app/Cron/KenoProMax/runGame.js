const cloneDeep = require("lodash.clonedeep");

const GameIds = require("./../../../config/appConfigs").gameIds;
const KenoProMaxPhien = require("./../../Models/KenoProMax/KenoProMax_phien");
const KenoProMaxCuoc = require("./../../Models/KenoProMax/KenoProMax_cuoc");
const KenoProMaxTempCuoc = require("./../../Models/KenoProMax/KenoProMax_tmpcuoc");
const UserInfo = require("./../../Models/UserInfo");

const BalanceApi = require("./../../apis/balanceApi");
const ConfigHelper = require("./../../Helpers/ConfigHelper");
const GameConfigs = require("./../../Models/GameConfig/GameConfigs");
const Logger = require("./../../web/logger");
const Bot = require("./bot");

const Constants = require("./constants");
const generateResult = require("./shuffleNumbers");

const settlementRuleEntries = Object.entries({
  big: (totalPoints) => totalPoints >= 811,
  small: (totalPoints) => totalPoints <= 810,
  odd: (totalPoints) => totalPoints % 2 === 1,
  even: (totalPoints) => totalPoints % 2 === 0,
  gold: (totalPoints) => 210 <= totalPoints && totalPoints <= 695,
  wood: (totalPoints) => 696 <= totalPoints && totalPoints <= 763,
  water: (totalPoints) => 764 <= totalPoints && totalPoints <= 855,
  fire: (totalPoints) => 856 <= totalPoints && totalPoints <= 923,
  earth: (totalPoints) => 924 <= totalPoints && totalPoints <= 1410,
});

const runGame = (io) => {
  const loopInterval = 1000;
  const kenoProMaxData = io.kenoProMax || {};

  kenoProMaxData.disabled = false;
  kenoProMaxData.remainingTime = Constants.roundDuration;

  const gameLoop = setInterval(() => {
    proceed(io, kenoProMaxData, gameLoop).catch(Logger.logError);
  }, loopInterval);

  return gameLoop;
};

const proceed = async (io, kenoProMaxData, gameLoop) => {
  if (kenoProMaxData.remainingTime === Constants.roundDuration) {
    await checkGameStatus(io);
  }

  if (!kenoProMaxData.disabled) {
    kenoProMaxData.remainingTime--;
  }

  if (kenoProMaxData.remainingTime === Constants.placingBetDuration) {
    resetForNewRound(kenoProMaxData);
    await Bot.reset(kenoProMaxData);
  }

  if (kenoProMaxData.remainingTime < 0) {
    kenoProMaxData.remainingTime = 0;

    clearInterval(gameLoop);
    await settleRound(io);
  } else if (kenoProMaxData.remainingTime < Constants.placingBetDuration) {
    await Bot.run(kenoProMaxData);
    pushRunningRoundInfoToAllRealPlayers(io);
  }
};

const checkGameStatus = async (io) => {
  const kenoProMaxData = io.kenoProMax || {};
  const kenoProMaxConfigs = await GameConfigs.findOne({ name: ConfigHelper.GameTypes.KenoProMax }).lean().exec();
  const previouslyDisabled = kenoProMaxData.disabled;
  const viewName = "viewKenoProMax";

  ConfigHelper.updateConfig(ConfigHelper.GameTypes.KenoProMax, kenoProMaxConfigs);
  kenoProMaxData.disabled = kenoProMaxConfigs === null || !kenoProMaxConfigs.enabled;

  if (kenoProMaxData.disabled) {
    const disabledMessage = kenoProMaxConfigs === null ? "" : kenoProMaxConfigs.disabled_message;

    kenoProMaxData.remainingTime = Constants.roundDuration;
    const payload = { kenoProMax: { um: true, um_message: disabledMessage } };
    io.sendAllUser(payload);
    io.sendAllAdmin(payload, viewName);

    await GameConfigs.updateOne({ name: ConfigHelper.GameTypes.KenoProMax }, { disabledround: kenoProMaxData.roundId });
  } else if (previouslyDisabled) {
    const gameConfigs = {
      minbet: kenoProMaxConfigs.minbet,
      maxbet: kenoProMaxConfigs.maxbet,
      choices_maxbet: kenoProMaxConfigs.choices_maxbet,
      odds: kenoProMaxConfigs.odds,
    };

    io.sendAllUser({ kenoProMax: { gameConfigs } });
    io.sendAllAdmin({ kenoProMax: { remainingTime: kenoProMaxData.remainingTime, roundId: kenoProMaxData.roundId } }, viewName);
  }
};

const resetForNewRound = (kenoProMaxData) => {
  kenoProMaxData.ingame = {};
  kenoProMaxData.totalBets = { ...Constants.resetTotalBets };
  kenoProMaxData.chips = cloneDeep(Constants.resetChipsCount);
  kenoProMaxData.winningPlayers = {};
};

const settleRound = async (io) => {
  const kenoProMaxData = io.kenoProMax || {};
  const result =
    kenoProMaxData.roundId === kenoProMaxData.settlementResultFromAdmin.roundId
      ? kenoProMaxData.settlementResultFromAdmin.result
      : generateResult();
  const totalPoints = result.reduce((total, number) => total + number, 0);
  const settlementResult = settlementRuleEntries.reduce((settlementTempResult, [choice, rule]) => {
    settlementTempResult[choice] = rule(totalPoints);

    return settlementTempResult;
  }, {});
  const newRound = await KenoProMaxPhien.create({
    settlementResult,
    result,
    time: new Date(),
  });

  if (!!newRound) {
    const finish = {
      settlementResult,
      result,
      roundId: newRound.id,
      time: newRound.time,
    };

    kenoProMaxData.roundId = finish.roundId + 1;

    await settleBets(io, finish);
  }
};

const settleBets = async (io, finish) => {
  const realPlayersBets = await KenoProMaxCuoc.find({ phien: finish.roundId }).exec();
  const botsBets = await KenoProMaxTempCuoc.find({ phien: finish.roundId }).exec();
  const allPlayersBets = realPlayersBets.concat(botsBets);

  if (allPlayersBets && allPlayersBets.length > 0) {
    const kenoProMaxConfigs = ConfigHelper.getConfigs(ConfigHelper.GameTypes.KenoProMax);

    await Promise.all(
      allPlayersBets.map(async (bet) => {
        const betResult = calculateBetResult(finish, bet, kenoProMaxConfigs.odds);

        bet.betwin = betResult.totalWin;
        bet.thanhtoan = true;

        await bet.save();
        await callEndGame(bet, finish, betResult, io.users);
        await notifyBetResult(io, bet.uid, betResult);
      })
    );
  }

  pushRoundResultToAllRealPlayers(io, finish);
  runGame(io);
};

const calculateBetResult = (finish, bet, odds) => {
  const betResult = Object.entries(finish.settlementResult).reduce(
    (result, [choice, win]) => {
      const betAmount = bet[choice];
      const winAmount = win ? betAmount * (odds[choice] || 1) : 0;

      result.totalBetAmount += betAmount;
      result.totalWin += winAmount;
      result.winningByChoices[choice] = winAmount;

      if (winAmount > 0) {
        result.netWin += winAmount - betAmount;
      } else {
        result.totalLost += betAmount;
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
    gameId: GameIds.kenopromax,
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
  const kenoProMaxData = io.kenoProMax || {};
  const adminData = {
    kenoProMax: {
      totalBets: kenoProMaxData.totalBets,
      ingame: kenoProMaxData.ingame,
    },
  };

  Object.values(kenoProMaxData.realPlayers).forEach((realPlayer) => {
    realPlayer.red({ kenoProMax: { totalBets: kenoProMaxData.totalBets } });
  });

  Object.values(io.admins).forEach((admin) => {
    admin.forEach((client) => {
      if (client.gameEvent && client.gameEvent.viewKenoProMax) {
        client.red(adminData);
      }
    });
  });
};

const pushRoundResultToAllRealPlayers = (io, finish) => {
  const kenoProMaxData = io.kenoProMax || {};

  Object.values(kenoProMaxData.realPlayers).forEach((realPlayer) => {
    realPlayer.red({
      kenoProMax: {
        finish: {
          roundId: finish.roundId,
          result: finish.result,
          settlementResult: finish.settlementResult,
          winningPlayers: kenoProMaxData.winningPlayers,
        },
      },
    });
  });

  Object.values(io.admins).forEach((admin) => {
    admin.forEach((client) => {
      client.red({ kenoProMax: { finish } });
    });
  });
};

const notifyBetResult = async (io, uid, betResult) => {
  const kenoProMaxData = io.kenoProMax || {};
  const status = { winningByChoices: betResult.winningByChoices };

  if (betResult.totalWin > 0) {
    status.win = true;
    status.bet = betResult.totalWin;
    kenoProMaxData.winningPlayers[uid] = status;

    if (kenoProMaxData.players[uid]) {
      kenoProMaxData.players[uid].red += betResult.totalWin;
    }
  } else {
    status.win = false;
    status.bet = betResult.totalLost;
  }

  if (kenoProMaxData.realPlayers[uid]) {
    kenoProMaxData.realPlayers[uid].red({ kenoProMax: { status: status } });
  } else if (status.win && io.users[uid]) {
    // Send latest balance to players who are not in the room anymore.
    for (const outGameRealPlayer of io.users[uid]) {
      const userInfo = await UserInfo.findOne({ id: uid }, "-_id red currency").lean().exec();

      if (userInfo) {
        outGameRealPlayer.red({
          user: { red: userInfo.red, currency: userInfo.currency },
        });
      }
    }
  } else {
    Bot.updateBalance(uid, betResult.totalWin);
  }
};

module.exports = runGame;
