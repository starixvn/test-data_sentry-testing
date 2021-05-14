const GameIds = require("./../../../../../config/appConfigs").gameIds;

const BalanceApi = require("./../../../../apis/balanceApi");

const KenoProVietPhien = require("./models/KenoProViet_phien");
const KenoProVietOne = require("./models/bet-models").KenoProViet_one;

const Logger = require("./../../../../web/logger");

const settleBets = async (io, finish) => {
  const bets = await KenoProVietOne.find({ phien: finish.roundId }).exec();

  if (bets && bets.length > 0) {
    await Promise.all(
      bets.map(async (bet) => {
        const betResult = calculateBetResult(finish, bet);

        bet.betwin = betResult.totalWin;
        bet.thanhtoan = true;

        await bet.save();
        notifyBetResult(io, bet, betResult);
        callEndGame(bet, finish, betResult, io.users);
      })
    );
  }

  await KenoProVietPhien.updateOne({ id: finish.roundId }, { settled: true });
  pushRoundResultToAllRealPlayers(io, finish);
};

const calculateBetResult = (finish, bet) => {
  const betResult = Object.entries(finish.settlementResult).reduce(
    (result, [choice, win]) => {
      const betAmount = bet[choice];
      const winAmount = win ? betAmount * bet.odds[choice] : 0;

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
    gameId: GameIds.kenoproviet,
    gameRoundId: finish.roundId,
    memberId: bet.memberId,
    siteId: bet.siteId,
    time: finish.time,
  };
  let settlementInfo = {
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

  BalanceApi.endGame(bet.uid, gameInfo, settlementInfo, users);
};

const pushRoundResultToAllRealPlayers = (io, finish) => {
  io.sendAllUser({
    kenoProViet: { finish },
  });

  Object.values(io.admins).forEach((admin) => {
    admin.forEach((client) => {
      client.red({ kenoProViet: { finish } });
    });
  });
};

const notifyBetResult = (io, bet, betResult) => {
  let status = { winningByChoices: betResult.winningByChoices };

  if (betResult.totalWin > 0) {
    status.win = true;
    status.bet = betResult.totalWin;
  } else {
    status.win = false;
    status.bet = betResult.totalLost;
  }

  if (io.users[bet.uid]) {
    io.users[bet.uid].forEach((user) => {
      user.red({ kenoProViet: { status: status } });
    });
  }
};

module.exports = (io, finish) =>
  settleBets(io, finish).catch((err) => {
    Logger.logError(err);
  });
