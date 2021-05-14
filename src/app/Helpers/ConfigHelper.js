const GameConfigs = require("../Models/GameConfig/GameConfigs");
const logger = require("../web/logger");

const GameTypes = {
  TaiXiu: "taixiu",
  XocXoc: "xocxoc",
  BauCua: "baucua",
  TXTurbo: "txturbo",
  ChanLe: "oddeven",
  CLTurbo: "oeturbo",
  MiniDragonTiger: "dragontiger",
  KenoProMax: "kenopromax",
  MiniSedie: "minisedie",
  Baccarat: "baccarat",
  KenoProViet: "kenoproviet",
  KenoMax: "kenomax",
  KenoMax2: "kenomax2",
  KenoMini: "kenomini",
  KenoMini2: "kenomini2",
  KenoEast: "kenoeast",
  KenoWest: "kenowest",
  KenoSouth: "kenosouth",
  KenoNorth: "kenonorth",
  Roulette: "roulette",
};

const configsDict = [];

const loadConfigs = function (configName) {
  GameConfigs.findOne({ name: configName })
    .exec()
    .then(function (data) {
      try {
        updateConfig(configName, data);

        // console.log("loaded " + configName);

        // console.log(data);
      } catch (err) {
        logger.logError(error);
      }
    })
    .catch(function (error) {
      logger.logError(error);
    });
};

const loadAllConfigs = function () {
  Promise.all([
    loadConfigs(GameTypes.TaiXiu),
    loadConfigs(GameTypes.XocXoc),
    loadConfigs(GameTypes.BauCua),
    loadConfigs(GameTypes.TXTurbo),
    loadConfigs(GameTypes.ChanLe),
    loadConfigs(GameTypes.CLTurbo),
    loadConfigs(GameTypes.MiniDragonTiger),
    loadConfigs(GameTypes.KenoProMax),
    loadConfigs(GameTypes.MiniSedie),
    loadConfigs(GameTypes.Baccarat),
    loadConfigs(GameTypes.KenoProViet),
    loadConfigs(GameTypes.KenoMax),
    loadConfigs(GameTypes.KenoMax2),
    loadConfigs(GameTypes.KenoMini),
    loadConfigs(GameTypes.KenoMini2),
    loadConfigs(GameTypes.KenoEast),
    loadConfigs(GameTypes.KenoWest),
    loadConfigs(GameTypes.KenoSouth),
    loadConfigs(GameTypes.KenoNorth),
  ]).catch(function (err) {
    if (err) console.log(err);
  });
};

const reloadConfigs = function (configName) {
  GameConfigs.findOne({ name: configName })
    .then(function (data) {
      updateConfig(configName, data);
    })
    .catch(function (error) {
      logger.logError(error);
    });
};

const getConfigs = function (configName) {
  if (!!configsDict && !!configsDict[configName]) {
    return configsDict[configName];
  }

  return null;
};

const updateConfig = function (configName, data) {
  if (!!configsDict) {
    configsDict[configName] = data;
  }
};

const getMaxBotForCurrentHour = function (configName) {
  const configs = getConfigs(configName);

  if (!!configs) {
    const currentHour = new Date().getUTCHours();

    if (!!configs.hour_maxbot && configs.hour_maxbot.length > 0) {
      return configs.hour_maxbot[currentHour];
    }

    return configs.maxbot;
  }

  return 0;
};

module.exports = {
  loadConfigs: loadConfigs,
  reloadConfigs: reloadConfigs,
  getConfigs: getConfigs,
  updateConfig: updateConfig,
  loadAllConfigs: loadAllConfigs,
  getMaxBotForCurrentHour: getMaxBotForCurrentHour,
  GameTypes: GameTypes,
};
