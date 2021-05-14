
const ChanLeTurboPhien = require('../../../../Models/ChanLeTurbo/ChanLeTurbo_phien');
const logger = require('../../../../web/logger');

module.exports = function (client) {
	ChanLeTurboPhien.findOne({}, ['id', 'dice1', 'dice2', 'dice3'], { sort: { 'id': -1 } }, function (err, last) {

		if (err) {
			logger.logError(err);
		}

		try {
			if (last !== null) {
				const { id, dice1, dice2, dice3 } = last;
				client.red({ clturbo: { phien: id + 1, time_remain: client.redT.ChanLeTurbo_time, dices: [dice1, dice2, dice3] } });
			}
		} catch (error) {
			logger.logError(err);
		}
	})
}
