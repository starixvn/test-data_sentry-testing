const logger = require('./../web/logger').getLogger();

let redT = null;

function assignRedT(globalRedT) {
    redT = globalRedT;
};

function handleUnderMaintenance(umInfo) {
    try {
        if (umInfo && redT) {
            if (redT.users && umInfo.isUM) {
                Object.values(redT.users).forEach(function (users) {
                    users.forEach((realPlayer) => forceClosedConnection(realPlayer, umInfo));
                });
            }

            redT.umInfo = umInfo;
        }
    }
    catch (ex) {
        logger.logError(ex);
    }
}

function forceClosedConnection(realPlayer, umInfo) {
    try {
        if (umInfo == null) {
            umInfo = redT.umInfo;
        }

        realPlayer.red({ kickedOut: { message: 'Game đang được bảo trì, vui lòng quay lại sau 10 phút.', umInfo: umInfo } });
        realPlayer.close();
    } catch (error) {
        logger.logError(error);
    }
}

function isUM() {
    return redT
        && redT.umInfo
        && redT.umInfo.isUM;
}

function reload() {
    try {
        if (redT) {
            if (redT.users) {
                Object.values(redT.users).forEach(function (users) {
                    users.forEach(function (cacheClient) {
                        cacheClient.red({ reload: true });
                    });
                });
            }
        }
    }
    catch (ex) {
        logger.logError(ex);
    }
}

module.exports = {
    assignRedT,
    handleUnderMaintenance,
    reload,
    forceClosedConnection,
    isUM
}