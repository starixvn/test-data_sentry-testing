const { constants, boxes, defaultChips, choiceNames } = require("./constant");
const BaccaratGame = require("./baccarat-game");
const ConfigHelper = require("./../../Helpers/ConfigHelper");
const baseCard = require("../../../data/card");
const logger = require("./../../web/logger");
const Helpers = require("../../Helpers/Helpers");
const BaccaratPhien = require("../../Models/Baccarat/baccarat-phien");
const GameConfigs = require("./../../Models/GameConfig/GameConfigs");
const BaccaratCuoc = require("./../../Models/Baccarat/baccarat-cuoc");
const BaccaratTempCuoc = require("./../../Models/Baccarat/baccarat-tmpcuoc");
const UserInfo = require("./../../Models/UserInfo");
const User = require("./../../Controllers/User");
const gameIds = require("../../../config/appConfigs").gameIds;
const balanceApi = require("./../../apis/balanceApi");
const bot = require("./bot");
const cloneDeep = require("lodash.clonedeep");

const getCards = () => {
  let cards = [...baseCard.card];

  cards = Helpers.shuffle(cards);
  cards = Helpers.shuffle(cards);
  cards = Helpers.shuffle(cards);

  return cards;
};

const onSettlementEnd = (io) => {
  io.game.baccarat.totalBets = { player: 0, banker: 0, big: 0, small: 0, tie: 0, playerPair: 0, bankerPair: 0 };
  io.game.baccarat.totalBetsAdmin = { player: 0, banker: 0, big: 0, small: 0, tie: 0, playerPair: 0, bankerPair: 0 };
  io.game.baccarat.ingame = {};
  io.game.baccarat.winningPlayers = {};
  io.game.baccarat.chips = cloneDeep(defaultChips);
};

const onBetTime = (io) => {
  try {
    const baccarat = io.game.baccarat;
    const previouslyDisabled = baccarat.disabled;
    const viewName = "viewBaccarat";

    if (baccarat && baccarat.remainingTime == constants.getGameConfigTime) {
      GameConfigs.findOne({ name: ConfigHelper.GameTypes.Baccarat }, function (err, data) {
        if (err) {
          logger.logError(err);
        }

        baccarat.disabled = data == null || !data.enabled;
        ConfigHelper.updateConfig(ConfigHelper.GameTypes.Baccarat, data);

        if (baccarat.disabled) {
          const payload = { baccarat: { um: true, um_message: data.disabled_message } };
          Object.values(baccarat.realPlayers).forEach(function (client) {
            client.red && client.red(payload);
          });
          io.sendAllAdmin(payload, viewName);

          GameConfigs.updateOne({ name: ConfigHelper.GameTypes.Baccarat }, { disabledround: baccarat.roundId }, function (err, data) {
            if (err) logger.logError(err);
          });

          //reset time
          baccarat.remainingTime = constants.getGameConfigTime;
        } else if (previouslyDisabled) {
          const gameConfigs = {
            minbet: data.minbet,
            maxbet: data.maxbet,
            choices_maxbet: data.choices_maxbet,
            odds: data.odds,
          };

          io.sendAllUser({ baccarat: { gameConfigs } });
          io.sendAllAdmin({ baccarat: { remainingTime: baccarat.remainingTime, roundId: baccarat.roundId } }, viewName);
        }
      });
    }

    if (baccarat && baccarat.remainingTime < constants.betTime && baccarat.remainingTime >= 0) {
      bot.run(io.game.baccarat);

      Object.values(baccarat.realPlayers).forEach((client) => {
        client.red({ baccarat: { totalBets: baccarat.totalBets, roundId: baccarat.roundId } });
      });

      if (io.admins) {
        let adminData = { baccarat: { info: baccarat.totalBetsAdmin, ingame: baccarat.ingame } };

        Object.values(io.admins).forEach(function (admin) {
          admin.forEach(function (client) {
            if (client.gameEvent && client.gameEvent.viewBaccarat) {
              client.red(adminData);
            }
          });
        });
      }
    }

    if (!baccarat.disabled) {
      baccarat.remainingTime--;
    }
  } catch (error) {
    logger.logError(error);
  }
};

const createUpdateData = (totalWin, winAmount, totalLoss, totalBet) => {
  let update = { red: 0, redWin: 0, redLost: 0, redPlay: totalBet };

  if (totalWin > 0) {
    update.red = totalWin;
  }

  if (winAmount > 0) {
    update.redWin = winAmount;
  }

  if (totalLoss > 0) {
    update.redLost = totalLoss;
  }

  return update;
};

const pushSettleResultToClient = (totalWin, baccarat, bet, totalLoss, io, winningByChoices) => {
  let status = {};
  const userId = bet.uid;

  if (totalWin > 0) {
    status = { win: true, bet: totalWin };
    status.winningByChoices = winningByChoices;
    baccarat.winningPlayers[userId] = status;
    if (baccarat.players[userId]) {
      baccarat.players[userId].red += totalWin;
    }
  } else {
    status = { win: false, bet: totalLoss };
  }

  if (void 0 !== baccarat.realPlayers[userId]) {
    baccarat.realPlayers[userId].red({ baccarat: { status: status } });
  } else {
    if (status.win && void 0 !== io.users[userId]) {
      io.users[userId].forEach(function (client) {
        UserInfo.findOne({ id: userId }, "-_id red currency")
          .lean()
          .then((userInfo) => {
            if (userInfo) {
              client.red({
                user: { red: userInfo.red, currency: userInfo.currency },
              });
            }
          });
      });
    }
  }
};

