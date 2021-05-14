const KenoProMax_tmpcuoc = require("./../../Models/KenoProMax/KenoProMax_tmpcuoc");
const UserInfo = require("./../../Models/UserInfo");
const Chance = require("chance");
const chance = new Chance();

const Helpers = require("./../../Helpers/Helpers");
const logger = require("./../../web/logger");
const ConfigHelper = require("./../../Helpers/ConfigHelper");
const constants = require("./constants");
const appConstants = require("./../../appConstants");

const modRoundToChangedTopBot = 6;
const maxSmallTicketScale = 50;
const smallTicketRatio = 70;
const maxBetRatio = 20;
const defaultBotMaxBet = 10;

const uniqueBetChoices = ["big", "small", "even", "odd"];

const choiceGroupRatio = {
  BigSmall: 86,
  OddEven: 10,
  FiveElements: 4,
};

const BigSmallChoices = ["big", "small"];
const OddEvenChoices = ["even", "odd"];
const FiveElementChoices = ["earth", "fire", "gold", "water", "wood"];

const choices = ["big", "small", "even", "odd", "earth", "fire", "gold", "water", "wood"];

const minAmount = 200;
const resetAmountOnChoices = {
  big: 0,
  small: 0,
  even: 0,
  odd: 0,
  earth: 0,
  fire: 0,
  gold: 0,
  water: 0,
  wood: 0,
};

let configs = null;
let botsInRoom = {};
let maxNumberOfBots = 0;
let currentBotRatio = 0;
let changedTopBots = false;

let amountOnChoices = {
  big: 0,
  small: 0,
  even: 0,
  odd: 0,
  earth: 0,
  fire: 0,
  gold: 0,
  water: 0,
  wood: 0,
};

let totalBotTickets = 0;
let totalSmallBotTickets = 0;

const reset = async (kenoProMaxData) => {
  configs = ConfigHelper.getConfigs(ConfigHelper.GameTypes.KenoProMax);

  if (configs.botenabled) {
    const botRatio = ConfigHelper.getMaxBotForCurrentHour(ConfigHelper.GameTypes.KenoProMax);
    if (currentBotRatio != botRatio) {
      currentBotRatio = botRatio;

      const botUserCount = await UserInfo.countDocuments({ type: true, banned: false }).exec();

      maxNumberOfBots = Math.floor(botUserCount * currentBotRatio);
    }

    const disabledBots = await UserInfo.find({ type: true, disabled: true, banned: false }).lean().exec();

    disabledBots.forEach((bot) => {
      if (botsInRoom[bot.id]) {
        removeBot(bot.id, kenoProMaxData);
        delete botsInRoom[bot.id];
      }
    });

    changedTopBots = false;

    // console.log(`botsInRoom ${Object.keys(botsInRoom).length} maxNumberOfBots ${maxNumberOfBots}`);
  } else {
    removeAllBotPlayers(kenoProMaxData);
    removeAllBots();
  }

  // writeLogAllChoiceAmount(kenoProMaxData.players);
  resetBotData();
};

const removeAllBots = function () {
  botsInRoom = {};
  maxNumberOfBots = 0;
  currentBotRatio = 0;
};

const removeAllBotPlayers = function (kenoProMaxData) {
  const bots = Object.values(kenoProMaxData.players).filter(function (player) {
    return player.type;
  });
  bots.forEach((bot) => {
    removeBot(bot.id, kenoProMaxData);
  });
};

