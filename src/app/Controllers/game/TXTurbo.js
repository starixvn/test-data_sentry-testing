const logger = require("./../../web/logger");
const GameConfigs = require("../../Models/GameConfig/GameConfigs");

let getLogs = require("./TXTurbo/getLogs");
let cuoc = require("./TXTurbo/cuoc");
let getPhien = require("./TXTurbo/getPhien");
let getLog = require("./TXTurbo/getLog");
let getNew = require("./TXTurbo/getNew");
const ConfigHelper = require("../../Helpers/ConfigHelper");
const { checkGamePermission } = require("../game-permission-check");
const { txturbo } = require("../../../config/appConfigs").gameIds;


module.exports = function (client, data) {
  try {
    const configs = ConfigHelper.getConfigs(ConfigHelper.GameTypes.TXTurbo);

    if (!checkGamePermission(client, configs, txturbo)) {
      return false;
    }
  
    if (void 0 !== data.view) {
      client.gameEvent.viewTaiXiuTurbo = !!data.view;
    }

    if (!!data.get_time) {
      GameConfigs.findOne({ name: "txturbo" }, function (err, data) {
        try {
          if (err) {
            logger.logError(err);
          }

          if (client.redT == null) {
            return;
          }

          var disabled = data == null || !data.enabled;
          var disabledMessage = data == null ? "" : data.disabled_message;
          client.red({ taixiu_turbo: { time_remain: client.redT.TXTurbo_time, um: disabled, um_message: disabledMessage } });
        } catch (error) {
          logger.logError(error);
        }
      });
    }

    if (!!data.getLogs) {
      getLogs(client);
    }
    if (!!data.cuoc) {
      cuoc(client, data.cuoc);
    }
    if (!!data.get_phien) {
      getPhien(client, data.get_phien);
    }
    if (!!data.get_log) {
      getLog(client, data.get_log);
    }
    if (!!data.get_new) {
      getNew(client);
    }
  } catch (error) {
    logger.logError(error);
  }
};
