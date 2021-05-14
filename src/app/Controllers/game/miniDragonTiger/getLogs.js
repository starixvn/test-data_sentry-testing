const MiniDragonTiger_phien = require("../../../Models/MiniDragonTiger/MiniDragonTiger_phien");
const logger = require("./../../../web/logger");

module.exports = function (client) {
  let data = { me: { dragon: 0, tiger: 0, tie: 0 } };

  const active1 = new Promise((resolve, reject) => {
    MiniDragonTiger_phien.find({}, {}, { sort: { _id: -1 }, limit: 100 }, function (err, post) {
      if (post) {
        Promise.all(
          post.map(function (obj) {
            return { result: [obj.dragon, obj.tiger], round: obj.id };
          })
        ).then(function (arrayOfResults) {
          resolve(arrayOfResults);
        });
      }
    });
  });

  const active2 = Promise.all(
    Object.keys(client.redT.miniDragonTiger.ingame).map(function (key) {
      try {
        if (client && client.profile && client.profile.name) {
          if (key == client.profile.name) {
            let userBet = client.redT.miniDragonTiger.ingame[key];
            Object.keys(userBet).forEach((box) => {
              data.me[box] = userBet[box];
            });
          }
        }
      } catch (ex) {
        logger.logError(ex);
      }
    })
  );

  Promise.all([active1, active2])
    .then((values) => {
      data.logs = values[0];
      client.red({ mini: { dragon_tiger: data } });
    })
    .catch(logger.logError);
};
