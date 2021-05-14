const UserInfo = require("../../../Models/UserInfo");
const Chance = require("chance");
const chance = new Chance();

const Helpers = require("../../../Helpers/Helpers");
const logger = require("../../../web/logger");
const ConfigHelper = require("../../../Helpers/ConfigHelper");
const constants = require("./constants");
const { RouletteTmpOne } = require("./Models/Roulette_one");
const { quickBets } = require("./generate-choices");

const modRoundToChangedTopBot = 6;

const uniqueBetTypes = ["bigSmall", "redBlack", "oddEven"];

const betTypeRatio = {
  straightUpSplit: 60,
  others: 40,
};

const betTypeKeys = [
  "bigSmall",
  "oddEven",
  "redBlack",
  "straightUp",
  "split",
  "street",
  "triangle",
  "corner",
  "fourNumbers",
  "column",
  "line",
  "dozen",
];

const minAmount = 200;
const defaultBotMaxBet = 500;

let configs = null;
let botsInRoom = [];
let maxNumberOfBots = 0;
let currentBotRatio = 0;
let changedTopBots = false;

let totalBotTickets = 0;

const resetAmountOnChoices = () => ({
  bigSmall: {
    big: 0,
    small: 0,
  },
  oddEven: {
    even: 0,
    odd: 0,
  },
  redBlack: {
    red: 0,
    black: 0,
  },
  straightUp: {},
  split: {},
  street: {},
  triangle: {},
  corner: {},
  fourNumbers: {},
  column: {},
  line: {},
  dozen: {},
});

let amountOnChoices = resetAmountOnChoices();

const reset = async (rouletteData) => {
  configs = ConfigHelper.getConfigs(ConfigHelper.GameTypes.Roulette);

  if (configs.botenabled) {
    const botRatio = ConfigHelper.getMaxBotForCurrentHour(ConfigHelper.GameTypes.Roulette);

    if (currentBotRatio != botRatio) {
      currentBotRatio = botRatio;

      const botUserCount = await UserInfo.countDocuments({ type: true }).exec();

      maxNumberOfBots = Math.floor(botUserCount * currentBotRatio);
    }

    const disabledBots = await UserInfo.find({ type: true, disabled: true }).lean().exec();

    disabledBots.forEach((bot) => {
      removeBot(bot.id, rouletteData);
    });

    changedTopBots = false;

    //console.log(`botsInRoom ${Object.keys(botsInRoom).length} maxNumberOfBots ${maxNumberOfBots}`);
  } else {
    removeAllBotPlayers(rouletteData);
    removeAllBots();
  }

  //writeLogAllChoiceAmount(rouletteData.players);
  resetBotData();
};

const removeAllBots = function () {
  botsInRoom = [];
  maxNumberOfBots = 0;
  currentBotRatio = 0;
};

const removeAllBotPlayers = function (rouletteData) {
  const bots = Object.values(rouletteData.players).filter(function (player) {
    return player.type;
  });
  bots.forEach((bot) => {
    removeBot(bot.id, rouletteData);
  });
};

const run = async (rouletteData) => {
  const addBotValue = 3;
  const removeBotValue = 4;
  const minBots = 20;

  if (
    !!configs &&
    configs.botenabled &&
    rouletteData.remainingTime > constants.lockingBetDuration &&
    rouletteData.remainingTime < constants.placingBetDuration
  ) {
    let activeBots = Object.keys(botsInRoom);
    let random = chance.integer({ min: 0, max: 5 });

    if ((activeBots.length <= minBots || random == addBotValue) && activeBots.length < maxNumberOfBots) {
      const remainingOfBots = maxNumberOfBots - activeBots.length;
      if (remainingOfBots > 0) {
        await joinRoom(rouletteData, maxNumberOfBots - activeBots.length);
      }
    }

    if (activeBots.length > 0 && (activeBots.length > minBots || minBots > maxNumberOfBots) && random == removeBotValue) {
      leaveRoom(activeBots, rouletteData);
    }

    if (activeBots.length > 0) {
      let remainingChoices = 0;
      Object.values(botsInRoom).forEach((bot) => {
        remainingChoices += bot.remainTickets;
      });

      const maxTickets = Math.floor(remainingChoices / (rouletteData.remainingTime - constants.lockingBetDuration));
      const numberBotsToBet = chance.integer({ min: maxTickets * 0.5, max: maxTickets });

      let botsToBet = Object.values(botsInRoom).filter(function (t) {
        return t.totalBet < configs.bot_maxbet && t.remainTickets > 0;
      });

      botsToBet = Helpers.shuffle(botsToBet);

      for (let i = 0; i < numberBotsToBet; i++) {
        let bot = botsToBet[i];

        if (!!bot) {
          await placeBet(bot, rouletteData);
        }
      }
    }
  }
};

