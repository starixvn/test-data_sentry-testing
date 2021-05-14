const UserInfo = require("../../Models/UserInfo");
const Chance = require("chance");

const Helpers = require("../../Helpers/Helpers");
const logger = require("./../../web/logger");
const ConfigHelper = require("./../../Helpers/ConfigHelper");
const constants = require("./constants");

let configs = null;
let botList = [];
let totalBotBet = 0;

const resetAmountOnChoice = {
  dragon: 0,
  tiger: 0,
  tie: 0,
};

let betAmountOnChoice = {
  dragon: 0,
  tiger: 0,
  tie: 0,
};

const betChoiceRatio = {
  MainOpts: 99,
  RareOpts: 1,
};

const chance = new Chance();
const betChoices = ["dragon", "tiger", "tie"];

let totalBotTickets = 0;
let totalSmallBotTickets = 0;

const ratioOfSmallTicket = 70;
const smallTicketScale = 50;

const resetBots = function () {
  configs = ConfigHelper.getConfigs(ConfigHelper.GameTypes.MiniDragonTiger);

  if (!!configs && configs.botenabled) {
    UserInfo.find(
      {
        type: true,
        disabled: false,
      },
      "id name red",
      function (err, blist) {
        if (err) {
          logger.logError(err);
        }

        if (blist.length) {
          Promise.all(
            blist.map(function (buser) {
              buser = buser._doc;
              delete buser._id;

              return buser;
            })
          )
            .then((result) => {
              let maxBot = Math.floor(result.length * ConfigHelper.getMaxBotForCurrentHour(ConfigHelper.GameTypes.MiniDragonTiger));

              botList = Helpers.shuffle(result);
              botList = botList.slice(0, maxBot);
              totalBotBet = 0;
            })
            .catch((promiseErr) => {
              logger.logError(promiseErr);
              console.log(promiseErr);
            });
        }
      }
    );
  } else {
    botList = [];
  }

  betAmountOnChoice = { ...resetAmountOnChoice };
};

const randomAddBots = (io) => {
  try {
    if (!!botList.length && io.miniDragonTiger.time > constants.lockBet) {
      const maxBotRandom = botList.length / io.miniDragonTiger.time;
      const botsToBet = chance.integer({ min: (maxBotRandom * 2) / 3, max: maxBotRandom });
      const botsToRemove = [];

      for (let i = 0; i < botsToBet; i++) {
        let bot = botList[i];
        botsToRemove.push(i);

        if (!!bot) {
          botPlaceBet(bot, io);
        }
      }

      botsToRemove.forEach((index) => {
        botList.splice(index, 1);
      });
    }
  } catch (err) {
    console.log(err);
  }
};

const botPlaceBet = (bot, io) => {
  try {
    const amountOnMainOpts = getBetAmountOnMainOpt();
    const isMain = totalBotBet == 0 ? true : (amountOnMainOpts * 100) / totalBotBet < betChoiceRatio.MainOpts;
    const boxIndex = isMain ? chance.integer({ min: 0, max: 1 }) : chance.integer({ min: 0, max: 2 });
    const isSmallTicket = totalBotTickets == 0 ? true : (totalSmallBotTickets * 100) / totalBotTickets < ratioOfSmallTicket;

    // console.log("RH - time " + io.miniDragonTiger.time + " - bot " + bot.name + " boxIndex " + boxIndex);

    const minBet = getMinBet();
    let maxBet = getMaxBet(betChoices[boxIndex], isSmallTicket, minBet);

    maxBet = Math.min(bot.red, maxBet);

    if (boxIndex == 2 && ((getBetAmountOnRareOpt() + maxBet) * 100) / totalBotBet > betChoiceRatio.RareOpts) {
      //tie opt
      maxBet = (betChoiceRatio.RareOpts * totalBotBet - getBetAmountOnRareOpt()) / 100;
    }

    const totalCuoc = Helpers.getRandomNumberStep5(minBet, maxBet, true);
    let dragonRed = 0;
    let tigerRed = 0;
    let tieRed = 0;

    switch (boxIndex) {
      case 0:
        dragonRed = totalCuoc;
        break;
      case 1:
        tigerRed = totalCuoc;
        break;
      case 2:
        tieRed = totalCuoc;
        break;
    }

    if (io.miniDragonTiger.time > constants.lockBet) {
      totalBotBet += dragonRed + tigerRed + tieRed;

      io.miniDragonTiger.data.dragon += dragonRed;
      io.miniDragonTiger.data.tiger += tigerRed;
      io.miniDragonTiger.data.tie += tieRed;

      betAmountOnChoice.dragon += dragonRed;
      betAmountOnChoice.tiger += tigerRed;
      betAmountOnChoice.tie += tieRed;

      totalBotTickets++;

      if (isSmallTicket) {
        totalSmallBotTickets++;
      }
    }
  } catch (err) {
    console.log(err);
  }
};

const getMinBet = () => {
  const minBet = !!configs && configs.minbet > 0 ? configs.minbet : 1;

  return minBet;
};

const getMaxBet = (choice, isSmallTicket, minBet) => {
  const maxBetForChoice = configs.choices_maxbet[choice];
  const maxBet = !!configs && configs.bot_maxbet > 0 ? configs.bot_maxbet : 10;

  return isSmallTicket ? Math.min(maxBetForChoice, maxBet, minBet * smallTicketScale, maxBet * 0.3) : Math.min(maxBetForChoice, maxBet);
};

const getBetAmountOnMainOpt = () => {
  return betAmountOnChoice.dragon + betAmountOnChoice.tiger;
};

const getBetAmountOnRareOpt = () => {
  return betAmountOnChoice.tie;
};

module.exports = {
  resetBots: resetBots,
  botPlaceBet: botPlaceBet,
  randomAddBots: randomAddBots,
};
