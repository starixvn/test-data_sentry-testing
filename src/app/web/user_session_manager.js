const randomString = require("randomstring");
const UserSession = require("./../Models/UserSessions");
const logger = require("./logger").getLogger();

async function initUserSessionWithSignInFlow(username) {
  const data = { memberKey: username };
  const authParams = {
    browserUserAgent: "browserUserAgent",
    ip: "localhost",
  };

  return await initUserSession(data, authParams);
}

async function initUserSession(data, authParams) {
  let userSession = await UserSession.findOne({ ssoToken: authParams.token });

  if (!userSession) {
    const sessionId = randomString.generate() + "_" + data.memberKey;
    userSession = await UserSession.create({
      ssoToken: authParams.token,
      sessionId: sessionId,
      owSeq: data.seq,
      username: data.memberKey,
      memberId: data.memberId,
      ssoTime: new Date(),
      recheckInTime: new Date(),
      ip: authParams.ip,
      browserUserAgent: authParams.browserUserAgent,
      siteId: data.siteId,
      userId: data.userId,
      language: data.language,
      currency: data.currency,
      clientId: data.clientId,
      memberName: data.memberName,
      siteName: getSiteName(data.seq),
    });
  }

  return userSession;
}

function getSiteName(seq) {
  return seq.split(",")[2];
}

async function verifyUserSession(sessionId, authUsername, userAgent) {
  let userSession = null;
  let isAuthenticated = false;

  if (!!sessionId) {
    try {
      userSession = await UserSession.findOne({ sessionId: sessionId });

      if (
        !!userSession &&
        userSession.username === authUsername &&
        userSession.browserUserAgent.toUpperCase() === userAgent.toUpperCase()
      ) {
        isAuthenticated = true;
      } else {
        logger.log(`Verify User Browser Agent Failed: ${JSON.stringify(userSession)}, Failed Browser Agent: ${userAgent}`);
      }
    } catch (ex) {
      logger.logError(ex);
    }
  }

  return {
    userSession,
    isAuthenticated,
  };
}

module.exports = {
  initUserSession,
  verifyUserSession,
  initUserSessionWithSignInFlow,
};
