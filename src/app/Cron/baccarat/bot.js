const Baccarat_TmpCuoc = require("../../Models/Baccarat/baccarat-tmpcuoc");
const UserInfo = require("../../Models/UserInfo");
const Chance = require("chance");
const chance = new Chance();

const Helpers = require("../../Helpers/Helpers");
const logger = require("./../../web/logger");
const ConfigHelper = require("./../../Helpers/ConfigHelper");
const constants = require("./constant").constants;
const appConstants = require("./../../appConstants");
const choiceGroupRatio = {
  PlayerBanker: 95,
  PlayerBankerPair: 1,
  Tie: 1,
  BigSmall: 3,
};

const resetBotData = {
  player: 0,
  banker: 0,
  big: 0,
  small: 0,
  tie: 0,
  playerPair: 0,
  bankerPair: 0,
};

const choices = ["player", "banker", "big", "small", "tie", "playerPair", "bankerPair"];
const PlayerBankerChoices = ["player", "banker"];
const BigSmallChoices = ["big", "small"];
const PlayerBankerPairChoices = ["playerPair", "bankerPair"];
const TieChoice = ["tie"];
const UniqueBetChoices = ["player", "banker", "tie"];

const smallTicketRatio = 70;
const writeConsoleLog = false;

let amountOnChoices = { ...resetBotData };

let configs = null;
let botsInRoom = {};
let maxNumberOfBots = 0;
let totalBotTickets = 0;
let totalSmallBotTickets = 0;

const reset = (gameData) => {
  configs = ConfigHelper.getConfigs(ConfigHelper.GameTypes.Baccarat);

  try {
    if (configs.botenabled) {
      const botRatio = ConfigHelper.getMaxBotForCurrentHour(ConfigHelper.GameTypes.Baccarat);

      UserInfo.countDocuments({ type: true, banned: false }, (err, botCount) => {
        if (err) {
          logger.logError(err);

          return;
        }

        maxNumberOfBots = Math.floor(botCount * botRatio);
        // console.log(`Baccarat bot: reset --- ${maxNumberOfBots}`);
      });

      UserInfo.find({ type: true, disabled: true, banned: false })
        .lean()
        .then(function (disabledBots) {
          disabledBots.forEach((bot) => {
            if (botsInRoom[bot.id]) {
              removeBot(bot.id, gameData);
              delete botsInRoom[bot.id];
              delete gameData.players[bot.id];
            }
          });
        })
        .catch(function (err) {
          logger.logError(err);
        });
    } else {
      removeAllBots(gameData);
    }

    writeLogAllChoiceAmount(gameData.players, gameData.roundId);

    resetAllBotData();
  } catch (error) {
    logger.logError(error);

    removeAllBots(gameData);
  }
};

const removeAllBots = (gameData) => {
  if (!!gameData.players) {
    const bots = Object.values(gameData.players).filter(function (player) {
      return player.type;
    });

    bots.forEach((bot) => {
      removeBot(bot.id, gameData);
      delete gameData.players[bot.id];
    });
  }

  botsInRoom = {};
  maxNumberOfBots = 0;
};

const run = (gameData) => {
  try {
    if (!!configs && configs.botenabled && gameData.remainingTime > constants.lockBet) {
      let activeBots = Object.keys(botsInRoom);
      const random = chance.integer({ min: 0, max: 5 });

      if ((activeBots.length <= 20 || random == 3) && activeBots.length <= maxNumberOfBots) {
        //bot in
        botIn(gameData);
      }

      if (activeBots.length > 20 && random == 4) {
        //bot out
        botOut(activeBots, gameData);
      }

      const maxTickets = Math.floor(activeBots.length / gameData.remainingTime) + 5;
      const maxBotsToBet = Math.floor(Math.random() * maxTickets + 5);

      let botsToBet = Object.values(botsInRoom).filter((t) => {
        return t.totalBet < configs.bot_maxbet && t.remainTickets > 0;
      });

      botsToBet = Helpers.shuffle(botsToBet);

      for (let i = 0; i < maxBotsToBet; i++) {
        let bot = botsToBet[i];

        if (!!bot) {
          botPlaceBet(bot, gameData);
        }
      }
    }
  } catch (err) {
    console.log(err);
  }
};

