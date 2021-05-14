const apiSettings = require('./../../../config/appConfigs').apiSettings;
const l1Client = require('l1.client.node-js')(apiSettings);
const logger = require('./../../web/logger').getLogger();

l1Client.autoUpdateToken((error, result) => {
    if (error) {
        logger.logError(error);
    } else {
        logger.log(result);
    }
});

const errors = {
    placeBetFailed: { errorCode: 'SB1900', errorMessage: 'Đặt cược không thành công.' },
    endGameFailed: { errorCode: 'SB1901', errorMessage: 'Phiên chơi bị lỗi. Vui lòng liên hệ bộ phận CSKH để được hỗ trợ.' },
    getBalanceFailed: { errorCode: 'SB1902', errorMessage: 'Không thể cập nhật số tiền trong tài khoản.' },
    enterPortalFailed: { errorCode: `SB1903`, errorMessage: 'Đã xảy ra lỗi. Vui lòng liên hệ bộ phận CSKH để đươc hỗ trợ.' },
    accountClosed: { errorCode: '2002', errorMessage: 'Tài khoản của bạn đã bị khoá.' }
}

const warningErrorCodes = [
    3003, 3004, 3006, 3007, 3008, 3009, 3014, 2002, 2005, 3010, 3013, 3002
];

const apiClient = {
    isError: (response) => {
        return response && response.result && response.result.errorCode != 0;
    },
    getLogLevel: (response) => {
        if (response
            && response.result
            && response.result.errorCode != 0) {
            return warningErrorCodes.includes(response.result.errorCode) ? 'warning' : 'error';
        }

        return 'info';
    },
    getBalance: (getBalanceParams, cb, beforeMessage) => {

        l1Client
            .member
            .balance(getBalanceParams)
            .then(response => {
                if (apiClient.isError(response)) {
                    logger.logAfterSendToApi('Get Balance', getBalanceParams, response, beforeMessage, apiClient.getLogLevel(response));
                }
                
                let result = response.result;
                result.red = result.balance;

                cb && cb(result);
            })
            .catch(error => {
                logger.logAfterSendToApi('Error Get Balance', getBalanceParams, error, beforeMessage, 'error');
                logger.logError(error);
                cb && cb(errors.getBalanceFailed);
            });
    },
    placeBet: (placeBetParams, cb, beforeMessage) => {

        l1Client
            .member
            .placeBet(placeBetParams, { requestTimeout: apiSettings.placeBetTimeout })
            .then(response => {
                if (apiClient.isError(response)) {
                    logger.logAfterSendToApi('Place Bet', placeBetParams, response, beforeMessage, apiClient.getLogLevel(response));
                }

                cb && cb(response.result);
            })
            .catch(error => {
                logger.logAfterSendToApi('Error Place Bet', placeBetParams, error, beforeMessage, 'error');
                logger.logError(error);
                cb && cb(errors.placeBetFailed);
            });
    },
    endGame: (endGameParams, cb, beforeMessage) => {

        l1Client
            .member
            .endGame(endGameParams)
            .then(response => {
                if (apiClient.isError(response)) {
                    logger.logAfterSendToApi('End Game', endGameParams, response, beforeMessage, apiClient.getLogLevel(response));
                }

                cb && cb(response.result);
            })
            .catch(error => {
                logger.logAfterSendToApi('Error End Game', endGameParams, error, beforeMessage, 'error');
                logger.logError(error);
                cb && cb(errors.endGameFailed);
            });
    },
    notifyLogin: (notifyLoginParams, cb, beforeMessage) => {
        l1Client
            .member
            .notifyLogin(notifyLoginParams)
            .then(response => {
                if (apiClient.isError(response)) {
                    logger.logAfterSendToApi('Notify Login', notifyLoginParams, response, beforeMessage, apiClient.getLogLevel(response));
                }

                cb && cb(response.result);
            })
            .catch(error => {
                logger.logAfterSendToApi('Error Notify Login', notifyLoginParams, error, beforeMessage, 'error');
                logger.logError(error);
                cb && cb(errors.enterPortalFailed);
            });
    },
    verifyToken: async (verifyTokenParams) => {
        try {
            const result = await l1Client.auth.verifyToken(verifyTokenParams);

            return result;
        }
        catch (ex) {
            logger.logError(ex);
            return null;
        }
    },
    getBetLimit: (getBetLimitParams, cb, beforeMessage) => {
        l1Client
            .member
            .getBetLimit(getBetLimitParams)
            .then(response => {
                if (apiClient.isError(response)) {
                    logger.logAfterSendToApi('Get Bet Limit', getBetLimitParams, response, beforeMessage, apiClient.getLogLevel(response));
                }

                cb && cb(response.result);
            })
            .catch(error => {
                logger.logAfterSendToApi('Error Get Bet Limit', getBetLimitParams, error, beforeMessage, 'error');
                logger.logError(error);
                cb && cb(errors.placeBetFailed);
            });
    },
}

module.exports = apiClient;