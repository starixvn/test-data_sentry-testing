const MiniDragonTiger_cuoc = require("../../../Models/MiniDragonTiger/MiniDragonTiger_cuoc");
const balanceApi = require("./../../../apis/balanceApi");
const gameIds = require("./../../../../config/appConfigs").gameIds;
const betChoiceMapper = require("./../../../apis/betChoiceMapper");
const logger = require("../../../web/logger");
const ConfigHelper = require("../../../Helpers/ConfigHelper");
const constants = require("../../../Cron/miniDragonTiger/constants");
const helper = require("./../../../Helpers/Helpers.js");

function miniDragonTigerCuoc(client, data) {
  if (!!data.cuoc && !!data.box) {
    let cuoc = data.cuoc >> 0;
    let box = data.box;
    let configs = ConfigHelper.getConfigs(ConfigHelper.GameTypes.MiniDragonTiger);
    let miniDragonTiger = client.redT.miniDragonTiger;

    let errorResponse = { endCuoc: -1 };

    if (miniDragonTiger.time < constants.minBetTime || miniDragonTiger.time > constants.maxBetTime) {
      errorResponse.notice = "Vui lòng đặt cược ở phiên sau.";
      client.red({ mini: { dragon_tiger: errorResponse, time_debug: miniDragonTiger.time } });
      return;
    }

    if (cuoc < configs.minbet) {
      errorResponse.notice = "Tiền cược tối thiểu là " + helper.formatNumberWithComma(configs.minbet);
      client.red({ mini: { dragon_tiger: errorResponse } });
      return;
    }

    let userCuoc = miniDragonTiger.ingame[client.profile.name];
    const maxBetForChoice = configs.choices_maxbet[box];

    if (cuoc > maxBetForChoice || (userCuoc && userCuoc[box] + cuoc > maxBetForChoice)) {
      errorResponse.notice = "Tiền cược tối đa ở cửa này là " + helper.formatNumberWithComma(maxBetForChoice);
      client.red({ mini: { dragon_tiger: errorResponse } });
      return;
    }

    if (cuoc > configs.maxbet || (userCuoc && userCuoc["dragon"] + userCuoc["tiger"] + userCuoc["tie"] + cuoc > configs.maxbet)) {
      errorResponse.notice = "Tổng tiền cược tối đa ở phiên này là " + helper.formatNumberWithComma(configs.maxbet);
      client.red({ mini: { dragon_tiger: errorResponse } });
      return;
    }

    if (userCuoc) {
      miniDragonTiger.ingame[client.profile.name][box] += cuoc;
      miniDragonTiger.ingame[client.profile.name].cuocQueue.push({ data: data, client: client });
    } else {
      let newData = { name: client.profile.name, dragon: 0, tiger: 0, tie: 0, cuocQueue: [{ data: data, client: client }] };
      newData[box] = cuoc;
      miniDragonTiger.ingame[client.profile.name] = newData;
    }
  }
}

