const l1Client = require("./clients/l1Client");
const appConfigs = require("./../../config/appConfigs");
const logger = require("./../web/logger").getLogger();

const authApi = {
  isError: (result) => {
    return result.errorCode != 0;
  },
  notifyUser: (result, client) => {
    if (result && client && authApi.isError(result)) {
      client.red({ apiError: { message: `${result.errorMessage} (${result.errorCode})` } });
    }
  },
  notifyLogin: (client, session, data, cb) => {
    if (appConfigs.enabledApi && session.siteId && session.memberId > 0) {
      var notifyLoginParam = {
        ObCustId: session.memberId,
        CharacterName: data.characterName,
        Seq: session.owSeq,
        SiteId: session.siteId,
        FirstLogin: data.firstLogin,
        Language: session.language,
      };

      const beforeMessage = logger.composeBeforeCallMessage(session, notifyLoginParam);

      l1Client.notifyLogin(
        notifyLoginParam,
        (result) => {
          authApi.notifyUser(result, client);

          cb && cb(result, client);
        },
        beforeMessage
      );
    }
  },
  verifyToken: l1Client.verifyToken,
};

module.exports = authApi;