const run = async (kenoProMaxData) => {
  const addBotValue = 3;
  const removeBotValue = 4;
  const minBots = 20;

  if (!!configs && configs.botenabled && kenoProMaxData.remainingTime > constants.lockingBetDuration) {
    let activeBots = Object.keys(botsInRoom);
    let random = chance.integer({ min: 0, max: 5 });

    if ((activeBots.length <= minBots || random == addBotValue) && activeBots.length <= maxNumberOfBots) {
      const remainingOfBots = maxNumberOfBots - activeBots.length;
      if (remainingOfBots > 0) {
        await joinRoom(kenoProMaxData, maxNumberOfBots - activeBots.length);
      }
    }

    if (activeBots.length > minBots && random == removeBotValue) {
      leaveRoom(activeBots, kenoProMaxData);
    }

    const maxTickets = Math.floor(activeBots.length / kenoProMaxData.remainingTime) + 5;
    const numberBotsToBet = chance.integer({ min: 5, max: maxTickets });

    let botsToBet = Object.values(botsInRoom).filter(function (t) {
      return t.totalBet < configs.bot_maxbet && t.remainTickets > 0;
    });

    botsToBet = Helpers.shuffle(botsToBet);

    // console.log( "activeBots " + activeBots.length +" / botsToBet " + botsToBet.length + " round " + round + " remainingTime " + remainingTime);

    for (let i = 0; i < numberBotsToBet; i++) {
      let bot = botsToBet[i];

      if (!!bot) {
        await placeBet(bot, kenoProMaxData);
      }
    }
  }
};