const pushCompleteSettlementToClients = (io, settlementResult, finalCards, roundId) => {
  const baccarat = io.game.baccarat;

  Object.values(baccarat.realPlayers).forEach(function (client) {
    client.red({
      baccarat: { finish: { result: finalCards, settlementResult, roundId: roundId, winningPlayers: baccarat.winningPlayers } },
    });
  });

  Object.values(io.admins).forEach(function (admin) {
    admin.forEach(function (client) {
      client.red({ baccarat: { finish: { result: finalCards, settlementResult, round: roundId } } });
    });
  });

  onSettlementEnd(io);
};

const calculateWinLoss = (bet, result, configs) => {
  const totalBet = boxes.reduce((total, box) => total + bet[box], 0);
  const boxesResult = boxes.reduce((res, box) => {
    res[box] = result[box] && bet[box] > 0;

    return res;
  }, {});

  const winLoss = boxes.reduce(
    (wl, box) => {
      if (box == choiceNames.tie && result[box]) {
        const playerBet = bet[choiceNames.player] > 0 ? bet[choiceNames.player] : 0;
        const bankerBet = bet[choiceNames.banker] > 0 ? bet[choiceNames.banker] : 0;
        const refund = playerBet + bankerBet;

        wl.totalWin += refund;
      }

      if (bet[box] > 0) {
        if (result[box]) {
          const win = bet[box] * configs.odds[box];
          wl.totalWin += win;
          wl.winAmount += win - bet[box];
        } else {
          wl.totalLoss += bet[box];
        }
      }

      return wl;
    },
    {
      winAmount: 0,
      totalWin: 0,
      totalLoss: 0,
    }
  );

  winLoss.totalWin = parseFloat(winLoss.totalWin.toFixed(2));
  winLoss.winAmount = parseFloat(winLoss.winAmount.toFixed(2));

  return { ...winLoss, totalBet, winningByChoices: boxesResult };
};

const settleBets = (bets, result, roundId, io, baccarat, settlementResult, finalCards, settlementTime, configs) => {
  const settleProcessList = bets.map(function (bet) {
    const { totalWin, winAmount, totalLoss, totalBet, winningByChoices } = calculateWinLoss(bet, result, configs);
    bet.thanhtoan = true;
    bet.betwin = totalWin;
    bet.save();
    const update = createUpdateData(totalWin, winAmount, totalLoss, totalBet);
    const gameInfo = {
      gameId: gameIds.baccarat,
      gameRoundId: roundId,
      memberId: bet.memberId,
      siteId: bet.siteId,
      time: settlementTime,
    };

    return new Promise((resolve) => {
      balanceApi.endGame(bet.uid, gameInfo, update, io.users, () => {
        pushSettleResultToClient(totalWin, baccarat, bet, totalLoss, io, winningByChoices);
        resolve({ users: bet.name, bet: winAmount, red: bet.red });
      });
    });
  });

  Promise.all(settleProcessList)
    .then(() => {
      pushCompleteSettlementToClients(io, settlementResult, finalCards, roundId);
      play(io);
    })
    .catch((error) => logger.logError(error));
};

const settle = (io, result, settlementResult, finalCards, settlementTime) => {
  const baccarat = io.game.baccarat;
  const roundId = io.game.baccarat.roundId - 1;
  const roundFilter = { phien: roundId };
  const configs = ConfigHelper.getConfigs(ConfigHelper.GameTypes.Baccarat);

  BaccaratTempCuoc.find(roundFilter)
    .exec()
    .then((botBets) => {
      BaccaratCuoc.find(roundFilter, (err, bets) => {
        if (err) {
          logger.logError(err);
          return;
        }

        const hadBotBets = botBets && botBets.length > 0;
        const hadRealBets = bets && bets.length > 0;
        if (hadRealBets || hadBotBets) {
          const totalBets = hadBotBets ? (bets || []).concat(botBets) : bets;

          settleBets(totalBets, result, roundId, io, baccarat, settlementResult, finalCards, settlementTime, configs);
        } else {
          pushCompleteSettlementToClients(io, settlementResult, finalCards, roundId);

          play(io);
        }
      });
    })
    .catch((error) => {
      logger.logError(error);
    });
};

const onGameRoundEnd = (io, gameLoop) => {
  if (io.game.baccarat.remainingTime < 0) {
    clearInterval(gameLoop);
    io.game.baccarat.remainingTime = 0;

    try {
      const cards = getCards();
      const baccaratGame = new BaccaratGame(cards);

      if (io.game.baccarat.settlementResultFromAdmin.roundId === io.game.baccarat.roundId) {
        baccaratGame.setResult(io.game.baccarat.settlementResultFromAdmin.result);
      }

      let action = "";

      do {
        action = baccaratGame.getAction();
        baccaratGame[action]();
      } while (action !== BaccaratGame.Actions.finalComparison);

      const result = baccaratGame.finalComparison();

      BaccaratPhien.create({ player: baccaratGame.player, banker: baccaratGame.banker, result, time: new Date() })
        .then((record) => {
          if (!!record) {
            io.game.baccarat.roundId = record.id + 1;

            const finalCards = baccaratGame.getFinalCards();
            settle(io, { ...result, ...finalCards }, result, finalCards, record.time);
          }
        })
        .catch((error) => logger.logError(error));

      bot.reset(io.game.baccarat);
    } catch (error) {
      logger.logError(error);
    }
  }
};

const play = (io) => {
  io.game.baccarat.remainingTime = constants.startCountDownTime;

  let gameLoop = setInterval(() => {
    try {
      onBetTime(io);
      onGameRoundEnd(io, gameLoop);
    } catch (error) {
      logger.logError(error);
    }
  }, 1000);

  return gameLoop;
};

module.exports = play;
