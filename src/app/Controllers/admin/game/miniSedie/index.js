const MiniSediePhien = require("./../../../game/miniSedie/models/MiniSedie_phien");
const logger = require('../../../../web/logger');

module.exports = (client, data) => {
    if (data.view != null) {
        client.gameEvent.viewMiniSedie = data.view;
    }

    if (data.sync != null) {
        MiniSediePhien.findOne({}, ['id', 'red1', 'red2', 'red3', 'red4'], { sort: { 'id': -1 } }, (err, round) => {

            try {
                const miniSedie = client.redT.miniSedie;
                const { remainingTime, roundId } = miniSedie;

                client.red({
                    miniSedie: {
                        remainingTime,
                        roundId,
                        result: { red1: round.red1, red2: round.red2, red3: round.red3, red4: round.red4, }
                    }
                });
            } catch (error) {
                logger.logError(error);
            }

        });
    }
};