const joinRoom = async (kenoProMaxData, remainingBots) => {
  let botsIn = [];
  let maxBotRandom = Math.floor(maxNumberOfBots / kenoProMaxData.remainingTime) + 1;
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
      // console.log(`joinRoom bot ${bot.name} id ${bot.id}`);

      botsInRoom[bot.id] = bot;
      resetBot(botsInRoom[bot.id]);

      botList.splice(i, 1);
      botsIn.push(bot);
    }
  }

  botsIn.forEach((bot) => {
    if (!kenoProMaxData.players[bot.id]) {
      Object.values(kenoProMaxData.realPlayers).forEach((user) => {
        user.red({
          kenoProMax: {
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

    kenoProMaxData.players[bot.id] = bot;
  });

  // console.log(`joinRoom ${length} - botsInRoom ${Object.keys(botsInRoom).length}`);
};

const leaveRoom = function (activeBots, kenoProMaxData) {
  let botsOut = [];
  let maxBotRemoveRandom = activeBots.length / kenoProMaxData.remainingTime;

  if (maxBotRemoveRandom < 4) {
    maxBotRemoveRandom = 4;
  }

  const outOfRedBots = Object.values(botsInRoom).filter(function (bot) {
    return bot.red < minAmount;
  });

  let length = chance.integer({ min: 1, max: maxBotRemoveRandom });

  for (let i = 0; i < length; i++) {
    const botToLeave = getBotToLeave(kenoProMaxData.roundId, activeBots, outOfRedBots);

    if (!!botToLeave) {
      botsOut.push(botToLeave);
      delete botsInRoom[botToLeave.id];
    }
  }

  botsOut.forEach((bot) => {
    if (!!bot) {
      removeBot(bot.id, kenoProMaxData);
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
  const gameRoom = inRoom ? ConfigHelper.GameTypes.KenoProMax : "";

  UserInfo.updateOne({ id: botId }, { inRoom: inRoom, inGameRoom: gameRoom }).catch((error) => {
    logger.logError(error);
  });
};

const removeBot = function (botId, kenoProMaxData) {
  updateInRoom(botId, false);

  delete kenoProMaxData.players[botId];

  Object.values(kenoProMaxData.realPlayers).forEach(function (user) {
    user.red({ kenoProMax: { outgame: { playerId: botId } } });
  });
};

const placeBet = async (bot, kenoProMaxData) => {
  try {
    const box = getBetChoice(bot);
    const isSmallTicket =
      totalBotTickets == 0 ? chance.integer({ min: 0, max: 1 }) : (totalSmallBotTickets * 100) / totalBotTickets < smallTicketRatio;

    const maxBet = getMaxBet(isSmallTicket, box, kenoProMaxData.remainingTime);
    const minBet = getMinBet();
    const betAmount = getBetAmount(minBet, maxBet);

    let currentTotalBet = 0;

    let currentBet = await KenoProMax_tmpcuoc.findOne({
      uid: bot.id,
      phien: kenoProMaxData.roundId,
    }).exec();

    if (!!currentBet) {
      choices.forEach((choice) => {
        currentTotalBet += currentBet[choice];
      });
    }

    if (!currentBet || currentTotalBet + betAmount <= maxBet) {
      const userInfo = await UserInfo.findOne({ id: bot.id }, "red").exec();

      if (kenoProMaxData.remainingTime > constants.lockingBetDuration && betAmount > 0 && userInfo && userInfo.red > betAmount) {
        userInfo.red -= betAmount;
        await userInfo.save();

        if (currentBet) {
          currentBet[box] += betAmount;
          await currentBet.save();
        } else {
          const update = {};
          update[box] = betAmount;

          let create = {
            uid: bot.id,
            name: bot.name,
            phien: kenoProMaxData.roundId,
            time: new Date(),
          };

          await KenoProMax_tmpcuoc.updateOne(
            { uid: bot.id, phien: kenoProMaxData.roundId },
            { $inc: update, $setOnInsert: create },
            { upsert: true, setDefaultsOnInsert: true }
          ).exec();
        }

        kenoProMaxData.totalBets[box] += betAmount;
        kenoProMaxData.chips[box][betAmount] += 1;

        amountOnChoices[box] += betAmount;
        totalSmallBotTickets += isSmallTicket ? 1 : 0;
        totalBotTickets += 1;
        updateBotData(bot.id, betAmount, userInfo.red, box);

        if (kenoProMaxData.players[bot.id]) {
          kenoProMaxData.players[bot.id].red = userInfo.red;
        }

        Object.values(kenoProMaxData.realPlayers).forEach(function (realPlayer) {
          realPlayer.red({
            kenoProMax: {
              playerChip: {
                playerId: bot.id,
                box: box,
                bet: betAmount,
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

const getBetChoice = function (bot) {
  let box;
  let betChoice = 0;

  const totalBotBet = getTotalBetAmount();
  const isBigSmall = totalBotBet == 0 ? true : (getBigSmallBetAmount() * 100) / totalBotBet < choiceGroupRatio.BigSmall;
  const isOddEven = (getOddEvenBetAmount() * 100) / totalBotBet < choiceGroupRatio.OddEven;

  if (isBigSmall) {
    betChoice = chance.integer({ min: 0, max: BigSmallChoices.length - 1 });
    box = BigSmallChoices[betChoice];
  } else {
    if (isOddEven) {
      betChoice = chance.integer({ min: 0, max: OddEvenChoices.length - 1 });
      box = OddEvenChoices[betChoice];
    } else {
      betChoice = chance.integer({ min: 0, max: FiveElementChoices.length - 1 });
      box = FiveElementChoices[betChoice];
    }
  }

  // console.log(`Keno bot ${bot.name} bet ${box}`);

  if (!!bot && bot.choices.length > 0 && uniqueBetChoices.includes(box)) {
    const previousUniqueBox = bot.choices.filter((choice) => uniqueBetChoices.includes(choice));

    if (!!previousUniqueBox && previousUniqueBox.length > 0) {
      box = previousUniqueBox[0];
    }
  }

  return box;
};

const getTotalBetAmount = function () {
  let total = 0;

  choices.forEach((choice) => {
    total += amountOnChoices[choice];
  });

  return total;
};

const getBigSmallBetAmount = () => {
  let total = 0;

  BigSmallChoices.forEach((choice) => {
    total += amountOnChoices[choice];
  });

  return total;
};

const getOddEvenBetAmount = () => {
  let total = 0;

  OddEvenChoices.forEach((choice) => {
    total += amountOnChoices[choice];
  });

  return total;
};

const getFiveElementsBetAmount = () => {
  let total = 0;

  FiveElementChoices.forEach((choice) => {
    total += amountOnChoices[choice];
  });

  return total;
};

const getMaxBet = function (isSmallTicket, choice, remainingTime) {
  const minBet = getMinBet();
  const maxBetOfSmallTicket = minBet * maxSmallTicketScale;
  const configBotMaxBet = !!configs && configs.bot_maxbet > 0 ? configs.bot_maxbet : defaultBotMaxBet;
  const configMaxBetChoice = uniqueBetChoices.includes(choice)
    ? configs.choices_maxbet[choice]
    : (configs.choices_maxbet[choice] * maxBetRatio) / 100;

  let choiceRatio = choiceGroupRatio.BigSmall;
  let amountOnGroupChoice = getBigSmallBetAmount();

  if (OddEvenChoices.includes(choice)) {
    choiceRatio = choiceGroupRatio.OddEven;
    amountOnGroupChoice = getOddEvenBetAmount();
  }

  if (FiveElementChoices.includes(choice)) {
    choiceRatio = choiceGroupRatio.FiveElements;
    amountOnGroupChoice = getFiveElementsBetAmount();
  }

  let remainingBetAmountOnChoice = (getTotalBetAmount() * choiceRatio) / 100 - amountOnGroupChoice;

  remainingBetAmountOnChoice = Math.max(remainingBetAmountOnChoice, minBet);
  const ratio = (remainingTime / constants.placingBetDuration) * 100;
  remainingBetAmountOnChoice = ratio > 50 ? configMaxBetChoice : remainingBetAmountOnChoice * ratio;

  // console.log(`configMaxBetChoice ${configMaxBetChoice} remainingBetAmountOnChoice ${remainingBetAmountOnChoice} configBotMaxBet ${configBotMaxBet}`);

  let maxBet = Math.min(configMaxBetChoice, remainingBetAmountOnChoice, configBotMaxBet);

  if (isSmallTicket) {
    maxBet = Math.min(maxBet, maxBetOfSmallTicket);
  }

  if (FiveElementChoices.includes(choice)) {
    maxBet = Math.min(minBet * 10, configBotMaxBet * 0.2, configMaxBetChoice);
  }

  const returnMaxBet = Math.max(maxBet, minBet);

  return returnMaxBet;
};

const getMinBet = function () {
  let minBet = 1;

  if (!!configs && configs.minbet > 0) {
    minBet = configs.minbet;
  }

  return minBet;
};

const resetBotData = function () {
  Object.keys(botsInRoom).forEach(function (id) {
    resetBot(botsInRoom[id]);
  });

  totalBotTickets = 0;
  totalSmallBotTickets = 0;

  amountOnChoices = {
    big: 0,
    small: 0,
    even: 0,
    odd: 0,
    earth: 0,
    fire: 0,
    gold: 0,
    water: 0,
    wood: 0,
  };
};

const resetBot = function (bot) {
  if (!!bot) {
    bot.totalBet = 0;
    bot.remainTickets = chance.integer({ min: 1, max: 3 });
    bot.choices = [];
    bot.betOnChoices = { ...resetAmountOnChoices };
  }
};

const updateBalance = function (botId, totalWin) {
  if (!!botsInRoom[botId]) {
    botsInRoom[botId].red += totalWin;
  }
};

const getBetAmount = function (minBet, maxBet) {
  let betAmount = Helpers.getRandomNumberStep5(minBet, maxBet, true);
  const betChips = Helpers.getRandomChips(betAmount);

  for (let index = 0; index < betChips.length; index++) {
    const chip = betChips[index];
    if (chip > 0) {
      betAmount = appConstants.chipList[index];

      break;
    }
  }

  return betAmount;
};

const writeLogAllChoiceAmount = function (players) {
  console.log("---------------------");
  console.log(`Total bot in room: ${Object.keys(botsInRoom).length}`);
  console.log(`Total players in room: ${Object.keys(players).length}`);
  console.log(`Total bot bet amount: ${getTotalBetAmount()}`);
  choices.forEach((choice) => {
    console.log(`Total bet on ${choice}: ${amountOnChoices[choice]}. Ratio: ${(amountOnChoices[choice] * 100) / getTotalBetAmount()}`);
  });

  console.log(`Small / Total: ${totalSmallBotTickets} / ${totalBotTickets}`);
};

const updateBotData = function (botId, betAmount, red, box) {
  if (!!botsInRoom[botId]) {
    botsInRoom[botId].totalBet += betAmount;
    botsInRoom[botId].choices.push(box);
    botsInRoom[botId].red = red;
    botsInRoom[botId].remainTickets--;
    botsInRoom[botId].betOnChoices[box] += betAmount;

    //console.log("Bot " + botsInRoom[botId].name + " bet for " + box + " total " + botsInRoom[botId].totalBet);
    // console.log(botsInRoom[botId].betOnChoices);
  }
};

module.exports = {
  reset: reset,
  run: run,
  updateBalance: updateBalance,
};
