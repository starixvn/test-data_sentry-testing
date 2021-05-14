
const ChanLePhien = require('../../../../Models/ChanLe/ChanLe_phien');
const logger = require('../../../../web/logger');

module.exports = function (client) {
	ChanLePhien.findOne({}, ['id', 'dice1', 'dice2', 'dice3'], { sort: { 'id': -1 } }, function (err, last) {
		console.log(client.redT.ChanLe_Time);
		if (err) {
			logger.logError(err);
		}

		try {
			if (last !== null) {
				const { id, dice1, dice2, dice3 } = last;
				client.red({ chanle: { phien: id + 1, time_remain: client.redT.ChanLe_time, dices: [dice1, dice2, dice3] } });
			}
		} catch (error) {
			logger.logError(err);
		}
	})
}
