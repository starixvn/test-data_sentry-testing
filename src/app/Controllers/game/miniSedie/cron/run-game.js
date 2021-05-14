const GameIds = require("./../../../../../config/appConfigs").gameIds;

const BalanceApi = require("./../../../../apis/balanceApi");
const ConfigHelper = require("./../../../../Helpers/ConfigHelper");
const GameConfigs = require("./../../../../Models/GameConfig/GameConfigs");
const Logger = require("./../../../../web/logger");

const MiniSediePhien = require("./../models/MiniSedie_phien");
const MiniSedieCuoc = require("./../models/MiniSedie_cuoc");
const Constants = require("./../constants");

const Bot = require("./bot");

const settlementRuleEntries = Object.entries({
  odd: (totalReds) => totalReds % 2 === 1,
  even: (totalReds) => totalReds % 2 === 0,
  red3: (totalReds) => totalReds === 3,
  red4: (totalReds) => totalReds === 4,
  white3: (totalReds) => totalReds === 1,
  white4: (totalReds) => totalReds === 0,
});

const runGame = (io) => {
  const loopInterval = 1000;
  const miniSedieData = io.miniSedie || {};

  miniSedieData.disabled = false;
  miniSedieData.remainingTime = Constants.roundDuration;

  const gameLoop = setInterval(() => {
    proceed(io, miniSedieData, gameLoop).catch(Logger.logError);
  }, loopInterval);

  return gameLoop;
};

const proceed = async (io, miniSedieData, gameLoop) => {
  if (miniSedieData.remainingTime === Constants.roundDuration) {
    await checkGameStatus(io);
  }

  if (!miniSedieData.disabled) {
    miniSedieData.remainingTime--;
  }

  if (miniSedieData.remainingTime === Constants.placingBetDuration + Constants.shakeThePlateDuration) {
    resetForNewRound(miniSedieData);
    await Bot.reset();
  }

  if (miniSedieData.remainingTime < 0) {
    miniSedieData.remainingTime = 0;

    clearInterval(gameLoop);
    await settleRound(io);
  } else if (miniSedieData.remainingTime < Constants.placingBetDuration) {
    Bot.run(miniSedieData);
    pushRunningRoundInfoToAllRealPlayers(io);
  }
};

const checkGameStatus = async (io) => {
  const miniSedieData = io.miniSedie || {};
  const miniSedieConfigs = await GameConfigs.findOne({ name: ConfigHelper.GameTypes.MiniSedie }).lean().exec();
  const previouslyDisabled = miniSedieData.disabled;

  ConfigHelper.updateConfig(ConfigHelper.GameTypes.MiniSedie, miniSedieConfigs);
  miniSedieData.disabled = miniSedieConfigs === null || !miniSedieConfigs.enabled;

  if (miniSedieData.disabled) {
    const disabledMessage = miniSedieConfigs === null ? "" : miniSedieConfigs.disabled_message;
    const payload = { miniSedie: { um: true, um_message: disabledMessage } };

    miniSedieData.remainingTime = Constants.roundDuration;
    io.sendAllUser(payload);
    io.sendAllAdmin(payload, Constants.viewName);

    await GameConfigs.updateOne({ name: ConfigHelper.GameTypes.MiniSedie }, { disabledround: miniSedieData.roundId });
  } else if (previouslyDisabled) {
    const gameConfigs = {
      minbet: miniSedieConfigs.minbet,
      maxbet: miniSedieConfigs.maxbet,
      choices_maxbet: miniSedieConfigs.choices_maxbet,
      odds: miniSedieConfigs.odds,
    };

    io.sendAllUser({ miniSedie: { remainingTime: miniSedieData.remainingTime, gameConfigs } });
    io.sendAllAdmin({ miniSedie: { remainingTime: miniSedieData.remainingTime, roundId: miniSedieData.roundId } }, Constants.viewName);
  } else {
    io.sendAllUser({ miniSedie: { remainingTime: miniSedieData.remainingTime } });
  }
};

const resetForNewRound = (miniSedieData) => {
  miniSedieData.ingame = {};
  miniSedieData.totalBets = { ...Constants.resetTotalBets };
};

const settleRound = async (io) => {
  const miniSedieData = io.miniSedie || {};
  const result = generateResult();
  const totalReds = Object.values(result).filter((value) => value === true).length;
  const settlementResult = settlementRuleEntries.reduce((settlementTempResult, [choice, rule]) => {
    settlementTempResult[choice] = rule(totalReds);

    return settlementTempResult;
  }, {});
  const newRound = await MiniSediePhien.create({
    ...result,
    settlementResult,
    time: new Date(),
  });

  if (!!newRound) {
    const finish = {
      settlementResult,
      result,
      roundId: newRound.id,
      time: newRound.time,
    };

    miniSedieData.roundId = finish.roundId + 1;

    await settleBets(io, finish);
  }
};

const settleBets = async (io, finish) => {
  const bets = await MiniSedieCuoc.find({ phien: finish.roundId }).exec();

  if (bets && bets.length > 0) {
    const miniSedieConfigs = ConfigHelper.getConfigs(ConfigHelper.GameTypes.MiniSedie);

    await Promise.all(
      bets.map(async (bet) => {
        const betResult = calculateBetResult(finish, bet, miniSedieConfigs.odds);

        bet.betwin = betResult.totalWin;
        bet.thanhtoan = true;

        await bet.save();
        await callEndGame(bet, finish, betResult, io.users);
        notifyBetResult(io, bet, betResult);
      })
    );
  }

  pushRoundResultToAllRealPlayers(io, finish);
  runGame(io);
};

const generateResult = () => {
  const red1 = (Math.random() * 2) >> 0 != 0;
  const red2 = Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6) + 3 <= 10;
  const red3 = (Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6) + 3) % 2 == 0;
  const red4 = (Math.floor(Math.random() * 10000) + 1) % 2 != 0;

  return { red1, red2, red3, red4 };
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
    gameId: GameIds.minisedie,
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
  const miniSedieData = io.miniSedie || {};
  const adminData = {
    miniSedie: {
      totalBets: miniSedieData.totalBets,
      ingame: miniSedieData.ingame,
    },
  };

  Object.values(io.users).forEach((clients) => {
    clients.forEach((client) => {
      if (client.gameEvent && client.gameEvent.viewMiniSedie) {
        client.red({ miniSedie: { totalBets: miniSedieData.totalBets } });
      }
    });
  });

  Object.values(io.admins).forEach((admin) => {
    admin.forEach((client) => {
      if (client.gameEvent && client.gameEvent.viewMiniSedie) {
        client.red(adminData);
      }
    });
  });
};

const pushRoundResultToAllRealPlayers = (io, finish) => {
  io.sendAllUser({
    miniSedie: {
      finish: {
        roundId: finish.roundId,
        result: finish.result,
        settlementResult: finish.settlementResult,
      },
    },
  });

  Object.values(io.admins).forEach((admin) => {
    admin.forEach((client) => {
      client.red({ miniSedie: { finish } });
    });
  });
};

const notifyBetResult = (io, bet, betResult) => {
  const status = { winningByChoices: betResult.winningByChoices };

  if (betResult.totalWin > 0) {
    status.win = true;
    status.bet = betResult.totalWin;
  } else {
    status.win = false;
    status.bet = betResult.totalLost;
  }

  if (io.users[bet.uid]) {
    io.users[bet.uid].forEach((user) => {
      user.red({ miniSedie: { status: status } });
    });
  }
};

module.exports = runGame;
