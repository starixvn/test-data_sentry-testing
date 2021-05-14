
const GameConfigs = require('./../../Models/GameConfig/GameConfigs');
const logger = require('./../../web/logger');
module.exports = function (client) {
	GameConfigs.findOne({ name: "baucua" }, function (err, data) {
		if (err) {
			logger.logError(err);
		}

		let disabled = (data == null || !data.enabled);
		if (disabled) {
			return;
		}
		try {
			if (client == null || client.redT == null || client.redT.BauCua_time == null) {
				return;
			}

			client.red({
				mini: { baucua: { time_remain: client.redT.BauCua_time } }
			});
		} catch (ex) {
			logger.logError(ex);
		}
	});
	GameConfigs.findOne({ name: "taixiu" }, function (err, data) {
		if (err) {
			logger.logError(err);
		}

		let disabled = (data == null || !data.enabled);
		if (disabled) {
			return;
		}
		try {
			if (client == null || client.redT == null || client.redT.TaiXiu_time == null) {
				return;
			}

			client.red({ taixiu: { time_remain: client.redT.TaiXiu_time }, });
		} catch (ex) {
			logger.logError(ex);
		}
	});
	GameConfigs.findOne({ name: "txturbo" }, function (err, data) {
		if (err) {
			logger.logError(err);
		}

		let disabled = (data == null || !data.enabled);
		if (disabled) {
			return;
		}
		try {

			if (client == null || client.redT == null || client.redT.TXTurbo_time == null) {
				return;
			}

			client.red({ taixiu_turbo: { time_remain: client.redT.TXTurbo_time }, });
		} catch (ex) {
			logger.logError(ex);
		}
	});
}
