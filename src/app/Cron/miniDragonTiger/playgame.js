const MiniDragonTiger_Phien = require("./../../Models/MiniDragonTiger/MiniDragonTiger_phien");
const GameConfigs = require("./../../Models/GameConfig/GameConfigs");
const MiniDragonTiger_cuoc = require("./../../Models/MiniDragonTiger/MiniDragonTiger_cuoc");

const gameIds = require("./../../../config/appConfigs").gameIds;
const balanceApi = require("../../apis/balanceApi");
const ConfigHelper = require("./../../Helpers/ConfigHelper");
const logger = require("./../../web/logger");
const constants = require("./constants");
const Helpers = require("../../Helpers/Helpers");
const base_card = require("../../../data/card");
const bot = require("./bot");

let io = null;

const playGame = function (obj) {
  io = obj;
  let disabled = false;
  let groundTime = constants.betTime + constants.waitTime + 1;
  const viewName = "viewMiniDragonTiger";
  io.miniDragonTiger.time = groundTime;

  let gameLoop = setInterval(() => {
    try {
      if (io.miniDragonTiger.time == groundTime) {
        GameConfigs.findOne({ name: ConfigHelper.GameTypes.MiniDragonTiger }, (err, data) => {
          if (err) {
            logger.logError(err);
          }

          try {
            ConfigHelper.updateConfig(ConfigHelper.GameTypes.MiniDragonTiger, data);

            disabled = data == null || !data.enabled;
            const disabledMessage = data == null ? "" : data.disabled_message;

            if (disabled) {
              io.sendAllUser({ mini: { dragon_tiger: { um: true, um_message: disabledMessage } } });
              io.sendAllAdmin({ mini_dragon_tiger: { um: true, um_message: disabledMessage } }, viewName);

              GameConfigs.updateOne(
                { name: ConfigHelper.GameTypes.MiniDragonTiger },
                { disabledround: io.miniDragonTiger.phien },
                function (err) {
                  if (err) logger.logError(err);
                }
              );

              io.miniDragonTiger.time = groundTime;

              return;
            }

            io.sendAllUser({ mini: { dragon_tiger: { time_remain: io.miniDragonTiger.time } } });
            io.sendAllAdmin({ mini_dragon_tiger: { time_remain: io.miniDragonTiger.time, phien: io.miniDragonTiger.phien } }, viewName);
          } catch (err) {
            logger.logError(err);
          }
        });
      }

      if (!disabled) {
        io.miniDragonTiger.time--;
      }

      if (io.miniDragonTiger.time == constants.betTime) {
        resetData();
      }

      if (io.miniDragonTiger.time < constants.betTime) {
        if (io.miniDragonTiger.time < 0) {
          clearInterval(gameLoop);
          io.miniDragonTiger.time = 0;

          try {
            let card = [...base_card.card];

            card = Helpers.shuffle(card);
            card = Helpers.shuffle(card);
            card = Helpers.shuffle(card);

            let result = card.slice(0, 2);

            MiniDragonTiger_Phien.create({ dragon: result[0], tiger: result[1], time: new Date() }, (err, create) => {
              if (err) {
                logger.logError(err);
              }

              if (!!create) {
                io.miniDragonTiger.phien = create.id + 1;
                settle(create.id, result, create.time);

                const finish = { result: result, round: create.id };
                io.sendAllUser({ mini: { dragon_tiger: { finish: finish } } });
                Object.values(io.admins).forEach((admin) => {
                  admin.forEach(function (client) {
                    client.red({ mini_dragon_tiger: { finish: finish } });
                  });
                });
              }
            });

            bot.resetBots();
          } catch (error) {
            logger.logError(error);
          }
        } else {
          bot.randomAddBots(io);
          updateClientData();
        }
      }
    } catch (ex) {
      logger.logError(ex);
    }
  }, 1000);

  return gameLoop;
};

const resetData = function () {
  io.miniDragonTiger.ingame = {};
  io.miniDragonTiger.data = { dragon: 0, tiger: 0, tie: 0 };
  io.miniDragonTiger.dataAdmin = { dragon: 0, tiger: 0, tie: 0 };
};

