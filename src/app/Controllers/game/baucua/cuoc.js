const BauCua_cuoc = require("../../../Models/BauCua/BauCua_cuoc");
const balanceApi = require("./../../../apis/balanceApi");
const gameIds = require("./../../../../config/appConfigs").gameIds;
const betChoiceMapper = require("./../../../apis/betChoiceMapper");
const logger = require("../../../web/logger");
const ConfigHelper = require("../../../Helpers/ConfigHelper");
const helper = require("./../../../Helpers/Helpers.js");
const constants = require("./../../../Cron/baucua/constants");

let BCPlayTime = 30;
let BCStopBetTime = 5;
let configs = null;

function bauCuaCuoc(client, data) {
  try {
    if (!!data && !!data.cuoc) {
      configs = ConfigHelper.getConfigs(ConfigHelper.GameTypes.BauCua);

      const cuoc = data.cuoc >> 0;
      const red = !!data.red;
      const linhVat = data.linhVat >> 0;
      const response = {
        mini: {
          baucua: {
            endCuoc: -1,
          },
        },
      };
      const baucuaData = response.mini.baucua;

      let currentCuoc = 0;
      const clientCuoc = client.redT.baucua.ingame.find((uOld) => uOld.uid == client.UID && uOld.red == red);
      const maxBetForChoice = configs.choices_maxbet[constants.betChoices[linhVat]];
      const currentBetOnChoice = clientCuoc && clientCuoc[linhVat] ? clientCuoc[linhVat] : 0;

      if (clientCuoc) {
        for (let i = 0; i < 6; i++) {
          currentCuoc += clientCuoc[i];
        }
      }

      if (client.redT.BauCua_time <= BCStopBetTime || client.redT.BauCua_time > BCPlayTime) {
        baucuaData.notice = "Vui lòng đặt cược ở phiên sau.";
        client.red(response);
        return;
      }

      if (cuoc < configs.minbet) {
        baucuaData.notice = "Tiền cược tối thiểu là " + helper.formatNumberWithComma(configs.minbet);
        client.red(response);
        return;
      }

      if (cuoc > maxBetForChoice || (cuoc && currentBetOnChoice + cuoc > maxBetForChoice)) {
        baucuaData.notice = "Tiền cược tối đa ở cửa này là " + helper.formatNumberWithComma(maxBetForChoice);
        client.red(response);
        return;
      }

      if (cuoc > configs.maxbet || currentCuoc + cuoc > configs.maxbet) {
        baucuaData.notice = "Tổng tiền cược tối đa ở phiên này là " + helper.formatNumberWithComma(configs.maxbet);
        client.red(response);
        return;
      }

      if (linhVat < 0 || linhVat > 5) {
        baucuaData.notice = "Cược thất bại...";
        client.red(response);
      } else {
        const io = client.redT;
        const phien = client.redT.BauCua_phien;

        if (clientCuoc) {
          io.baucua.ingame.forEach(function (uOld) {
            if (uOld.uid == client.UID && uOld.red == red) {
              uOld[linhVat] += cuoc;
              uOld.cuocQueue.push({ data: { ...data, phien }, client: client });
            }
          });
        } else {
          let addList = {
            uid: client.UID,
            name: client.profile.name,
            red: red,
            0: 0,
            1: 0,
            2: 0,
            3: 0,
            4: 0,
            5: 0,
            cuocQueue: [{ data: { ...data, phien }, client: client }],
            info: io.baucua.info,
            infoAdmin: io.baucua.infoAdmin,
          };

          addList[linhVat] = cuoc;
          io.baucua.ingame.unshift(addList);
        }
      }
    }
  } catch (ex) {
    logger.logError(ex);
  }
}

