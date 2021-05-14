const appConfigs = require('../../config/appConfigs');

module.exports = function (ws) {
    ws.options = {
        verifyClient: async (info, callback) => {
            const origin = info.req.headers.origin;

            if (!appConfigs.enableCorsWs) {
                callback(true);
                return;
            }

            if (appConfigs.corsUrls.indexOf(origin) !== -1 || !origin) {
                callback(true)
            } else {
                callback(false, 401, `Not allowed by CORS ${origin}`);
            }
        }
    }
}