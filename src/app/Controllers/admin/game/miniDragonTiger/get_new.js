
const MiniDragonTiger_phien = require('../../../../Models/MiniDragonTiger/MiniDragonTiger_phien');

const logger = require('../../../../web/logger');

module.exports = function (client) {
    MiniDragonTiger_phien.findOne({}, ['id', 'dragon', 'tiger'], { sort: { 'id': -1 } }, function (err, last) {
        if (err) {
            logger.logError(err);
        }

        if (last !== null) {
            client.red({
                mini_dragon_tiger:
                {
                    time_remain: client.redT.miniDragonTiger.time,
                    phien: last.id + 1,
                    result: [last.dragon, last.tiger]
                }
            });
        }
    });
}