const joinRoom = async (rouletteData, remainingBots) => {
  let botsIn = [];
  let maxBotRandom = Math.floor(maxNumberOfBots / rouletteData.remainingTime) + 1;
  maxBotRandom = Math.min(maxBotRandom, remainingBots);
  let length = chance.integer({ min: maxBotRandom * 0.6, max: maxBotRandom });

  const botUsers = await UserInfo.find({ type: true, inRoom: false, disabled: false }, "-_id id name red avatarId type").lean().exec();

  let botList = Helpers.shuffle(botUsers);
  botList = botList.slice(0, length);
  // console.log(`joinRoom length ${length}`);

  for (let i = 0; i < length; i++) {
    let bot = botList[i];

    if (!!bot) {
      updateInRoom(bot.id, true);
      //console.log(`joinRoom bot ${bot.name} id ${bot.id}`);

      botsInRoom[bot.id] = bot;
      resetBot(botsInRoom[bot.id]);

      botList.splice(i, 1);
      botsIn.push(bot);
    }
  }

  botsIn.forEach((bot) => {
    if (!rouletteData.players[bot.id]) {
      Object.values(rouletteData.realPlayers).forEach((user) => {
        user.red({
          roulette: {
            player: {
              id: bot.id,
              name: bot.name,
              red: bot.red,
              avatarId: bot.avatarId,
              type: bot.type,
            },
          },
        });
      });
    }

    rouletteData.players[bot.id] = bot;
  });
  //console.log(`joinRoom ${length} - botsInRoom ${Object.keys(botsInRoom).length}`);
};

const leaveRoom = function (activeBots, rouletteData) {
  let botsOut = [];
  let maxBotRemoveRandom = Math.max(4, activeBots.length / rouletteData.remainingTime);

  const outOfRedBots = Object.values(botsInRoom).filter(function (bot) {
    return bot.red < minAmount;
  });

  let length = chance.integer({ min: 1, max: maxBotRemoveRandom });

  for (let i = 0; i < length; i++) {
    const botToLeave = getBotToLeave(rouletteData.roundId, activeBots, outOfRedBots);

    if (!!botToLeave) {
      botsOut.push(botToLeave);
      delete botsInRoom[botToLeave.id];
    }
  }

  botsOut.forEach((bot) => {
    if (!!bot) {
      removeBot(bot.id, rouletteData);
    }
  });
};

const getBotToLeave = function (roundId, activeBots, outOfRedBots) {
  let botId = "";
  let index = 0;
  if (!changedTopBots && roundId % modRoundToChangedTopBot == 0) {
    changedTopBots = true;
    let max = Math.min(7, activeBots.length - 1);
    index = chance.integer({ min: 0, max: max });
    botId = activeBots[index];

    delete activeBots[index];

    return botsInRoom[botId];
  }

  if (outOfRedBots.length > 0) {
    index = chance.integer({ min: 0, max: outOfRedBots.length - 1 });
    const bot = outOfRedBots[index];
    if (!!bot) {
      delete outOfRedBots[index];
      index = activeBots.indexOf(bot.id);

      if (index > -1) {
        delete activeBots[index];
      }

      return botsInRoom[bot.id];
    }
  }

  index = chance.integer({ min: 0, max: activeBots.length - 1 });
  botId = activeBots[index];

  delete activeBots[index];

  return botsInRoom[botId];
};

const updateInRoom = function (botId, inRoom) {
  const gameRoom = inRoom ? ConfigHelper.GameTypes.Roulette : "";

  UserInfo.updateOne({ id: botId }, { inRoom: inRoom, inGameRoom: gameRoom }).catch((error) => {
    logger.logError(error);
  });
};

const removeBot = function (botId, rouletteData) {
  updateInRoom(botId, false);

  delete rouletteData.players[botId];

  Object.values(rouletteData.realPlayers).forEach(function (user) {
    user.red({ roulette: { outgame: { playerId: botId } } });
  });
};

const getTotalBetAmount = (box) => {
  let total = 0;
  const betTypes = Object.values(box);
  betTypes.forEach((betType) => {
    Object.values(betType).forEach((value) => (total += value));
  });

  return total;
};

const updateRouletteData = (rouletteData, box) => {
  Object.entries(box).forEach(([betType, betChoices]) => {
    if (!rouletteData.totalBets[betType]) {
      rouletteData.totalBets[betType] = {};
    }
    Object.entries(betChoices).forEach(([betChoice, amount]) => {
      rouletteData.totalBets[betType][betChoice] = (rouletteData.totalBets[betType][betChoice] || 0) + amount;
    });
  });
};