const updateClientData = function () {
  try {
    Object.values(io.users).forEach(function (users) {
      users.forEach(function (client) {
        if (client.gameEvent && client.gameEvent.viewMiniDragonTiger) {
          client.red({ mini: { dragon_tiger: { data: io.miniDragonTiger.data } } });
        }
      });
    });

    let admin_data = { mini_dragon_tiger: { info: io.miniDragonTiger.dataAdmin, ingame: io.miniDragonTiger.ingame } };
    Object.values(io.admins).forEach(function (admin) {
      admin.forEach(function (client) {
        if (client.gameEvent && client.gameEvent.viewMiniDragonTiger) {
          client.red(admin_data);
        }
      });
    });
  } catch (error) {
    logger.logError(error);
  }
};

const settle = function (roundId, result, settlementTime) {
  try {
    if (result && result.length) {
      const dragon = result[0];
      const tiger = result[1];

      MiniDragonTiger_cuoc.find({ phien: roundId }, {}, (err, list) => {
        if (err) {
          logger.logError(err);
        }

        if (list && list.length) {
          Promise.all(
            list.map((bet, i) => {
              const totalBet = bet.dragon + bet.tiger + bet.tie;
              let redWin = 0;
              let redLost = 0;
              let totalWin = 0;

              if (dragon.card == tiger.card) {
                let win = 0;
                if (bet.tie > 0) {
                  win += bet.tie * 11;
                  redWin += win - bet.tie;
                } else {
                  redLost += bet.tie;
                }
                if (bet.dragon > 0) {
                  let dragonRefund = bet.dragon * 0.5;
                  win += dragonRefund;
                  redLost += bet.dragon - dragonRefund;
                }
                if (bet.tiger > 0) {
                  let tigerRefund = bet.tiger * 0.5;
                  win += tigerRefund;
                  redLost += bet.tiger - tigerRefund;
                }
                totalWin += win;
              } else {
                if (bet.dragon > 0) {
                  if (dragon.card > tiger.card) {
                    totalWin += bet.dragon * 2;
                    redWin += bet.dragon;
                  } else {
                    redLost += bet.dragon;
                  }
                }

                if (bet.tiger > 0) {
                  if (tiger.card > dragon.card) {
                    totalWin += bet.tiger * 2;
                    redWin += bet.tiger;
                  } else {
                    redLost += bet.tiger;
                  }
                }

                if (bet.tie > 0) {
                  redLost += bet.tie;
                }
              }

              bet.thanhtoan = true;
              bet.betwin = totalWin;
              bet.save();

              let update = {};
              if (totalWin > 0) {
                update["red"] = totalWin;
              }
              if (redWin > 0) {
                update["redWin"] = redWin;
              }
              if (redLost > 0) {
                update["redLost"] = redLost;
              }

              update["redPlay"] = totalBet;

              let gameInfo = {
                gameId: gameIds.minidragontiger,
                gameRoundId: roundId,
                memberId: bet.memberId,
                siteId: bet.siteId,
                time: settlementTime,
              };

              return new Promise((resolve) => {
                try {
                  balanceApi.endGame(bet.uid, gameInfo, update, io.users, () => {
                    resolve({ users: bet.name, bet: redWin, red: bet.red });

                    if (io.users[bet.uid]) {
                      let status = {
                        mini: {
                          dragon_tiger: {
                            status: totalWin > 0,
                            bet: totalWin > 0 ? totalWin : redLost,
                          },
                        },
                      };

                      io.users[bet.uid].forEach(function (client) {
                        client.red(status);
                      });
                    }
                  });
                } catch (ex) {
                  resolve({ users: bet.name, bet: redWin, red: bet.red });
                  logger.logError(ex);
                }
              });
            })
          )
            .then(() => {
              playGame(io);
            })
            .catch((ex) => logger.logError(ex));
        } else {
          playGame(io);
        }
      });
    }
  } catch (error) {
    logger.logError(error);
  }
};

module.exports = playGame;