function processPlaceBet(client, data, info, infoAdmin, io, userBet) {
  if (!!data && !!data.cuoc) {
    const cuoc = data.cuoc >> 0;
    const red = !!data.red;
    const phien = data.phien;
    const linhVat = data.linhVat >> 0;

    const placeBetSuccess = function (user) {
      const dataXu = ["meXuHuou", "meXuBau", "meXuGa", "meXuCa", "meXuCua", "meXuTom"];
      const dataRed = ["meRedHuou", "meRedBau", "meRedGa", "meRedCa", "meRedCua", "meRedTom"];
      const tab = red ? dataRed : dataXu;
      const data = {};

      try {
        BauCua_cuoc.findOne({ uid: client.UID, phien, red }, function (err, checkOne) {
          if (err) {
            logger.logError(err);
            return;
          }

          try {
            let update = {
              [linhVat]: cuoc,
            };
            if (checkOne) {
              BauCua_cuoc.findOneAndUpdate({ uid: client.UID, phien, red }, { $inc: update }, function (err, cat) {
                if (err) {
                  logger.logError(err);
                  return;
                }

                try {
                  tab.forEach(function (o, i) {
                    data[o] = cat[i] + (i == linhVat ? cuoc : 0);
                    return (data[o] = cat[i] + (i == linhVat ? cuoc : 0));
                  });
                  const dataT = {
                    mini: { baucua: { data: data, endCuoc: cuoc } },
                    user: { red: user.red, xu: user.xu },
                  };

                  if (client.redT?.users?.[client.UID]) {
                    client.redT.users[client.UID].map(function (obj) {
                      obj.red(dataT);
                    });
                  }
                } catch (ex) {
                  logger.logError(ex);
                }
              });
            } else {
              let create = { uid: client.UID, name: client.profile.name, phien, red, time: new Date() };
              if (client.session) {
                create.memberId = client.session.memberId;
                create.siteId = client.session.siteId;
              }
              BauCua_cuoc.updateOne(
                { uid: client.UID, phien, red },
                { $inc: update, $setOnInsert: create },
                { upsert: true, setDefaultsOnInsert: true },
                function (err) {
                  if (err) {
                    logger.logError(err);
                    return;
                  }

                  try {
                    data[tab[linhVat]] = cuoc;
                    const dataT = {
                      mini: { baucua: { data: data, endCuoc: cuoc } },
                      user: { red: user.red, xu: user.xu },
                    };

                    if (client.redT?.users?.[client.UID]) {
                      client.redT.users[client.UID].forEach(function (obj) {
                        obj.red(dataT);
                      });
                    }
                  } catch (error) {
                    logger.log(error);
                  }
                }
              );
            }

            if (linhVat == 0) {
              info.redHuou += cuoc;
              infoAdmin.redHuou += cuoc;
            } else if (linhVat == 1) {
              info.redBau += cuoc;
              infoAdmin.redBau += cuoc;
            } else if (linhVat == 2) {
              info.redGa += cuoc;
              infoAdmin.redGa += cuoc;
            } else if (linhVat == 3) {
              info.redCa += cuoc;
              infoAdmin.redCa += cuoc;
            } else if (linhVat == 4) {
              info.redCua += cuoc;
              infoAdmin.redCua += cuoc;
            } else if (linhVat == 5) {
              info.redTom += cuoc;
              infoAdmin.redTom += cuoc;
            }

            io.baucua.ingame.forEach(function (uOld) {
              if (uOld.uid == client.UID && uOld.red == red) {
                uOld.currentCuoc = null;
              }
            });
          } catch (ex) {
            logger.logError(ex);
          }
        });
      } catch (ex) {
        logger.logError(ex);
      }
    };

    let placeBetFailed = function () {
      client.red({
        mini: {
          baucua: {
            endCuoc: -1,
          },
        },
      });

      io.baucua.ingame.forEach(function (uOld) {
        if (uOld.uid == client.UID && uOld.red == red) {
          uOld[linhVat] -= cuoc;
          uOld.currentCuoc = null;
        }
      });
    };

    try {
      if (client == null || client.redT == null || client.redT.BauCua_phien == null) {
        userBet.currentCuoc = null;
        return;
      }

      data.inSufficientBalance = { mini: { baucua: { notice: "Bạn hiện không có đủ tiền để cược." } } };
      data.gameId = gameIds.baucua;
      data.gameRoundId = phien;
      data.choiceId = betChoiceMapper.convertBauCua(linhVat);

      balanceApi.placeBet({ id: client.UID }, data, client, placeBetSuccess, placeBetFailed);
    } catch (ex) {
      logger.logError(ex);
    }
  }
}

function processBetQueue(io) {
  try {
    io.baucua.ingame.forEach(function (userBet) {
      if (userBet.cuocQueue && userBet.cuocQueue.length > 0 && userBet.currentCuoc == null) {
        userBet.currentCuoc = userBet.cuocQueue.shift();

        setTimeout(() => {
          try {
            processPlaceBet(userBet.currentCuoc.client, userBet.currentCuoc.data, io.baucua.info, io.baucua.infoAdmin, io, userBet);
          } catch (error) {
            logger.logError(error);
            userBet.currentCuoc = null;
          }
        }, 0);
      }
    });
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
  bauCuaCuoc,
  processPlaceBet,
  initUserQueueProcessing,
};
