const config = require('../../../../config/appConfigs');
const Logger = require('../../../web/logger');
const logger = require('../../../web/logger');

/**
 * @param {string} input 
 */
const upercaseFirstCharacter = input =>
    input.length > 0 ? `${input[0].toUpperCase()}${input.substr(1)}` : '';

/**
 * @param {string} gameName
 * @param {Object} definitions
 * @returns {(client: object, data: object) => void}
 */
module.exports = (gameName, definitions = {}) => (client, data) => {
    if (!data[gameName]) {
        return;
    }

    const { view, sync, setResult } = data[gameName] || {};
    const proEnv = 'PRO';

    if (view) {
        client.gameEvent[`view${upercaseFirstCharacter(gameName)}`] = view;

        const { durations, choices } = definitions;
        client.red({ [gameName]: { durations, choices } });
    }

    if (sync) {
        const { roundRepository } = definitions;
        roundRepository.findOne({}, ['id', 'result', 'settlementResult'], { sort: { 'id': -1 } }, (err, round) => {
            try {
                const { remainingTime, roundId } = client.redT[gameName];
                const { result, settlementResult } = round;
                client.red({ [gameName]: { remainingTime, roundId, result, settlementResult } });
            } catch (error) {
                Logger.logError(error);
            }
        });
    }

    if (config.env !== proEnv && setResult) {
        client.redT[gameName].settlementResultFromAdmin = setResult;
        definitions.setResult && definitions.setResult(client, data);
    }
}