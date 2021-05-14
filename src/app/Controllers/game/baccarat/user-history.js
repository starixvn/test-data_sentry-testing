const BaccaratPhien = require("../../../Models/Baccarat/baccarat-phien");
const BaccaratCuoc = require("../../../Models/Baccarat/baccarat-cuoc");
const { userHistoryPagination } = require("../../../Cron/baccarat/constant");
const logger = require("../../../web/logger");

module.exports = (client, data) => {
  const { page } = data;
  const { limit } = userHistoryPagination;

  if (!!page && page > 0) {
    const numberOfSkippedBets = (page - 1) * limit;

    BaccaratCuoc
      .find({ uid: client.UID, thanhtoan: true }, "-_id name phien player banker big small tie playerPair bankerPair betwin time", { sort: { _id: -1 }, skip: numberOfSkippedBets, limit })
      .then((bets) => Promise.all(
        bets.map((bet) => BaccaratPhien
          .findOne({ id: bet.phien }, "-_id player banker result")
          .exec()
          .then((round) => ({ bet, round })))))
      .then((data) => BaccaratCuoc
        .countDocuments({ uid: client.UID, thanhtoan: true })
        .exec()
        .then((total) => ({ data, total })))
      .then(({ data, total }) => client.red({ baccarat: { history: { betLogs: data, page, pageSize: limit, total } } }))
      .catch((error) => logger.logError(error));
  }
};
