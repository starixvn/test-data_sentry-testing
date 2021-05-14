const logger = require("./../app/web/logger").getLogger();
const { useAuthenticate } = require("./util");

const requestHandlers = {
  kenoUsers: (res, redT) => {
    try {
      const users = mapRealUsers(Object.values(redT.kenoProMax.realPlayers));

      let bots = Object.values(redT.kenoProMax.players)
        .filter((player) => {
          return player.type;
        })
        .map((bot) => {
          return { name: bot.name, red: bot.red };
        });

      res.send({
        totalRealPlayer: users.realUsers.length,
        realUsers: users.realUsers,
        totalUusPlayer: users.uusUsers.length,
        uusUsers: users.uusUsers,
        totalBots: bots.length,
        bots: bots,
      });

      return;
    } catch (err) {
      logger.logError(err);
    }

    res.send({ error: true });
  },
  baccaratUsers: (res, redT) => {
    try {
      const users = mapRealUsers(Object.values(redT.game.baccarat.realPlayers));

      let bots = Object.values(redT.game.baccarat.players)
        .filter((player) => {
          return player.type;
        })
        .map((bot) => {
          return { name: bot.name, red: bot.red };
        });

      res.send({
        totalRealPlayer: users.realUsers.length,
        realUsers: users.realUsers,
        totalUusPlayer: users.uusUsers.length,
        uusUsers: users.uusUsers,
        totalBots: bots.length,
        bots: bots,
      });

      return;
    } catch (err) {
      logger.logError(err);
    }

    res.send({ error: true });
  },
  rouletteUsers: (res, redT) => {
    try {
      const users = mapRealUsers(Object.values(redT.roulette.realPlayers));

      let bots = Object.values(redT.roulette.players)
        .filter((player) => player.type)
        .map((bot) => ({ name: bot.name, red: bot.red }));

      res.send({
        totalRealPlayer: users.realUsers.length,
        realUsers: users.realUsers,
        totalUusPlayer: users.uusUsers.length,
        uusUsers: users.uusUsers,
        totalBots: bots.length,
        bots: bots,
      });

      return;
    } catch (err) {
      logger.logError(err);
    }

    res.send({ error: true });
  },
};

const authLogger = {
  error: logger.logError,
  warn: logger.logWarning,
};

function mapRealUsers(clients) {
  let uusUsers = [];
  let realUsers = [];

  clients.forEach(function (cacheClient) {
    if (cacheClient && cacheClient.session) {
      const user = {
        name: cacheClient.session.memberName,
        id: cacheClient.session.memberId,
        currency: cacheClient.session.currency,
        character: cacheClient.session.characterName,
      };
      if (cacheClient.session.currency && cacheClient.session.currency.toUpperCase() === "UUS") {
        uusUsers.push(user);
      } else {
        realUsers.push(user);
      }
    }
  });

  return { uusUsers: uusUsers, realUsers: realUsers };
}

function initRoutes(app, redT) {
  app.get("/api/game/keno/onlineusers", useAuthenticate({ logger: authLogger }), (req, res) => requestHandlers.kenoUsers(res, redT));
  app.get("/api/game/baccarat/onlineusers", useAuthenticate({ logger: authLogger }), (req, res) =>
    requestHandlers.baccaratUsers(res, redT)
  );
  app.get("/api/game/roulette/onlineusers", useAuthenticate({ logger: authLogger }), (req, res) =>
    requestHandlers.rouletteUsers(res, redT)
  );
}

module.exports = initRoutes;
