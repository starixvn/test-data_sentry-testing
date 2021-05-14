const ChanLeCuoc = require("../../Models/ChanLe/ChanLe_cuoc");
const ChanLeCuocOne = require("../../Models/ChanLe/ChanLe_one");
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
  configs = ConfigHelper.getConfigs(ConfigHelper.GameTypes.ChanLe);

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
            let maxBot = Math.floor(result.length * ConfigHelper.getMaxBotForCurrentHour(ConfigHelper.GameTypes.ChanLe));
            // console.log("ChanLe max bot " + maxBot);
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

  if (!!botList.length && io.ChanLe_time > LockBetTime) {
    const maxBotRandom =
      io.ChanLe_time < BalancingBetTime
        ? (botList.length - (botList.length * BotBufferRatio) / 100) / io.ChanLe_time
        : botList.length / (io.ChanLe_time - LockBetTime);

    const maxTickets =
      io.ChanLe_time < BalancingBetTime ? Math.floor(maxBotRandom) : chance.integer({ min: (maxBotRandom * 2) / 3, max: maxBotRandom });

    const isNeedToBalance =
      io.chanle.chanle.red_chan / io.chanle.chanle.red_le > RatioToStartBalancing ||
      io.chanle.chanle.red_le / io.chanle.chanle.red_chan > RatioToStartBalancing;

    let choices = [];

    if (io.ChanLe_time < BalancingBetTime || isNeedToBalance) {
      choices = generateBetChoices(maxTickets, io);
    }

    getBotsAndPlaceBet(io, maxBet, minBet, maxTickets, choices);
  }
  // else {
  //   console.log(`Chan: ${io.chanle.chanle.red_chan} / Le: ${io.chanle.chanle.red_le}`);
  //   console.log(`Unround: ${totalUnroundTickets} / Total: ${totalBotTickets}`);
  // }
};

const generateBetChoices = (maxTickets, io) => {
  let choices = [];

  const select = io.chanle.chanle.red_chan < io.chanle.chanle.red_le;
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

  const betAmount = Helper.getRandomAmount(minBet, maxBet, isUnround);

  if (io.ChanLe_time > 5) {
    // console.log(`OddEvent bot ${bot.name} bet ${betAmount}`);

    if (select) {
      io.chanle.chanle.red_chan += betAmount;
      io.chanle.playerBetEvenCount += 1;
    } else {
      io.chanle.chanle.red_le += betAmount;
      io.chanle.playerBetOddCount += 1;
    }

    ChanLeCuoc.create({ uid: bot.id, name: bot.name, phien: io.ChanLe_phien, bet: betAmount, select: select, red: true, time: new Date() });

    const update = { bet: betAmount };
    const create = { uid: bot.id, phien: io.ChanLe_phien, red: true, select: select, time: new Date() };

    ChanLeCuocOne.updateOne(
      { uid: bot.id, phien: io.ChanLe_phien, red: true },
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
