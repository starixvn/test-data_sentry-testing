const TaiXiu = require("./taixiu/index.js");
const getLogChat = require("./taixiu/getLogChat");
const logger = require("./../web/logger");
const GameConfigs = require("../Models/GameConfig/GameConfigs");
const ConfigHelper = require("../Helpers/ConfigHelper.js");
const { taixiu } = require("../../config/appConfigs").gameIds;
const { checkGamePermission } = require("./game-permission-check.js");

module.exports = function (client, data) {
  try {
    const configs = ConfigHelper.getConfigs(ConfigHelper.GameTypes.TaiXiu);

    if (!checkGamePermission(client, configs, taixiu)) {
      return;
    }

    if (void 0 !== data.view) {
      client.gameEvent.viewTaiXiu = !!data.view;
    }

    if (!!data.get_time) {
      GameConfigs.findOne({ name: "taixiu" }, function (err, data) {
        try {
          if (err) {
            logger.logError(err);
          }

          if (client.redT == null) {
            return;
          }

          const disabled = data == null || !data.enabled;
          const disabledMessage = data == null ? "" : data.disabled_message;
          client.red({ taixiu: { time_remain: client.redT.TaiXiu_time, um: disabled, um_message: disabledMessage } });
        } catch (error) {
          logger.logError(error);
        }
      });
    }

    if (!!data.getLogs) {
      TaiXiu.getLogs(client);
    }
    if (!!data.cuoc) {
      TaiXiu.cuoc(client, data.cuoc);
    }

    if (!!data.get_phien) {
      TaiXiu.get_phien(client, data.get_phien);
    }
    if (!!data.get_log) {
      TaiXiu.get_log(client, data.get_log);
    }
    if (!!data.get_top) {
      TaiXiu.get_top(client, data.get_top);
    }
    if (!!data.get_new) {
      TaiXiu.getNew(client);
    }
    if (!!data.getLogChat) {
      getLogChat(client);
    }
  } catch (error) {
    logger.logError(error);
  }
};
