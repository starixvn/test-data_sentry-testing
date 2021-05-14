const { queueProcessing, boxes } = require("../../../Cron/baccarat/constant");
const gameIds = require("../../../../config/appConfigs").gameIds;
const balanceApi = require("../../../apis/balanceApi");
const betChoiceMapper = require("../../../apis/betChoiceMapper");
const BaccaratBet = require("../../../Models/Baccarat/baccarat-cuoc");
const logger = require("../../../web/logger");
const NoticeMessage = require("../constants/notice-messages");

const processPlacingBet = (client, data) =>
  new Promise((resolve, reject) => {
    if (client.redT == null || client.redT.game == null || client.redT.game.baccarat == null) {
      return;
    }

    const { bet, box } = data;
    const baccarat = client.redT.game.baccarat;
    const roundId = baccarat.roundId;

    const placeBetSuccess = (user) => {
      BaccaratBet.findOne({ uid: client.UID, phien: roundId })
        .exec()
        .then((userBet) => {
          if (userBet) {
            userBet[box] += bet;

            return userBet.save();
          } else {
            const newBet = { uid: client.UID, name: client.profile.name, phien: roundId, time: new Date() };

            if (client.session) {
              newBet.memberId = client.session.memberId;
              newBet.siteId = client.session.siteId;
            }

            const update = {
              [box]: bet,
            };

            return BaccaratBet.updateOne(
              { uid: client.UID, phien: roundId },
              { $inc: update, $setOnInsert: newBet },
              { upsert: true, setDefaultsOnInsert: true }
            );
          }
        })
        .then(() => {
          baccarat.totalBets[box] += bet;
          baccarat.totalBetsAdmin[box] += bet;
          baccarat.chips[box][bet] += 1;

          if (baccarat.players[client.UID]) {
            baccarat.players[client.UID].red = user.red;
          }

          const betsOfThisUser = baccarat.ingame[client.profile.name];
          const ownBet = boxes.reduce((result, currentBox) => {
            result[currentBox] = betsOfThisUser[currentBox];
            return result;
          }, {});

          Object.values(baccarat.realPlayers).forEach((currentUser) => {
            if (client.UID !== currentUser.UID) {
              currentUser.red({ baccarat: { playerChip: { playerId: client.UID, box, bet: bet, red: user.red } } });
            } else {
              currentUser.red({
                baccarat: {
                  ownChip: { box, bet: bet },
                  ownBets: ownBet,
                  endBet: bet,
                },
                user: {
                  red: user.red,
                },
              });
            }
          });
        })
        .then(() => resolve())
        .catch((error) => reject(error));
    };

    const placeBetFailed = () => {
      const currentUser = baccarat.ingame[client.profile.name];
      currentUser[box] -= bet;

      client.red({ baccarat: { endBet: -1 } });

      resolve();
    };

    data.inSufficientBalance = { baccarat: { notice: NoticeMessage.notEnoughMoney, endBet: -1 } };

    data.gameId = gameIds.baccarat;
    data.cuoc = bet;
    data.gameRoundId = roundId;
    data.choiceId = betChoiceMapper.convertBaccarat(box);

    balanceApi.placeBet({ id: client.UID }, data, client, placeBetSuccess, placeBetFailed);
  });

const processBetQueue = (io) => {
  if (io.game.baccarat.ingame) {
    Object.values(io.game.baccarat.ingame).reduce((promise, userBet) => {
      if (userBet.processRunning == null && userBet.betQueue && userBet.betQueue.length > 0) {
        userBet.processRunning = true;
        const { data, client } = userBet.betQueue.shift();

        return promise
          .then(() => processPlacingBet(client, data))
          .catch((error) => logger.logError(error))
          .then(() => {
            userBet.processRunning = null;
          });
      } else {
        return promise;
      }
    }, Promise.resolve());
  }
};

module.exports = (io) => {
  const processFunc = () => {
    processBetQueue(io);

    setTimeout(processFunc, queueProcessing.timeout);
  };

  setTimeout(processFunc, queueProcessing.timeout);
};
