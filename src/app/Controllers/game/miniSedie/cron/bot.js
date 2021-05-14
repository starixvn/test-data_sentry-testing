let UserInfo = require("../../../../Models/UserInfo");
let Chance = require("chance");
const chance = new Chance();

let Helpers = require("../../../../Helpers/Helpers");
let logger = require("../../../../web/logger");
let ConfigHelper = require("../../../../Helpers/ConfigHelper");
const constants = require("./../constants");

const betChoiceRatio = {
  MainOpts: 94, //odd | even
  SubOpts: 5, //white3 | red3
  RareOpts: 1, //red4 | white4
};

let configs = null;
let botList = [];
let dataBot = {
  odd: 0,
  even: 0,
  red3: 0,
  red4: 0,
  white3: 0,
  white4: 0,
};

let totalBotTickets = 0;
let totalSmallBotTickets = 0;

const ratioOfSmallTicket = 70;

const reset = async () => {
  configs = ConfigHelper.getConfigs(ConfigHelper.GameTypes.MiniSedie);

  if (!!configs && configs.botenabled) {
    let bots = await UserInfo.find({ type: true, disabled: false }, "id name red").lean().exec();
    const maxBot = Math.floor(bots.length * ConfigHelper.getMaxBotForCurrentHour(ConfigHelper.GameTypes.MiniSedie));

    botList = Helpers.shuffle(bots);
    botList = botList.slice(0, maxBot);
  } else {
    botList = [];
  }
};

const run = function (miniSedieData) {
  if (!!botList.length && miniSedieData.remainingTime > constants.lockingBetDuration) {
    const maxBotRandom = botList.length / miniSedieData.remainingTime;
    const botsToBet = chance.integer({ min: (maxBotRandom * 2) / 3, max: maxBotRandom });

    let botsToRemove = [];

    for (let i = 0; i < botsToBet; i++) {
      let bot = botList[i];

      if (!!bot) {
        // botCount++;

        botPlaceBet(bot, miniSedieData);
        botsToRemove.push(i);
      }
    }

    botsToRemove.forEach((index) => {
      botList.splice(index, 1);
    });
  }
};

const botPlaceBet = function (bot, miniSedieData) {
  const isSmallTicket = totalBotTickets == 0 ? true : (totalSmallBotTickets * 100) / totalBotTickets < ratioOfSmallTicket;
  const choice = getBetChoice();
  const minBet = getMinBet();

  let maxBet = getMaxBet(choice, isSmallTicket, minBet);

  maxBet = Math.min(bot.red, maxBet);

  const betAmount = Helpers.getRandomNumberStep5(minBet, maxBet, true);

  if (miniSedieData.remainingTime > constants.lockingBetDuration) {
    miniSedieData.totalBets[choice] += betAmount;
    dataBot[choice] += betAmount;

    totalBotTickets++;

    if (isSmallTicket) {
      totalSmallBotTickets++;
    }

    // console.log(`Mini Sedie bot ${bot.name} bet ${betAmount} choice ${choice}`);

    bot = null;
  }
};

const getMinBet = function () {
  const minBet = !!configs && configs.minbet > 0 ? configs.minbet : 1;

  return minBet;
};

const getMaxBet = function (choice, isSmallTicket, minBet) {
  const maxBetForChoice = configs.choices_maxbet[choice];
  const maxBet = !!configs && configs.bot_maxbet > 0 ? configs.bot_maxbet : 10;

  if (isMainOpt(choice)) {
    return isSmallTicket ? Math.min(maxBetForChoice, minBet * 50, maxBet * 0.3) : Math.min(maxBetForChoice, maxBet);
  }

  if (isSubOpt(choice)) {
    return isSmallTicket ? Math.min(maxBetForChoice, minBet * 50, maxBet * 0.2) : Math.min(maxBetForChoice, maxBet * 0.5);
  }

  return Math.min(maxBetForChoice, minBet * 10, maxBet * 0.2);
};

const getBetChoice = () => {
  let choice;
  let betChoiceIndex = 0;
  const totalBotBet = dataBot.odd + dataBot.even + dataBot.red3 + dataBot.red4 + dataBot.white3 + dataBot.white4;
  const totalBotBetMain = dataBot.odd + dataBot.even;

  let isMain = totalBotBet == 0 ? true : (totalBotBetMain * 100) / totalBotBet < betChoiceRatio.MainOpts;
  let isEvent = false;

  if (isMain) {
    betChoiceIndex = Math.floor(Math.random() * 2);
  } else {
    let totalBetSubEvent = dataBot.red3 + dataBot.white3;
    isEvent = (totalBetSubEvent * 100) / totalBotBet < betChoiceRatio.SubOpts;
    betChoiceIndex = isEvent ? Math.floor(Math.random() * 2) + 2 : Math.floor(Math.random() * 2) + 4;
  }

  choice = constants.choices[betChoiceIndex];

  return choice;
};

const isSubOpt = (choice) => {
  return choice == "white3" || choice == "red3";
};

const isMainOpt = (choice) => {
  return choice == "odd" || choice == "even";
};

module.exports = {
  reset: reset,
  run: run,
};
