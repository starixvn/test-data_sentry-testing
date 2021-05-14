const ConfigHelper = require("./../../../../Helpers/ConfigHelper");

module.exports = (player) => {
  const configs = ConfigHelper.getConfigs(ConfigHelper.GameTypes.KenoProViet);
  const gameConfigs = {
    minbet: configs.minbet,
    maxbet: configs.maxbet,
    choices_maxbet: configs.choices_maxbet,
    odds: configs.odds,
  };

  player.red({ kenoProViet: { gameConfigs } });
};
