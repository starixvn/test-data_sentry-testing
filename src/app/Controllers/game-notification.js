const GameNotifications = require("../Models/GameNotification");
const logger = require("../web/logger");

module.exports = async (client, { gameId }) => {
  try {
    const projection = {
      _id: false,
      __v: false,
      __archive: false,
    };

    const filter = gameId && gameId > 0 ? { uid: client.UID, gameId: gameId } : { uid: client.UID };

    const notifications = await GameNotifications.find(filter, projection).lean().exec();

    client.red({ gameNotifications: notifications });
  } catch (err) {
    logger.logError(err);
  }
};