const botIn = (gameData) => {
  const maxBotRandom = maxNumberOfBots / gameData.remainingTime;
  const length = Math.floor(Math.random() * maxBotRandom + 1);

  if (botsInRoom.length > maxNumberOfBots) {
    return;
  }

  UserInfo.find({ type: true, inRoom: false, disabled: false }, "-_id id name red avatarId type")
    .lean()
    .then((botUsers) => {
      let botList = Helpers.shuffle(botUsers);
      botList = botList.slice(0, length);

      for (let i = 0; i < botList.length; i++) {
        let bot = botList[i];

        if (!!bot) {
          UserInfo.updateOne({ id: bot.id }, { inRoom: true, inGameRoom: ConfigHelper.GameTypes.Baccarat }).catch((error) => {
            logger.logError(error);
          });

          botsInRoom[bot.id] = bot;
          resetBot(botsInRoom[bot.id]);
        }

        if (!gameData.players[bot.id]) {
          Object.values(gameData.realPlayers).forEach(function (user) {
            user.red({ baccarat: { player: { id: bot.id, name: bot.name, red: bot.red, avatarId: bot.avatarId, type: bot.type } } });
          });
        }

        gameData.players[bot.id] = bot;
      }
    })
    .catch((err) => {
      logger.log(err);
      console.log(err);
    });
};

const botOut = (activeBots, gameData) => {
  let maxBotRemoveRandom = activeBots.length / gameData.remainingTime;

  if (maxBotRemoveRandom < 4) {
    maxBotRemoveRandom = 4;
  }

  const length = (Math.random() * maxBotRemoveRandom) >> 0;
  const botsToRemove = Helpers.shuffle(activeBots);

  for (let i = 0; i < length; i++) {
    const playerId = botsToRemove[i];

    removeBot(playerId, gameData);

    delete botsInRoom[playerId];
    delete gameData.players[playerId];
  }
};

const removeBot = (botId, gameData) => {
  // console.log("remove bot " + botId);
  UserInfo.updateOne({ id: botId }, { inRoom: false, inGameRoom: "" }).catch((error) => {
    logger.logError(error);
  });

  Object.values(gameData.realPlayers).forEach(function (user) {
    user.red({ baccarat: { outgame: { playerId: botId } } });
  });
};

const botPlaceBet = (bot, gameData) => {
  const choice = getBetChoice(bot);
  const isSmallTicket = totalBotTickets == 0 ? true : (totalSmallBotTickets * 100) / totalBotTickets < smallTicketRatio;
  const maxBet = getMaxBet(isSmallTicket, choice, bot);
  const minBet = getMinBet();

  const betAmount = generateBetAmount(minBet, maxBet);

  // console.log(`botPlaceBet bot ${bot.name} choice ${choice}`);
  // console.log("botPlaceBet bot " + bot.name + " bet " + betAmount + " maxBet " + maxBet);

  if (gameData.remainingTime > constants.lockBet) {
    Baccarat_TmpCuoc.findOne({ uid: bot.id, phien: gameData.roundId, red: true })
      .then((currentBet) => {
        let currentTotalBet = 0;
        if (!!currentBet) {
          choices.forEach((choice) => {
            currentTotalBet += currentBet[choice];
          });
        }

        if (!currentBet || currentTotalBet + betAmount <= maxBet) {
          UserInfo.findOne({ id: bot.id }, "red")
            .then((user) => {
              if (user && user.red > betAmount) {
                user.red -= betAmount;
                user.save();

                if (currentBet) {
                  currentBet[choice] += betAmount;
                  currentBet.save();
                } else {
                  upsertBet(bot, gameData.roundId, choice, betAmount);
                }

                gameData.totalBets[choice] += betAmount;

                sendBetInfoAndUpdateChips(gameData, bot.id, choice, betAmount, user.red);
                updateBotAndStatistic(bot.id, betAmount, choice, user.red, isSmallTicket);
              }
            })
            .catch((err) => {
              logger.logError(err);

              console.log(err);
            });
        }
      })
      .catch((err) => {
        logger.logError(err);
        console.log(err);
      });
  }
};

