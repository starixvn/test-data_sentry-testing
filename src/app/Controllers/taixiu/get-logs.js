const TXPhien = require("../../Models/TaiXiu_phien");
const logger = require("./../../web/logger");

module.exports = (client) => {
    const data = { red_me_tai: 0, red_me_xiu: 0 };

    const active1 = new Promise((resolve, reject) => {
        TXPhien.find({}, {}, { sort: { _id: -1 }, limit: 125 }, function (err, post) {
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
        client.redT.taixiuAdmin.list.map(function (game) {
            try {
                if (client && client.profile && client.profile.name) {
                    if (game.name == client.profile.name) {
                        if (game.select) {
                            data.red_me_tai += game.bet;
                        } else {
                            data.red_me_xiu += game.bet;
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
            const { playerBetBigCount, playerBetSmallCount } = client.redT?.taixiu ?? { playerBetBigCount: 0, playerBetSmallCount: 0 };

            client.red({ taixiu: { logs, taixiu: data, playerBetBigCount, playerBetSmallCount } });
        } catch (ex) {
            logger.logError(ex);
        }
    });
};
