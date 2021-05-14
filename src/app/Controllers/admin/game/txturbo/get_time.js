
const TXTurboPhien = require('../../../../Models/TXTurbo/TXTurbo_phien');
const logger = require('../../../../web/logger');

module.exports = function (client) {
    TXTurboPhien.findOne({}, ['id', 'dice1', 'dice2', 'dice3'], { sort: { 'id': -1 } }, function (err, last) {
        if (err) {
            logger.logError(err);
        }

        try {
            if (last !== null) {
                const { id, dice1, dice2, dice3 } = last;
                client.red({ taixiu_turbo: { phien: id + 1, time_remain: client.redT.TXTurbo_time, dices: [dice1, dice2, dice3] } });
            }
        } catch (error) {
            logger.logError(err);
        }
    })
}