const updateAmountOnChoices = (box) => {
  Object.entries(box).forEach(([betType, betChoices]) => {
    Object.entries(betChoices).forEach(([betChoice, amount]) => {
      amountOnChoices[betType][betChoice] = (amountOnChoices[betType][betChoice] || 0) + amount;
    });
  });
};

const placeBet = async (bot, rouletteData) => {
  try {
    const randomNumber = chance.integer({ min: constants.numberWheel.min, max: constants.numberWheel.max });
    const box = getBetChoice(bot, randomNumber, rouletteData);

    const botMaxBet = getBotMaxBet();
    const totalBetAmount = getTotalBetAmount(box);

    let currentTotalBet = 0;

    let currentBet = await RouletteTmpOne.findOne({
      uid: bot.id,
      phien: rouletteData.roundId,
    }).exec();

    if (currentBet) {
      betTypeKeys.forEach((betType) => {
        const betTypeObj = currentBet[betType];
        if (betTypeObj) {
          Object.keys(betTypeObj).forEach((choice) => (currentTotalBet += betTypeObj[choice]));
        }
      });
    }

    if (!currentBet || currentTotalBet + totalBetAmount <= botMaxBet) {
      const userInfo = await UserInfo.findOne({ id: bot.id }, "red").exec();

      if (
        rouletteData.remainingTime < constants.placingBetDuration &&
        rouletteData.remainingTime > constants.lockingBetDuration &&
        totalBetAmount > 0 &&
        userInfo &&
        userInfo.red > totalBetAmount
      ) {
        userInfo.red -= totalBetAmount;
        await userInfo.save();

        if (currentBet) {
          const increment = {};

          Object.entries(box).forEach(([betType, betChoices]) => {
            Object.entries(betChoices).forEach(([betChoice, amount]) => {
              increment[`${betType}.${betChoice}`] = amount;
            });
          });

          await RouletteTmpOne.updateOne({ uid: bot.id, phien: rouletteData.roundId }, { $inc: increment }).exec();
        } else {
          let create = {
            uid: bot.id,
            name: bot.name,
            phien: rouletteData.roundId,
            time: new Date(),
            ...box,
          };

          await RouletteTmpOne.updateOne(
            { uid: bot.id, phien: rouletteData.roundId },
            { $setOnInsert: create },
            { upsert: true, setDefaultsOnInsert: true }
          ).exec();
        }

        updateRouletteData(rouletteData, box);
        updateAmountOnChoices(box);
        totalBotTickets += 1;
        updateBotData(bot.id, totalBetAmount, userInfo.red, box);

        if (rouletteData.players[bot.id]) {
          rouletteData.players[bot.id].red = userInfo.red;
        }

        Object.values(rouletteData.realPlayers).forEach(function (realPlayer) {
          realPlayer.red({
            roulette: {
              othersBetChoices: {
                playerId: bot.id,
                betChoices: box,
                red: userInfo.red,
              },
            },
          });
        });
      }
    }
  } catch (err) {
    logger.logError(err);
    console.log(err);
  }
};

const getQuickBets = (randomNumber) => {
  const options = Object.values(quickBets);
  const randomOption = options[chance.integer({ min: 0, max: options.length - 1 })];
  const betAmount = chance.integer({ min: getMinBet(), max: 5 });

  return randomOption(betAmount, randomNumber);
};

const getBetChoice = function (bot, randomNumber, rouletteData) {
  let box = {};

  const botTotalBet = getCurrentTotalBetAmount();
  const straightUpAndSplitTotalBet = getStraightUpBetAmount() + getSplitBetAmount();
  const isStraightUpOrSplit = botTotalBet == 0 ? true : (straightUpAndSplitTotalBet * 100) / botTotalBet < betTypeRatio.straightUpSplit;
  const options = rouletteData.avaliableChoices.groupedByNumbers[randomNumber];
  const betTypes = Object.keys(options).filter((x) => options[x].length > 0);
  let typeChoiceIndex = 0;

  if (isStraightUpOrSplit) {
    if (chance.bool({likelihood: 30})) {
      return getQuickBets(randomNumber);
    }

    if (randomNumber !== 0) {
      typeChoiceIndex = chance.integer({ min: 0, max: 1 });
    }
  } else {
    typeChoiceIndex = chance.integer({ min: 2, max: betTypes.length - 1 });
  }

  const selectedBetType = betTypes[typeChoiceIndex];
  const betChoices = options[selectedBetType];
  let selectedChoice = betChoices[chance.integer({ min: 0, max: betChoices.length - 1 })];
  box[selectedBetType] = {
    [selectedChoice]: 0,
  };

  //console.log(`Roulette bot ${bot.name} bet ${selectedBetType} ${selectedChoice}`);

  if (!!bot && bot.choices.length > 0 && uniqueBetTypes.some((u) => u === selectedBetType)) {
    const previousUniqueBox = bot.choices.find((choice) => selectedBetType == Object.keys(choice)[0]);

    if (previousUniqueBox) {
      box = previousUniqueBox;
      selectedChoice = Object.keys(previousUniqueBox[selectedBetType])[0];
    }
  }

  const betAmount = getBetAmount(box);
  box[selectedBetType][selectedChoice] = betAmount;

  return box;
};

