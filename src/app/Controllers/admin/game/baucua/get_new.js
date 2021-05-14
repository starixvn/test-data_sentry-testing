const BauCuaPhien = require('../../../../Models/BauCua/BauCua_phien');
const logger = require('../../../../web/logger');

module.exports = function (client) {
	BauCuaPhien.findOne({}, ['id', 'dice1', 'dice2', 'dice3'], {
		sort: {
			'id': -1
		}
	}, function (err, last) {
		if (err) {
			logger.logError(err);
		}

		if (last !== null) {
			try {
				client.red({
					baucua: {
						phien: last.id + 1,
						dices: [last.dice1, last.dice2, last.dice3],
						time_remain: client.redT.BauCua_time
					}
				});
			} catch (error) {
				logger.logError(error);
			}

		}
	});
}