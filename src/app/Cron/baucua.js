const fs = require("fs");

const Helpers = require("../Helpers/Helpers");

const UserInfo = require("../Models/UserInfo");
const BauCua_phien = require("../Models/BauCua/BauCua_phien");
const BauCua_cuoc = require("../Models/BauCua/BauCua_cuoc");
const BauCua_temp = require("../Models/BauCua/BauCua_temp");
const GameConfigs = require("../Models/GameConfig/GameConfigs");

const balanceApi = require("./../apis/balanceApi");
const ConfigHelper = require("../Helpers/ConfigHelper");
const appConfigs = require("./../../config/appConfigs");
const gameIds = appConfigs.gameIds;
const diceRandom = require("./../Controllers/diceRandom");

let bauCuaConfigs = require("../Controllers/game/baucua/configs");

let bot = require("./baucua/bot");

const logger = require("./../web/logger");

let botList = [];
let io = null;
let gameLoop = null;

let BCPlayTime = 30;
let BCTimeToNext = 10;
let BCStopBetTime = 5;
let TotalBCTime = BCPlayTime + BCTimeToNext + 1;
let configs = null;
const viewName = "viewBauCua";

const init = function init(obj) {
  io = obj;
  io.BauCua_phien = 1;
  io.baucua = {
    ingame: [],
  };
  io.baucua.info = {
    redBau: 0,
    redCa: 0,
    redCua: 0,
    redGa: 0,
    redHuou: 0,
    redTom: 0,
    xuBau: 0,
    xuCa: 0,
    xuCua: 0,
    xuGa: 0,
    xuHuou: 0,
    xuTom: 0,
  };

  io.baucua.infoAdmin = {
    redBau: 0,
    redCa: 0,
    redCua: 0,
    redGa: 0,
    redHuou: 0,
    redTom: 0,
    xuBau: 0,
    xuCa: 0,
    xuCua: 0,
    xuGa: 0,
    xuHuou: 0,
    xuTom: 0,
  };

  BauCua_phien.findOne(
    {},
    "id",
    {
      sort: {
        _id: -1,
      },
    },
    function (err, last) {
      if (!!last) {
        io.BauCua_phien = last.id + 1;
      }
      playGame();
    }
  );
};

