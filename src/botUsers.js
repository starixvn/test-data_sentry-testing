let UserInfo = require("./app/Models/UserInfo");
const ConfigHelper = require("./app/Helpers/ConfigHelper");
const logger = require("./app/web/logger");

var resetInRoom = function () {
  UserInfo.updateMany({ type: true, inGameRoom: ConfigHelper.GameTypes.Baccarat }, { inRoom: false, inGameRoom: "" }).catch((error) => {
    logger.logError(error);
  });

  UserInfo.updateMany({ type: true, inGameRoom: ConfigHelper.GameTypes.KenoProMax }, { inRoom: false, inGameRoom: "" }).catch((error) => {
    logger.logError(error);
  });

  UserInfo.updateMany({ type: true, inGameRoom: ConfigHelper.GameTypes.Roulette }, { inRoom: false, inGameRoom: "" }).catch((error) => {
    logger.logError(error);
  });
};

module.exports = {
  resetInRoom: resetInRoom,
};