const getBetChoice = (bot) => {
  const totalBotBet = getTotalBetAmount();

  if (totalBotBet == 0) {
    return PlayerBankerChoices[chance.integer({ min: 0, max: PlayerBankerChoices.length - 1 })];
  }

  const betChoiceConditions = [
    {
      group: PlayerBankerChoices,
      underBetRatio: (getPlayerBankerBetAmount() * 100) / totalBotBet < choiceGroupRatio.PlayerBanker,
    },
    {
      group: BigSmallChoices,
      underBetRatio: (getBigSmallBetAmount() * 100) / totalBotBet < choiceGroupRatio.BigSmall,
    },
    {
      group: TieChoice,
      underBetRatio: (getTieBetAmount() * 100) / totalBotBet < choiceGroupRatio.Tie,
    },
    {
      group: PlayerBankerPairChoices,
      underBetRatio: (getPlayerBankerPairBetAmount() * 100) / totalBotBet < choiceGroupRatio.PlayerBankerPair,
    },
  ];

  const underRatioGroups = Helpers.shuffle(betChoiceConditions.filter((data) => data.underBetRatio == true));

  // console.log(underRatioGroups);

  let choice = null;
  if (underRatioGroups.length > 0) {
    const group = underRatioGroups[0].group;
    choice = group[chance.integer({ min: 0, max: group.length - 1 })];
  }

  if (choice == null) {
    choice = PlayerBankerChoices[chance.integer({ min: 0, max: PlayerBankerChoices.length - 1 })];
  }

  return ReGenerateForUniqueBetChoices(choice, bot);
};

const ReGenerateForUniqueBetChoices = (choice, bot) => {
  let updatedChoice = choice;

  if (!!bot && bot.choices.length > 0 && UniqueBetChoices.includes(choice)) {
    const previousChoices = bot.choices.filter((choice) => UniqueBetChoices.includes(choice));

    if (!!previousChoices && previousChoices.length > 0) {
      updatedChoice = previousChoices[0];
    }
  }

  return updatedChoice;
};

const getMaxBet = function (isSmallTicket, choice, bot) {
  const configMaxBet = Math.min(configs.choices_maxbet[choice], configs.bot_maxbet);
  const minBet = getMinBet();
  const maxBetOfSmallTicket = minBet * 50;

  if (PlayerBankerChoices.includes(choice) || BigSmallChoices.includes(choice)) {
    return isSmallTicket ? Math.min(maxBetOfSmallTicket, configMaxBet) : configMaxBet;
  }

  return Math.min(minBet * 10, configMaxBet * 0.2);
};

const getMinBet = () => {
  const defaultMinBet = 1;

  return Math.max(defaultMinBet, configs.minbet);
};

const generateBetAmount = (minBet, maxBet) => {
  const betAmount = Helpers.getRandomNumberStep5(minBet, maxBet, true);
  const betChips = Helpers.getRandomChips(betAmount);

  for (let chipIndex = 0; chipIndex < appConstants.chipList.length; chipIndex++) {
    if (betChips[chipIndex]) {
      return appConstants.chipList[chipIndex];
    }
  }

  return minBet;
};

const upsertBet = (bot, roundId, choice, betAmount) => {
  let create = { uid: bot.id, name: bot.name, phien: roundId, time: new Date() };
  let update = {};
  update[choice] = betAmount;

  Baccarat_TmpCuoc.updateOne(
    { uid: bot.id, phien: roundId },
    { $inc: update, $setOnInsert: create },
    { upsert: true, setDefaultsOnInsert: true },
    function (err, doc) {
      if (err) {
        console.log(err);
        logger.logError(err);
      }
    }
  );
};