const thongtin_thanhtoan = function thongtin_thanhtoan(dice = null, settlementTime) {
  try {
    if (!!dice) {
      let heSo = {}; // Hệ số nhân
      for (let i = 0; i < 3; i++) {
        let dataT = dice[i];
        if (void 0 === heSo[dataT]) {
          heSo[dataT] = 1;
        } else {
          heSo[dataT] += 1;
        }
      }
      // apply oddsodds
      Object.keys(heSo).forEach((key) => (heSo[key] = bauCuaConfigs.odds[heSo[key] - 1] - 1));

      let updateLog = {};
      for (let j = 0; j < 6; j++) {
        if (void 0 !== heSo[j]) {
          updateLog[j] = heSo[j];
        }
      }
      let phien = io.BauCua_phien - 1;
      BauCua_temp.updateOne(
        {},
        {
          $inc: updateLog,
        }
      ).exec();
      BauCua_cuoc.find(
        {
          phien: phien,
        },
        {},
        function (err, list) {
          if (err) {
            logger.logError(err);
          }
          try {
            if (list.length) {
              Promise.all(
                list.map(function (cuoc) {
                  let TienThang = 0; // Số tiền thắng (chưa tính gốc)
                  let TongThua = 0; // Số tiền thua
                  let TongThang = 0; // Tổng tiền thắng (đã tính gốc)
                  let thuong = 0;
                  let huou = 0;
                  let bau = 0;
                  let ga = 0;
                  let ca = 0;
                  let cua = 0;
                  let tom = 0;

                  // Cược Hươu
                  if (cuoc[0] > 0) {
                    if (void 0 !== heSo[0]) {
                      huou = cuoc[0] * heSo[0];
                      TienThang += huou;
                      TongThang += cuoc[0] + huou;
                    } else {
                      TongThua += cuoc[0];
                    }
                  }
                  // Cược Bầu
                  if (cuoc[1] > 0) {
                    if (void 0 !== heSo[1]) {
                      bau = cuoc[1] * heSo[1];
                      TienThang += bau;
                      TongThang += cuoc[1] + bau;
                    } else {
                      TongThua += cuoc[1];
                    }
                  }
                  // Cược Gà
                  if (cuoc[2] > 0) {
                    if (void 0 !== heSo[2]) {
                      ga = cuoc[2] * heSo[2];
                      TienThang += ga;
                      TongThang += cuoc[2] + ga;
                    } else {
                      TongThua += cuoc[2];
                    }
                  }
                  // Cược Cá
                  if (cuoc[3] > 0) {
                    if (void 0 !== heSo[3]) {
                      ca = cuoc[3] * heSo[3];
                      TienThang += ca;
                      TongThang += cuoc[3] + ca;
                    } else {
                      TongThua += cuoc[3];
                    }
                  }
                  // Cược Cua
                  if (cuoc[4] > 0) {
                    if (void 0 !== heSo[4]) {
                      cua = cuoc[4] * heSo[4];
                      TienThang += cua;
                      TongThang += cuoc[4] + cua;
                    } else {
                      TongThua += cuoc[4];
                    }
                  }
                  // Cược Tôm
                  if (cuoc[5] > 0) {
                    if (void 0 !== heSo[5]) {
                      tom = cuoc[5] * heSo[5];
                      TienThang += tom;
                      TongThang += cuoc[5] + tom;
                    } else {
                      TongThua += cuoc[5];
                    }
                  }

                  let tongDat = cuoc[0] + cuoc[1] + cuoc[2] + cuoc[3] + cuoc[4] + cuoc[5];

                  cuoc.thanhtoan = true;
                  cuoc.betwin = TongThang;
                  cuoc.save();

                  return new Promise((resolve) => {
                    updateUserRed(
                      cuoc,
                      { TongThang, tongDat, TienThang, TongThua },
                      phien,
                      () => {
                        // Send settle websocket
                        if (void 0 !== io.users[cuoc.uid]) {
                          let status = {};
                          if (TongThang > 0) {
                            status = {
                              mini: {
                                baucua: {
                                  status: {
                                    win: true,
                                    bet: TongThang,
                                    thuong: thuong,
                                  },
                                },
                              },
                            };
                          } else {
                            status = {
                              mini: {
                                baucua: {
                                  status: {
                                    win: false,
                                    bet: TongThua,
                                  },
                                },
                              },
                            };
                          }
                          io.users[cuoc.uid].forEach(function (client) {
                            client.red(status);
                          });
                          status = null;
                        }

                        resolve({
                          users: cuoc.name,
                          bet: TienThang,
                          red: cuoc.red,
                          tienThua: TongThua,
                          tienDat: tongDat,
                        });
                      },
                      settlementTime
                    );
                  });
                })
              )
                .then(function (results) {
                  // results = results.filter(function (st) { return (st.red && st.bet > 0); });

                  // if (results.length) {
                  // 	results.sort(function (a, b) { return b.bet - a.bet; });
                  // 	results = results.slice(0, 3);
                  // 	results = Helpers.shuffle(results);
                  // 	var newsArr = results.map((result) => {
                  // 		return {
                  // 			users: result.users,
                  // 			bet: result.bet,
                  // 			game: 'Bầu Cua'
                  // 		};
                  // 	});
                  // 	io.sendInHome({ news: { a: newsArr } });
                  // }
                  heSo = null;
                  phien = null;
                  dice = null;
                  playGame();
                })
                .catch((error) => logger.logError(error));
            } else {
              heSo = null;
              phien = null;
              dice = null;
              playGame();
            }
          } catch (ex) {
            logger.logError(ex);
          }
        }
      );
    } else {
      // var userCount = Object.values(io.users).length + totalBots.length;
      Object.values(io.users).forEach(function (users) {
        users.forEach(function (client) {
          if (client.gameEvent !== void 0 && client.gameEvent.viewBauCua !== void 0 && client.gameEvent.viewBauCua) {
            client.red({
              mini: {
                baucua: {
                  data: io.baucua.info,
                  // userCount: userCount
                },
              },
            });
          }
        });
      });

      let admin_data = {
        baucua: {
          info: io.baucua.infoAdmin,
          ingame: io.baucua.ingame,
        },
      };
      Object.values(io.admins).forEach(function (admin) {
        admin.forEach(function (client) {
          if (client.gameEvent !== void 0 && client.gameEvent.viewBauCua !== void 0 && client.gameEvent.viewBauCua) {
            client.red(admin_data);
          }
        });
      });
    }
  } catch (ex) {
    logger.logError(ex);
  }
};

