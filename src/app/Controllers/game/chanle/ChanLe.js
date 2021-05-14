const ChanLe = require("./index.js");
const logger = require("./../../../web/logger");
const GameConfigs = require("../../../Models/GameConfig/GameConfigs");
const ConfigHelper = require("../../../Helpers/ConfigHelper");

module.exports = function (client, data) {
  try {
    if (void 0 !== data.view) {
      client.gameEvent.viewChanLe = !!data.view;
    }

    if (!!data.get_time) {
      GameConfigs.findOne({ name: ConfigHelper.GameTypes.ChanLe }, function (err, data) {
        try {
          if (err) {
            logger.logError(err);
          }

          if (client.redT == null) {
            return;
          }

          const disabled = data == null || !data.enabled;
          const disabledMessage = data == null ? "" : data.disabled_message;
          client.red({ chanle: { time_remain: client.redT.ChanLe_time, um: disabled, um_message: disabledMessage } });
        } catch (ex) {
          logger.logError(ex);
        }
      });
    }

    if (!!data.getLogs) {
      ChanLe.getLogs(client);
    }
    if (!!data.cuoc) {
      ChanLe.cuoc(client, data.cuoc);
    }

    if (!!data.get_phien) {
      ChanLe.get_phien(client, data.get_phien);
    }
    if (!!data.get_log) {
      ChanLe.get_log(client, data.get_log);
    }
    if (!!data.get_top) {
      ChanLe.get_top(client, data.get_top);
    }
    if (!!data.get_new) {
      ChanLe.getNew(client);
    }
  } catch (error) {
    logger.logError(error);
  }
};