const getCurrentTotalBetAmount = function () {
  let total = 0;

  betTypeKeys.forEach((betType) => {
    let betTypeObj = amountOnChoices[betType];
    Object.keys(betTypeObj).forEach((betChoice) => (total += betTypeObj[betChoice]));
  });

  return total;
};

const getStraightUpBetAmount = () => {
  let total = 0;
  let straightUpBetType = amountOnChoices.straightUp;

  Object.keys(straightUpBetType).forEach((choice) => {
    total += straightUpBetType[choice];
  });

  return total;
};

const getSplitBetAmount = () => {
  let total = 0;
  let splitBetType = amountOnChoices.split;

  Object.keys(splitBetType).forEach((choice) => {
    total += splitBetType[choice];
  });

  return total;
};

const getMinBet = function () {
  let minBet = 1;

  if (!!configs && configs.minbet > 0) {
    minBet = configs.minbet;
  }

  return minBet;
};

const getBotMaxBet = function () {
  return configs && configs.bot_maxbet > 0 ? configs.bot_maxbet : defaultBotMaxBet;
};

const resetBotData = function () {
  Object.keys(botsInRoom).forEach(function (id) {
    resetBot(botsInRoom[id]);
  });

  totalBotTickets = 0;
  amountOnChoices = resetAmountOnChoices();
};

const resetBot = function (bot) {
  if (!!bot) {
    bot.totalBet = 0;
    bot.remainTickets = chance.integer({ min: 1, max: 3 });
    bot.choices = [];
    bot.betOnChoices = resetAmountOnChoices();
  }
};

const updateBalance = function (botId, totalWin) {
  if (!!botsInRoom[botId]) {
    botsInRoom[botId].red += totalWin;
  }
};

const getBetAmount = function (box) {
  const betTypeChoice = Object.keys(box)[0];
  const configBetTypeOdds = configs.odds[betTypeChoice];
  const configMaxBetType = configs.choices_maxbet[betTypeChoice];
  const configBotMaxBet = getBotMaxBet();
  const minBet = getMinBet();
  const random = Helpers.getRandomAmount(minBet, configBotMaxBet, false);
  const betAmount = Math.min(Math.round(random / configBetTypeOdds), configMaxBetType);

  return betAmount > minBet ? betAmount : minBet;
};

const writeLogAllChoiceAmount = function (players) {
  console.log("---------------------");
  console.log(`Total bot in room: ${Object.keys(botsInRoom).length}`);
  console.log(`Total players in room: ${Object.keys(players).length}`);
  console.log(`Total bot bet amount: ${getCurrentTotalBetAmount()}`);
  betTypeKeys.forEach((choice) => {
    console.log(`Total bet on ${choice}: ${amountOnChoices[choice]}. Ratio: ${(amountOnChoices[choice] * 100) / getCurrentTotalBetAmount()}`);
  });

  console.log(`Total:/ ${totalBotTickets}`);
};

const updateBotData = function (botId, betAmount, red, box) {
  const bot = botsInRoom[botId];
  if (!!bot) {
    bot.totalBet += betAmount;
    bot.red = red;
    bot.remainTickets--;

    Object.entries(box).forEach(([betType, betChoices]) => {
      Object.entries(betChoices).forEach(([betChoice, amount]) => {
        bot.choices.push({ [betType]: { [betChoice]: 0 } });
        bot.betOnChoices[betType][betChoice] = (bot.betOnChoices[betType][betChoice] || 0) + amount;
      });
    });
    //console.log("Bot " + botsInRoom[botId].name + " bet for " + betTypeChoice + " total " + botsInRoom[botId].totalBet);
    //console.log(botsInRoom[botId].betOnChoices);
  }
};

module.exports = {
  reset: reset,
  run: run,
  updateBalance: updateBalance,
};