const sendBetInfoAndUpdateChips = (gameData, botId, choice, betAmount, red) => {
  try {
    if (gameData.players[botId]) {
      gameData.players[botId].red = red;
    }

    gameData.chips[choice][betAmount] += 1;

    Object.values(gameData.realPlayers).forEach(function (realPlayer) {
      realPlayer.red({
        baccarat: {
          playerChip: {
            playerId: botId,
            box: choice,
            bet: betAmount,
            red: red,
          },
        },
      });
    });
  } catch (err) {
    console.log(err);
  }
};

const resetAllBotData = () => {
  Object.keys(botsInRoom).forEach(function (id) {
    resetBot(botsInRoom[id]);
  });

  totalBotTickets = 0;
  totalSmallBotTickets = 0;
  amountOnChoices = { ...resetBotData };
};

const resetBot = (bot) => {
  if (!!bot) {
    bot.totalBet = 0;
    bot.remainTickets = chance.integer({ min: 1, max: 3 });
    bot.choices = [];
    bot.betOnChoices = { ...resetBotData };
  }
};

const updateBotBalance = (botId, red) => {
  if (!!botsInRoom[botId]) {
    botsInRoom[botId].red = red;
  }
};

const updateBotAndStatistic = (botId, betAmount, choice, red, isSmallTicket) => {
  updateBotData(botId, betAmount, choice);
  if (isSmallTicket) {
    totalSmallBotTickets += 1;
  }

  totalBotTickets += 1;

  amountOnChoices[choice] += betAmount;

  // console.log(amountOnChoices);
};

const getTotalBetAmount = () => {
  const total = Object.values(amountOnChoices).reduce((a, b) => a + b);

  return total;
};

const getBigSmallBetAmount = () => {
  let total = 0;

  BigSmallChoices.forEach((choice) => {
    total += amountOnChoices[choice];
  });

  return total;
};

const getPlayerBankerBetAmount = () => {
  let total = 0;

  PlayerBankerChoices.forEach((choice) => {
    total += amountOnChoices[choice];
  });

  return total;
};

const getTieBetAmount = () => {
  let total = 0;

  TieChoice.forEach((choice) => {
    total += amountOnChoices[choice];
  });

  return total;
};

const getPlayerBankerPairBetAmount = () => {
  let total = 0;

  PlayerBankerPairChoices.forEach((choice) => {
    total += amountOnChoices[choice];
  });

  return total;
};

const updateBotData = function (botId, betAmount, choice) {
  if (!!botsInRoom[botId]) {
    botsInRoom[botId].totalBet += betAmount;
    botsInRoom[botId].choices.push(choice);
    botsInRoom[botId].remainTickets--;
    botsInRoom[botId].betOnChoices[choice] += betAmount;

    // console.log("Bot " + botsInRoom[botId].name + " bet for " + choice + " total " + botsInRoom[botId].totalBet);
    // console.log(botsInRoom[botId].betOnChoices);
  }
};

const writeLogAllChoiceAmount = function (players, roundId) {
  if (!writeConsoleLog) {
    return;
  }

  console.log(`----------${roundId}-----------`);
  console.log(`Total bot in room: ${Object.keys(botsInRoom).length}`);
  console.log(`Total players in room: ${Object.keys(players).length}`);
  console.log(`Total bot bet amount: ${getTotalBetAmount()}`);

  choices.forEach((choice) => {
    console.log(`Total bet on ${choice}: ${amountOnChoices[choice]}. Ratio: ${(amountOnChoices[choice] * 100) / getTotalBetAmount()}`);
  });

  console.log(`Small / Total: ${totalSmallBotTickets} / ${totalBotTickets}`);
};

module.exports = {
  reset: reset,
  run: run,
  updateBotBalance: updateBotBalance,
};
