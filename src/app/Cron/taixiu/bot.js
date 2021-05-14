const TXCuoc = require("../../Models/TaiXiu_cuoc");
const TXCuocOne = require("../../Models/TaiXiu_one");
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

const BalancingBetTime = 15;
const LockBetTime = 5;

const BalancingRatio = 80;
const BotBufferRatio = 20;
const RatioToStartBalancing = 2.2;

const resetBots = function () {
  configs = ConfigHelper.getConfigs(ConfigHelper.GameTypes.TaiXiu);

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
            let maxBot = Math.floor(result.length * ConfigHelper.getMaxBotForCurrentHour(ConfigHelper.GameTypes.TaiXiu));
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
      console.log(error);
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

  if (!!botList.length && io.TaiXiu_time > LockBetTime) {
    const maxBotRandom =
      io.TXTurbo_time < BalancingBetTime
        ? (botList.length - (botList.length * BotBufferRatio) / 100) / io.TaiXiu_time
        : botList.length / (io.TaiXiu_time - LockBetTime);

    const maxTickets =
      io.TaiXiu_time < BalancingBetTime ? Math.floor(maxBotRandom) : chance.integer({ min: (maxBotRandom * 2) / 3, max: maxBotRandom });

    const isNeedToBalance =
      io.taixiu.taixiu.red_tai / io.taixiu.taixiu.red_xiu > RatioToStartBalancing ||
      io.taixiu.taixiu.red_xiu / io.taixiu.taixiu.red_tai > RatioToStartBalancing;

    let choices = [];

    if (io.TaiXiu_time < BalancingBetTime || isNeedToBalance) {
      choices = generateBetChoices(maxTickets, io);
    }

    getBotsAndPlaceBet(io, maxBet, minBet, maxTickets, choices);
  }
  // else {
  //   console.log(`Tai: ${io.taixiu.taixiu.red_tai} / Xiu: ${io.taixiu.taixiu.red_xiu}`);
  //   console.log(`Unround: ${totalUnroundTickets} / Total: ${totalBotTickets}`);
  // }
};

const generateBetChoices = (maxTickets, io) => {
  let choices = [];
  const select = io.taixiu.taixiu.red_tai < io.taixiu.taixiu.red_xiu;
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

const placeBet = function (bot, io, maxBet, minBet, select) {
  const isSmallTicket = totalBotTickets == 0 ? true : (totalSmallBotTickets * 100) / totalBotTickets < ratioOfSmallTicket;
  const isUnround = totalBotTickets == 0 ? false : (totalUnroundTickets * 100) / totalBotTickets < ratioOfUnroundTicket;

  if (isSmallTicket) {
    let maxBetOfSmallTicket = Math.min(minBet * smallTicketScale, maxBet * 0.3);
    maxBet = Math.min(maxBetOfSmallTicket, maxBet);
  }

  const cuoc = Helper.getRandomAmount(minBet, maxBet, isUnround);

  // console.log(`TX bot ${bot.name} bet ${cuoc}`);

  if (io.TaiXiu_time > 5) {
    if (select) {
      io.taixiu.taixiu.red_tai += cuoc;
      io.taixiu.playerBetBigCount += 1;
    } else {
      io.taixiu.taixiu.red_xiu += cuoc;
      io.taixiu.playerBetSmallCount += 1;
    }

    TXCuoc.create({
      uid: bot.id,
      name: bot.name,
      phien: io.TaiXiu_phien,
      bet: cuoc,
      taixiu: true,
      select: select,
      red: true,
      time: new Date(),
    });

    const update = { bet: cuoc };
    const create = { uid: bot.id, phien: io.TaiXiu_phien, red: true, taixiu: true, select: select, time: new Date() };

    TXCuocOne.updateOne(
      { uid: bot.id, phien: io.TaiXiu_phien, red: true },
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
