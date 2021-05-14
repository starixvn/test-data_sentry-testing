const ChanLeTurboPhien = require("../../../Models/ChanLeTurbo/ChanLeTurbo_phien");
const logger = require("./../../../web/logger");

module.exports = (client) => {
    const data = { red_me_chan: 0, red_me_le: 0 };

    const active1 = new Promise((resolve, reject) => {
        ChanLeTurboPhien.find({}, {}, { sort: { _id: -1 }, limit: 125 }, function (err, post) {
            if (err) {
                logger.logError(err);
                resolve([]);
                return;
            }

            if (post) {
                Promise.all(
                    post.map(function (obj) {
                        return { dice: [obj.dice1, obj.dice2, obj.dice3], phien: obj.id };
                    })
                ).then(function (arrayOfResults) {
                    resolve(arrayOfResults);
                });
            }
        });
    });

    const active2 = Promise.all(
        client.redT.clturboAdmin.list.map(function (game) {
            try {
                if (client && client.profile && client.profile.name) {
                    if (game.name == client.profile.name) {
                        if (game.select) {
                            data.red_me_chan += game.bet;
                        } else {
                            data.red_me_le += game.bet;
                        }
                    }
                }
            } catch (ex) {
                logger.logError(ex);
            }
        })
    );

    Promise.all([active1, active2]).then((values) => {
        try {
            const logs = values[0];
            const { playerBetEvenCount, playerBetOddCount } = client.redT?.clturbo ?? { playerBetEvenCount: 0, playerBetOddCount: 0 };

            client.red({ clturbo: { logs, clturbo: data, playerBetEvenCount, playerBetOddCount } });
        } catch (ex) {
            logger.logError(ex);
        }
    });
};