const updateUserRed = function (cuoc, sum, phien, cb, settlementTime) {
  try {
    if (cuoc.red) {
      let update = {};
      //RED
      if (sum.TongThang > 0) {
        update["red"] = sum.TongThang;
      }
      if (sum.TienThang > 0) {
        update["redWin"] = sum.TienThang;
      }
      if (sum.TongThua > 0) {
        update["redLost"] = sum.TongThua;
      }

      update["redPlay"] = sum.tongDat;

      let gameInfo = {
        gameId: gameIds.baucua,
        gameRoundId: phien,
        memberId: cuoc.memberId,
        siteId: cuoc.siteId,
        time: settlementTime,
      };

      balanceApi.endGame(cuoc.uid, gameInfo, update, io.users, () => {
        cb && cb();
      });
    }
  } catch (ex) {
    logger.logError(ex);
    cb && cb();
  }
};

const playGame = function () {
  io.BauCua_time = TotalBCTime;
  this.disabled = false;
  configs = ConfigHelper.getConfigs(ConfigHelper.GameTypes.BauCua);

  gameLoop = setInterval(function () {
    let self = this;
    try {
      if (io.BauCua_time == TotalBCTime) {
        GameConfigs.findOne({ name: ConfigHelper.GameTypes.BauCua }, function (err, data) {
          if (err) {
            logger.logError(err);
          }

          try {
            configs = data;
            ConfigHelper.updateConfig(ConfigHelper.GameTypes.BauCua, data);

            self.disabled = data == null || !data.enabled;

            if (self.disabled) {
              const disabledMessage = data == null ? "" : data.disabled_message;
              const payload = { baucua: { um: true, um_message: disabledMessage } };
              io.sendAllUser({ mini: payload });
              io.sendAllAdmin(payload, viewName);

              GameConfigs.updateOne({ name: ConfigHelper.GameTypes.BauCua }, { disabledround: io.BauCua_phien }, function (err) {
                if (err) logger.logError(err);
              });

              io.BauCua_time = TotalBCTime;

              return;
            }

            io.sendAllUser({ mini: { baucua: { time_remain: io.BauCua_time } } });
            io.sendAllAdmin({ baucua: { time_remain: io.BauCua_time, phien: io.BauCua_phien } }, viewName);
          } catch (err) {
            logger.logError(err);
          }
        });
      }

      if (!self.disabled) {
        io.BauCua_time--;
      }

      if (io.BauCua_time <= BCPlayTime) {
        if (io.BauCua_time == BCPlayTime) {
          //time clear data of previous phien
          io.baucua.ingame = [];
          io.baucua.info = {
            meRedHuou: 0,
            meRedBau: 0,
            meRedGa: 0,
            meRedCa: 0,
            meRedCua: 0,
            meRedTom: 0,
            redBau: 0,
            redCa: 0,
            redCua: 0,
            redGa: 0,
            redHuou: 0,
            redTom: 0,

            meXuHuou: 0,
            meXuBau: 0,
            meXuGa: 0,
            meXuCa: 0,
            meXuCua: 0,
            meXuTom: 0,
            xuBau: 0,
            xuCa: 0,
            xuCua: 0,
            xuGa: 0,
            xuHuou: 0,
            xuTom: 0,
          };
          io.baucua.infoAdmin = {
            redBau: 0,
            redCa: 0,
            redCua: 0,
            redGa: 0,
            redHuou: 0,
            redTom: 0,
            xuBau: 0,
            xuCa: 0,
            xuCua: 0,
            xuGa: 0,
            xuHuou: 0,
            xuTom: 0,
          };
        } else if (io.BauCua_time < 0) {
          // time show result
          clearInterval(gameLoop);

          io.BauCua_time = 0;

          let dice1 = 6;
          let dice2 = 6;
          let dice3 = 6;

          fs.readFile("./data/baucua.json", "utf8", (errjs, bcjs) => {
            try {
              if (errjs) {
                logger.logError(errjs);
              }

              const resultBC = diceRandom.randomBC();

              if (appConfigs.env == "PRO") {
                dice1 = resultBC[0];
                dice2 = resultBC[1];
                dice3 = resultBC[2];
              } else {
                let baucuaData = JSON.parse(bcjs);

                dice1 = baucuaData[0] == 6 ? resultBC[0] : baucuaData[0];
                dice2 = baucuaData[1] == 6 ? resultBC[1] : baucuaData[1];
                dice3 = baucuaData[2] == 6 ? resultBC[2] : baucuaData[2];

                baucuaData[0] = 6;
                baucuaData[1] = 6;
                baucuaData[2] = 6;
                baucuaData.uid = "";
                baucuaData.rights = 2;

                fs.writeFile("./data/baucua.json", JSON.stringify(baucuaData), function (err) {
                  if (err) logger.logError(err);
                });
              }

              BauCua_phien.create(
                {
                  dice1: dice1,
                  dice2: dice2,
                  dice3: dice3,
                  time: new Date(),
                },
                function (err, create) {
                  if (err) {
                    logger.logError(err);
                  }

                  if (!!create) {
                    io.BauCua_phien = create.id + 1;
                    thongtin_thanhtoan([dice1, dice2, dice3], create.time);

                    //filter only total cuoc
                    const {
                      meRedHuou,
                      meRedBau,
                      meRedGa,
                      meRedCa,
                      meRedCua,
                      meRedTom,
                      meXuHuou,
                      meXuBau,
                      meXuGa,
                      meXuCa,
                      meXuCua,
                      meXuTom,
                      ...cuocAllUser
                    } = io.baucua.info;
                    io.sendAllUser({
                      mini: {
                        baucua: {
                          data: cuocAllUser,
                          finish: {
                            dices: [create.dice1, create.dice2, create.dice3],
                            phien: create.id,
                          },
                        },
                      },
                    });

                    Object.values(io.admins).forEach(function (admin) {
                      admin.forEach(function (client) {
                        client.red({
                          baucua: {
                            data: cuocAllUser,
                            finish: {
                              dices: [create.dice1, create.dice2, create.dice3],
                              phien: create.id,
                            },
                          },
                        });
                      });
                    });

                    configs = ConfigHelper.getConfigs(ConfigHelper.GameTypes.BauCua);
                  }
                }
              );
            } catch (err) {
              if (err) logger.logError(err);
            }
          });

          try {
            if (configs.botenabled) {
              // lấy danh sách tài khoản bot
              UserInfo.find(
                {
                  type: true,
                  disabled: false,
                },
                "id name",
                function (err, blist) {
                  if (err) {
                    logger.logError(err);
                  }

                  if (blist.length) {
                    Promise.all(
                      blist.map(function (buser) {
                        buser = buser._doc;
                        delete buser._id;

                        return buser;
                      })
                    )
                      .then((result) => {
                        let maxBot = Math.floor(result.length * ConfigHelper.getMaxBotForCurrentHour(ConfigHelper.GameTypes.BauCua));
                        // console.log("BauCua max bot " + maxBot);

                        botList = Helpers.shuffle(result);
                        botList = botList.slice(0, maxBot);
                      })
                      .catch((promiseErr) => logger.logError(promiseErr));
                  }
                }
              );

              // console.log(`delay time ${delayTime}`);
            } else {
              botList = [];
            }
          } catch (error) {
            logger.logError(error);
            botList = [];
          }
        } else {
          thongtin_thanhtoan();

          let maxBet = 10;
          let minBet = 1;
          if (!!configs) {
            if (!!configs.bot_maxbet && configs.bot_maxbet > 0) {
              maxBet = configs.bot_maxbet;
            }
            if (configs.minbet > 0) {
              minBet = configs.minbet;
            }
          }

          if (!!botList.length && io.BauCua_time > BCStopBetTime) {
            const maxBotRandom = botList.length / io.BauCua_time;
            const userCuoc = Math.floor(Math.random() * maxBotRandom + 1);
            // console.log("BC maxBotRandom " + maxBotRandom);
            // console.log(configs.choices_maxbet);

            for (let i = 0; i < userCuoc; i++) {
              let dataT = botList[i];
              if (!!dataT) {
                bot(dataT, io, maxBet, minBet, configs.choices_maxbet);
                botList.splice(i, 1); // Xoá bot đã đặt tránh trùng lặp
              }
              dataT = null;
            }
          }
        }
      }
    } catch (ex) {
      logger.logError(ex);
    }
  }, 1000);
  return gameLoop;
};

module.exports = init;