function processPlacingBet(client, data) {
  try {
    if (client.redT == null || client.redT.miniDragonTiger == null) {
      return;
    }

    let miniDragonTiger = client.redT.miniDragonTiger;
    let phien = miniDragonTiger.phien;
    let cuoc = data.cuoc >> 0;
    let box = data.box;
    data.inSufficientBalance = { mini: { dragon_tiger: { notice: "Bạn hiện không có đủ tiền để cược." } } };
    data.gameId = gameIds.minidragontiger;
    data.gameRoundId = phien;
    data.choiceId = betChoiceMapper.convertMiniDragonTiger(box);

    let placeBetSuccess = function (user) {
      MiniDragonTiger_cuoc.findOne({ uid: client.UID, phien: phien, red: true }, function (err, checkOne) {
        if (err) {
          logger.logError(err);

          return;
        }

        try {
          if (checkOne) {
            checkOne[box] += cuoc;
            checkOne
              .save()
              .then(() => {
                notifyUsersAfterModifyCuoc(miniDragonTiger, client, user, box, cuoc);
              })
              .catch((updateError) => {
                logger.logError(updateError);
                clearCurrentCuoc(miniDragonTiger, client);
              });
          } else {
            let create = { uid: client.UID, name: client.profile.name, phien: phien, red: true, time: new Date() };
            if (client.session) {
              create.memberId = client.session.memberId;
              create.siteId = client.session.siteId;
            }
            let update = {
              [box]: cuoc,
            };
            MiniDragonTiger_cuoc.updateOne(
              { uid: client.UID, phien: phien, red: true },
              { $inc: update, $setOnInsert: create },
              { upsert: true, setDefaultsOnInsert: true },
              function (err) {
                if (err) {
                  logger.logError(err);

                  return;
                }

                notifyUsersAfterModifyCuoc(miniDragonTiger, client, user, box, cuoc);
              }
            );
          }

          let notifyUsersAfterModifyCuoc = function (miniDragonTiger, client, user, box, cuoc) {
            try {
              miniDragonTiger.data[box] += cuoc;
              miniDragonTiger.dataAdmin[box] += cuoc;

              let currentMeCuoc = miniDragonTiger.ingame[client.profile.name];
              let me_cuoc = {
                dragon: currentMeCuoc.dragon,
                tiger: currentMeCuoc.tiger,
                tie: currentMeCuoc.tie,
              };

              if (client.redT && client.redT.users) {
                client.redT.users[client.UID].map(function (obj) {
                  obj.red({
                    mini: { dragon_tiger: { data: miniDragonTiger.data, endCuoc: cuoc, me: me_cuoc } },
                    user: { red: user.red },
                  });
                });
              }
            } catch (error) {
              logger.logError(error);
            } finally {
              clearCurrentCuoc(miniDragonTiger, client);
            }
          };

          let clearCurrentCuoc = function (miniDragonTiger, client) {
            try {
              miniDragonTiger.ingame[client.profile.name].currentCuoc = null;
            } catch (error) {
              logger.logError(error);
            }
          };
        } catch (ex) {
          logger.logError(ex);
          miniDragonTiger.ingame[client.profile.name].currentCuoc = null;
        }
      });
    };

    let placeBetFailed = function () {
      try {
        client.red({ mini: { dragon_tiger: { endCuoc: -1 } } });

        let currentUser = miniDragonTiger.ingame[client.profile.name];
        currentUser[box] -= cuoc;

        currentUser.currentCuoc = null;
      } catch (ex) {
        logger.logError(ex);
        clearCurrentCuoc(miniDragonTiger, client);
      }
    };

    balanceApi.placeBet({ id: client.UID }, data, client, placeBetSuccess, placeBetFailed);
  } catch (error) {
    logger.logError(error);
  }
}

function processBetQueue(io) {
  try {
    let miniDragonTiger = io.miniDragonTiger;
    if (miniDragonTiger && miniDragonTiger.ingame) {
      for (const userBetName in miniDragonTiger.ingame) {
        let userBet = miniDragonTiger.ingame[userBetName];
        if (userBet) {
          if (userBet.cuocQueue && userBet.cuocQueue.length > 0 && userBet.currentCuoc == null) {
            userBet.currentCuoc = userBet.cuocQueue.shift();

            setTimeout(() => {
              try {
                processPlacingBet(userBet.currentCuoc.client, userBet.currentCuoc.data);
              } catch (ex) {
                logger.logError(ex);
                userBet.currentCuoc = null;
              }
            }, 0);
          }
        }
      }
    }
  } catch (ex) {
    logger.logError(ex);

    console.log(JSON.stringify({ message: ex.message, stack: ex.stack }));
  }
}

function initUserQueueProcessing(io) {
  const processTimeOut = 50;
  setTimeout(function processBets() {
    processBetQueue(io);

    setTimeout(processBets, processTimeOut);
  }, processTimeOut);
}

module.exports = {
  miniDragonTigerCuoc,
  initUserQueueProcessing,
};
