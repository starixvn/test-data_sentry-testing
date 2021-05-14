const TXTurboCuoc = require("../../Models/TXTurbo/TXTurbo_cuoc");
const TXTurboCuocOne = require("../../Models/TXTurbo/TXTurbo_one");
const UserInfo = require("../../Models/UserInfo");
const Chance = require("chance");

const Helper = require("../../Helpers/Helpers");
const ConfigHelper = require("../../Helpers/ConfigHelper");
const chance = new Chance();
const logger = require("../../web/logger");

let botList = [];
let configs = null;

let totalBotTickets = 0;
let totalSmallBotTickets = 0;
let totalUnroundTickets = 0;

const ratioOfSmallTicket = 70;
const ratioOfUnroundTicket = 70;
const smallTicketScale = 50;

const BalancingBetTime = 9;
const LockBetTime = 5;
const BalancingRatio = 80;
const BotBufferRatio = 20;
const RatioToStartBalancing = 2.2;

const resetBots = function () {
  configs = ConfigHelper.getConfigs(ConfigHelper.GameTypes.TXTurbo);

  if (!!configs && configs.botenabled) {
    try {
      UserInfo.find({ type: true, disabled: false }, "id name", function (err, list) {
        if (list.length) {
          Promise.all(
            list.map(function (user) {
              user = user._doc;
              delete user._id;
              return user;
            })
          ).then((result) => {
            const maxBot = Math.floor(result.length * ConfigHelper.getMaxBotForCurrentHour(ConfigHelper.GameTypes.TXTurbo));

            botList = Helper.shuffle(result);
            botList = botList.slice(0, maxBot);
          });
        }
      });

      totalSmallBotTickets = 0;
      totalUnroundTickets = 0;
      totalBotTickets = 0;
    } catch (error) {
      botList = [];
      logger.logError(error);
    }
  } else {
    botList = [];
  }
};

const botPlacesBets = function (io) {
  let maxBet = 10;
  let minBet = 1;
  if (!!configs) {
    if (!!configs.bot_maxbet && configs.bot_maxbet > 0) {
      maxBet = configs.bot_maxbet;
    }
    if (configs.minbet > 0) {
      minBet = configs.minbet;
    }
  }

  if (!!botList.length && io.TXTurbo_time > LockBetTime) {
    const maxBotRandom =
      io.TXTurbo_time < BalancingBetTime
        ? (botList.length - (botList.length * BotBufferRatio) / 100) / io.TXTurbo_time
        : botList.length / (io.TXTurbo_time - LockBetTime);

    const maxTickets =
      io.TXTurbo_time < BalancingBetTime ? Math.floor(maxBotRandom) : chance.integer({ min: (maxBotRandom * 2) / 3, max: maxBotRandom });

    const isNeedToBalance =
      io.taixiu_turbo.taixiu.red_tai / io.taixiu_turbo.taixiu.red_xiu > RatioToStartBalancing ||
      io.taixiu_turbo.taixiu.red_xiu / io.taixiu_turbo.taixiu.red_tai > RatioToStartBalancing;

    let choices = [];

    if (io.TXTurbo_time < BalancingBetTime || isNeedToBalance) {
      choices = generateBetChoices(maxTickets, io);
    }

    getBotsAndPlaceBet(io, maxBet, minBet, maxTickets, choices);
  }
  // else {
  //   console.log(`Tai: ${io.taixiu_turbo.taixiu.red_tai} / Xiu: ${io.taixiu_turbo.taixiu.red_xiu}`);
  //   console.log(`Unround: ${totalUnroundTickets} / Total: ${totalBotTickets}`);
  // }
};

const generateBetChoices = (maxTickets, io) => {
  let choices = [];
  const select = io.taixiu_turbo.taixiu.red_tai < io.taixiu_turbo.taixiu.red_xiu;
  const ticketsForSmallestChoice = (maxTickets * BalancingRatio) / 100;

  for (let index = 0; index < ticketsForSmallestChoice; index++) {
    choices.push(select);
  }

  for (let index = ticketsForSmallestChoice; index < maxTickets; index++) {
    choices.push(!select);
  }

  choices = Helper.shuffle(choices);

  return choices;
};

const getBotsAndPlaceBet = (io, maxBet, minBet, maxTickets, choices) => {
  for (let index = 0; index < maxTickets; index++) {
    let dataT = botList[index];
    if (!!dataT) {
      const select = choices.length > 0 ? choices[index] : chance.bool();
      placeBet(dataT, io, maxBet, minBet, select);
    }
    dataT = null;
  }

  botList.splice(0, maxTickets);
};

let placeBet = function (bot, io, maxBet, minBet, select) {
  const isSmallTicket = totalBotTickets == 0 ? true : (totalSmallBotTickets * 100) / totalBotTickets < ratioOfSmallTicket;
  const isUnround = totalBotTickets == 0 ? false : (totalUnroundTickets * 100) / totalBotTickets < ratioOfUnroundTicket;

  if (isSmallTicket) {
    const maxBetOfSmallTicket = Math.min(minBet * smallTicketScale, maxBet * 0.3);
    maxBet = Math.min(maxBetOfSmallTicket, maxBet);
  }

  const betAmount = Helper.getRandomAmount(minBet, maxBet, isUnround);

  if (io.TXTurbo_time > LockBetTime) {
    // console.log(`TX Turbo bot ${bot.name} bet ${betAmount} for choice ${select}`);

    if (select) {
      io.taixiu_turbo.taixiu.red_tai += betAmount;
      io.taixiu_turbo.playerBetBigCount += 1;
    } else {
      io.taixiu_turbo.taixiu.red_xiu += betAmount;
      io.taixiu_turbo.playerBetSmallCount += 1;
    }

    TXTurboCuoc.create({
      uid: bot.id,
      name: bot.name,
      phien: io.TXTurbo_phien,
      bet: betAmount,
      taixiu: true,
      select: select,
      red: true,
      time: new Date(),
    });

    const update = { bet: betAmount };

    const create = { uid: bot.id, phien: io.TXTurbo_phien, red: true, taixiu: true, select: select, time: new Date() };

    TXTurboCuocOne.updateOne(
      { uid: bot.id, phien: io.TXTurbo_phien, red: true },
      { $inc: update, $setOnInsert: create },
      { upsert: true, setDefaultsOnInsert: true },
      function (err, doc) {
        if (err) {
          logger.logError(err);
          console.log(err);
        }
      }
    );

    totalBotTickets++;

    if (isSmallTicket) {
      totalSmallBotTickets++;
    }

    if (isUnround) {
      totalUnroundTickets++;
    }
  }
};

module.exports = {
  botPlacesBets: botPlacesBets,
  resetBots: resetBots,
};
