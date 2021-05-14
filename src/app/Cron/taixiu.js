//let path        = require('path');
const UserInfo = require("../Models/UserInfo");
const TXPhien = require("../Models/TaiXiu_phien");
const TXCuoc = require("../Models/TaiXiu_cuoc");
const TXCuocOne = require("../Models/TaiXiu_one");
const GameConfigs = require("../Models/GameConfig/GameConfigs");

const random = require("./../Controllers/diceRandom").random;

const gameIds = require("../../config/appConfigs").gameIds;
const balanceApi = require("./../apis/balanceApi");
const logger = require("./../web/logger");
const ConfigHelper = require("../Helpers/ConfigHelper");

let bot = require("./taixiu/bot");

let io = null;
let gameLoop = null;
const timeTX = 61;
const timeCuoc = 50;
const viewName = "viewTaiXiu";

const init = function (obj) {
  io = obj;

  io.taixiu = {
    ingame: {},
    playerBetBigCount: 0,
    playerBetSmallCount: 0,
    taixiu: {
      red_player_tai: 0,
      red_player_xiu: 0,
      red_tai: 0,
      red_xiu: 0,
      xu_player_tai: 0,
      xu_player_xiu: 0,
      xu_tai: 0,
      xu_xiu: 0,
    },
  };

  io.taixiuAdmin = {
    playerBetBigCount: 0,
    playerBetSmallCount: 0,
    taixiu: {
      red_player_tai: 0,
      red_player_xiu: 0,
      red_tai: 0,
      red_xiu: 0,
      xu_player_tai: 0,
      xu_player_xiu: 0,
      xu_tai: 0,
      xu_xiu: 0,
    },
    list: [],
  };

  ConfigHelper.reloadConfigs(ConfigHelper.GameTypes.TaiXiu);

  playGame();
};

TXPhien.findOne({}, "id", { sort: { id: -1 } }, function (err, last) {
  if (!!last) {
    io.TaiXiu_phien = last.id + 1;
  }
});

const truChietKhau = function (bet, phe) {
  const chietkhau = bet - (bet * phe) / 100;

  return chietkhau;
};

const setTaiXiu_user = function (phien, settlementTime) {
  TXCuocOne.find({ phien: phien, thanhtoan: true }, {}, function (err, list) {
    if (list.length) {
      Promise.all(
        list.map(function (obj) {
          let action = new Promise((resolve, reject) => {
            try {
              let bet_thua = obj.bet - obj.tralai;
              let bet = obj.win ? obj.betwin + obj.bet : bet_thua;

              const gameInfo = {
                gameId: gameIds.taixiu,
                gameRoundId: phien,
                memberId: obj.memberId,
                siteId: obj.siteId,
                time: settlementTime,
              };

              const settleInfo = {
                red: obj.win ? obj.betwin + obj.bet : obj.tralai,
                redPlay: obj.bet,
              };

              balanceApi.endGame(obj.uid, gameInfo, settleInfo, io.users, () => {
                if (io.users[obj.uid]) {
                  io.users[obj.uid].forEach(function (client) {
                    client.red({
                      taixiu: {
                        status: { win: obj.win, thuong: obj.thuong, select: obj.select, bet: bet },
                      },
                    });
                  });
                }

                resolve({ uid: obj.uid, red: obj.red, taixiu: obj.taixiu, betwin: obj.betwin });
              });
            } catch (ex) {
              logger.logError(ex);
              resolve({ uid: obj.uid, red: obj.red, taixiu: obj.taixiu, betwin: obj.betwin });
            }
          });
          return action;
        })
      );
    }
  });
};

const memberPayout = function (dice, game_id, obj, sum, userSettlements) {
  if (!userSettlements[obj.uid]) {
    userSettlements[obj.uid] = { red: 0, redWin: 0, redLost: 0, redPlay: 0 };
  }

  if (obj.taixiu === true && obj.red === true && obj.select === true) {
    // Tổng Red Tài
    let win = dice > 10 ? true : false;
    if (sum.TaiXiu_red_lech_tai && sum.TaiXiu_tong_red_lech > 0) {
      if (sum.TaiXiu_tong_red_lech >= obj.bet) {
        // Trả lại hoàn toàn
        sum.TaiXiu_tong_red_lech -= obj.bet;
        // trả lại hoàn toàn
        obj.thanhtoan = true;
        obj.win = win;
        obj.tralai = obj.bet;
        obj.save();

        userSettlements[obj.uid].redPlay = obj.bet;
        userSettlements[obj.uid].red += obj.bet;
        //balanceApi.endGame(obj.uid, gameInfo, { red: obj.bet });

        return TXCuocOne.updateOne(
          { uid: obj.uid, phien: game_id, taixiu: true, select: true, red: true },
          { $set: { win: win, thanhtoan: true, time: new Date() }, $inc: { tralai: obj.bet } }
        ).exec();
      } else {
        // Trả lại 1 phần
        let betPlay = obj.bet - sum.TaiXiu_tong_red_lech;
        let betwinP = 0;

        obj.thanhtoan = true;
        obj.win = win;
        obj.tralai = sum.TaiXiu_tong_red_lech;
        sum.TaiXiu_tong_red_lech = 0;

        if (win) {
          // Thắng nhưng bị trừ tiền trả lại
          // cộng tiền thắng
          betwinP = truChietKhau(betPlay, 4);
          obj.betwin = betwinP;
          let redUpdate = obj.bet + betwinP;

          userSettlements[obj.uid].red += redUpdate;
          userSettlements[obj.uid].redPlay += obj.bet;
          userSettlements[obj.uid].redWin += betwinP;
        } else {
          userSettlements[obj.uid].red += obj.tralai;
          userSettlements[obj.uid].redPlay += obj.bet;
          userSettlements[obj.uid].redLost += betPlay;
        }
        obj.save();
        return TXCuocOne.updateOne(
          { uid: obj.uid, phien: game_id, taixiu: true, select: true, red: true },
          { $set: { win: win, thanhtoan: true, time: new Date() }, $inc: { tralai: obj.tralai, betwin: betwinP } }
        ).exec();
      }
    } else {
      if (win) {
        // cộng tiền thắng hoàn toàn
        let betwin = truChietKhau(obj.bet, 4);
        obj.thanhtoan = true;
        obj.win = true;
        obj.betwin = betwin;
        obj.save();

        let redUpdate = obj.bet + betwin;

        userSettlements[obj.uid].red += redUpdate;
        userSettlements[obj.uid].redWin += betwin;
        userSettlements[obj.uid].redPlay += obj.bet;

        return TXCuocOne.updateOne(
          { uid: obj.uid, phien: game_id, taixiu: true, select: true, red: true },
          { $set: { win: true, thanhtoan: true, time: new Date() }, $inc: { betwin: betwin } }
        ).exec();
      } else {
        obj.thanhtoan = true;
        obj.save();

        userSettlements[obj.uid].redPlay += obj.bet;
        userSettlements[obj.uid].redLost += obj.bet;

        return TXCuocOne.updateOne(
          { uid: obj.uid, phien: game_id, taixiu: true, select: true, red: true },
          { $set: { thanhtoan: true, time: new Date() } }
        ).exec();
      }
    }
  } else if (obj.taixiu === true && obj.red === true && obj.select === false) {
    // Tổng Red Xỉu
    let win = dice > 10 ? false : true;
    if (!sum.TaiXiu_red_lech_tai && sum.TaiXiu_tong_red_lech > 0) {
      if (sum.TaiXiu_tong_red_lech >= obj.bet) {
        // Trả lại hoàn toàn
        sum.TaiXiu_tong_red_lech -= obj.bet;
        // trả lại hoàn toàn
        obj.thanhtoan = true;
        obj.win = win;
        obj.tralai = obj.bet;
        obj.save();

        userSettlements[obj.uid].red += obj.bet;
        userSettlements[obj.uid].redPlay += obj.bet;

        return TXCuocOne.updateOne(
          { uid: obj.uid, phien: game_id, taixiu: true, select: false, red: true },
          { $set: { win: win, thanhtoan: true, time: new Date() }, $inc: { tralai: obj.bet } }
        ).exec();
      } else {
        // Trả lại 1 phần
        let betPlay = obj.bet - sum.TaiXiu_tong_red_lech;
        let betwinP = 0;

        obj.thanhtoan = true;
        obj.win = win;
        obj.tralai = sum.TaiXiu_tong_red_lech;
        sum.TaiXiu_tong_red_lech = 0;

        if (win) {
          // Thắng nhưng bị trừ tiền trả lại
          // cộng tiền thắng
          betwinP = truChietKhau(betPlay, 4);
          obj.betwin = betwinP;
          let redUpdate = obj.bet + betwinP;

          userSettlements[obj.uid].red += redUpdate;
          userSettlements[obj.uid].redPlay += obj.bet;
          userSettlements[obj.uid].redWin += betwinP;
        } else {
          userSettlements[obj.uid].red += obj.tralai;
          userSettlements[obj.uid].redPlay += obj.bet;
          userSettlements[obj.uid].redLost += betPlay;
        }
        obj.save();
        return TXCuocOne.updateOne(
          { uid: obj.uid, phien: game_id, taixiu: true, select: false, red: true },
          { $set: { win: win, thanhtoan: true, time: new Date() }, $inc: { tralai: obj.tralai, betwin: betwinP } }
        ).exec();
      }
    } else {
      if (win) {
        // cộng tiền thắng hoàn toàn
        let betwin = truChietKhau(obj.bet, 4);
        obj.thanhtoan = true;
        obj.win = true;
        obj.betwin = betwin;
        obj.save();

        let redUpdate = obj.bet + betwin;
        userSettlements[obj.uid].red += redUpdate;
        userSettlements[obj.uid].redWin += betwin;
        userSettlements[obj.uid].redPlay += obj.bet;

        return TXCuocOne.updateOne(
          { uid: obj.uid, phien: game_id, taixiu: true, select: false, red: true },
          { $set: { win: true, thanhtoan: true, time: new Date() }, $inc: { betwin: betwin } }
        ).exec();
      } else {
        obj.thanhtoan = true;
        obj.save();

        userSettlements[obj.uid].redLost += obj.bet;
        userSettlements[obj.uid].redPlay += obj.bet;

        return TXCuocOne.updateOne(
          { uid: obj.uid, phien: game_id, taixiu: true, select: false, red: true },
          { $set: { thanhtoan: true, time: new Date() } }
        ).exec();
      }
    }
  }
  return 1;
};

const sumTaiXiu = function (objL, sum) {
  if (objL.taixiu === true && objL.red === true && objL.select === true) {
    // Tổng Red Tài
    sum.TaiXiu_red_tong_tai += objL.bet;
  } else if (objL.taixiu === true && objL.red === true && objL.select === false) {
    // Tổng Red Xỉu
    sum.TaiXiu_red_tong_xiu += objL.bet;
  } else if (objL.taixiu === true && objL.red === false && objL.select === true) {
    // Tổng Xu Tài
    sum.TaiXiu_xu_tong_tai += objL.bet;
  } else if (objL.taixiu === true && objL.red === false && objL.select === false) {
    // Tổng Xu Xỉu
    sum.TaiXiu_xu_tong_xiu += objL.bet;
  } else if (objL.taixiu === false && objL.red === true && objL.select === true) {
    // Tổng Red Chẵn
    sum.ChanLe_red_tong_chan += objL.bet;
  } else if (objL.taixiu === false && objL.red === true && objL.select === false) {
    // Tổng Red Lẻ
    sum.ChanLe_red_tong_le += objL.bet;
  } else if (objL.taixiu === false && objL.red === false && objL.select === true) {
    // Tổng xu Chẵn
    sum.ChanLe_xu_tong_chan += objL.bet;
  } else if (objL.taixiu === false && objL.red === false && objL.select === false) {
    // Tổng xu Lẻ
    sum.ChanLe_xu_tong_le += objL.bet;
  }
};

const processSumTaiXiu = function (sum) {
  sum.TaiXiu_tong_red_lech = Math.abs(sum.TaiXiu_red_tong_tai - sum.TaiXiu_red_tong_xiu);
  sum.TaiXiu_tong_xu_lech = Math.abs(sum.TaiXiu_xu_tong_tai - sum.TaiXiu_xu_tong_xiu);
  sum.ChanLe_tong_red_lech = Math.abs(sum.ChanLe_red_tong_chan - sum.ChanLe_red_tong_le);
  sum.ChanLe_tong_xu_lech = Math.abs(sum.ChanLe_xu_tong_chan - sum.ChanLe_xu_tong_le);

  sum.TaiXiu_red_lech_tai = sum.TaiXiu_red_tong_tai > sum.TaiXiu_red_tong_xiu ? true : false;
  sum.TaiXiu_xu_lech_tai = sum.TaiXiu_xu_tong_tai > sum.TaiXiu_xu_tong_xiu ? true : false;
  sum.ChanLe_red_lech_chan = sum.ChanLe_red_tong_chan > sum.ChanLe_red_tong_le ? true : false;
  sum.ChanLe_xu_lech_chan = sum.ChanLe_xu_tong_chan > sum.ChanLe_xu_tong_le ? true : false;

  sum.TaiXiu_red_tong_tai = null;
  sum.TaiXiu_red_tong_xiu = null;

  sum.TaiXiu_xu_tong_tai = null;
  sum.TaiXiu_xu_tong_xiu = null;

  sum.ChanLe_red_tong_chan = null;
  sum.ChanLe_red_tong_le = null;

  sum.ChanLe_xu_tong_chan = null;
  sum.ChanLe_xu_tong_le = null;
};

const initSumTaiXiu = function () {
  let sum = {};

  sum.TaiXiu_red_tong_tai = 0;
  sum.TaiXiu_red_tong_xiu = 0;

  sum.TaiXiu_xu_tong_tai = 0;
  sum.TaiXiu_xu_tong_xiu = 0;

  sum.ChanLe_red_tong_chan = 0;
  sum.ChanLe_red_tong_le = 0;

  sum.ChanLe_xu_tong_chan = 0;
  sum.ChanLe_xu_tong_le = 0;

  return sum;
};

const settleTaiXiuByGroup = function (dice, game_id, bets, userSettlements) {
  if (!bets || bets.length === 0) {
    return [];
  }

  let sum = initSumTaiXiu();

  bets.forEach(function (bet) {
    sumTaiXiu(bet, sum);
  });

  processSumTaiXiu(sum);

  return bets.map(function (bet) {
    return memberPayout(dice, game_id, bet, sum, userSettlements);
  });
};

const settleTaiXiu = function (dice, game_id, bets, uusUserIds, settlementTime) {
  if (bets.length) {
    let userSettlements = {};
    let normalBets = bets.filter((bet) => !uusUserIds.includes(bet.uid));
    // console.log('Normal Bets');
    // console.log(normalBets);
    let processNormalBets = settleTaiXiuByGroup(dice, game_id, normalBets, userSettlements);

    let uusBets = bets.filter((bet) => uusUserIds.includes(bet.uid));
    // console.log('UUS Bets');
    // console.log(uusBets);
    let processUUSBets = settleTaiXiuByGroup(dice, game_id, uusBets, userSettlements);

    Promise.all(processNormalBets.concat(processUUSBets)).then(function (resultUpdate) {
      playGame();
      //console.log(JSON.stringify(userSettlements));
      setTaiXiu_user(game_id, settlementTime);
    });
  } else if (dice) {
    playGame();
  }
};

const thongtin_thanhtoan = function (game_id, dice = false, settlementTime) {
  try {
    if (dice) {
      UserInfo.find({ currency: "UUS" }, "id", function (err, userInfoList) {
        if (err) {
          logger.logError(err);
        }

        let uusUserIds = userInfoList.map(function (user) {
          return user.id;
        });

        TXCuoc.find({ phien: game_id }, null, { sort: { _id: -1 } }, function (err, list) {
          if (err) {
            logger.logError(err);
          }

          settleTaiXiu(dice, game_id, list, uusUserIds, settlementTime);
        });
      });
    } else {
      // Users
      let home = {
        taixiu: {
          taixiu: {
            red_tai: io.taixiu.taixiu.red_tai,
            red_xiu: io.taixiu.taixiu.red_xiu,
          },
        },
      };

      Object.values(io.users).forEach(function (users) {
        users.forEach(function (client) {
          if (client.gameEvent !== void 0 && client.gameEvent.viewTaiXiu !== void 0 && client.gameEvent.viewTaiXiu) {
            io.taixiu.taixiu.red_player_tai = parseInt(
              (io.taixiu.playerBetBigCount * 100) / (io.taixiu.playerBetBigCount + io.taixiu.playerBetSmallCount)
            );
            io.taixiu.taixiu.red_player_xiu = 100 - io.taixiu.taixiu.red_player_tai;
            client.red({ taixiu: { taixiu: io.taixiu.taixiu } });
          } else if (client.scene == "home") {
            client.red(home);
          }
        });
      });

      // Admin
      Object.values(io.admins).forEach(function (admin) {
        admin.forEach(function (client) {
          if (client.gameEvent !== void 0 && client.gameEvent.viewTaiXiu !== void 0 && client.gameEvent.viewTaiXiu) {
            client.red({ taixiu: io.taixiuAdmin });
          }
        });
      });

      // Khách
      if (!(io.TaiXiu_time % 10)) {
        io.sendAllClient(home);
      }
    }
  } catch (error) {
    logger.logError(error);
  }
};

const resetTaiXiuClientAndAdmin = function (io) {
  io.taixiu = {
    ingame: {},
    playerBetBigCount: 0,
    playerBetSmallCount: 0,
    taixiu: {
      red_player_tai: 0,
      red_player_xiu: 0,
      red_tai: 0,
      red_xiu: 0,
      xu_player_tai: 0,
      xu_player_xiu: 0,
      xu_tai: 0,
      xu_xiu: 0,
    },
  };

  io.taixiuAdmin = {
    playerBetBigCount: 0,
    playerBetSmallCount: 0,
    taixiu: {
      red_player_tai: 0,
      red_player_xiu: 0,
      red_tai: 0,
      red_xiu: 0,
      xu_player_tai: 0,
      xu_player_xiu: 0,
      xu_tai: 0,
      xu_xiu: 0,
    },
    list: [],
  };
};

const resetBots = function () {
  bot.resetBots();
};

const throwDiceAndInsertNewPhien = function () {
  let dice1 = random();
  let dice2 = random();
  let dice3 = random();

  TXPhien.create({ dice1: dice1, dice2: dice2, dice3: dice3, time: new Date() }, function (err, create) {
    if (err) {
      logger.logError(err);
    }

    if (!!create) {
      io.TaiXiu_phien = create.id + 1;
      thongtin_thanhtoan(create.id, dice1 + dice2 + dice3, create.time);
      const { red_me_tai, red_me_xiu, xu_me_tai, xu_me_xiu, ...taixiuInfo } = io.taixiu.taixiu;
      io.sendAllUser({
        taixiu: {
          taixiu: taixiuInfo,
          finish: { dices: [create.dice1, create.dice2, create.dice3], phien: create.id },
        },
      });

      Object.values(io.admins).forEach(function (admin) {
        admin.forEach(function (client) {
          client.red({
            taixiu: { finish: { dices: [create.dice1, create.dice2, create.dice3], phien: create.id } },
          });
        });
      });
      dice1 = null;
      dice2 = null;
      dice3 = null;
    }
  });
};

const botPlacesBets = function (io) {
  bot.botPlacesBets(io);
};

const playGame = function () {
  io.TaiXiu_time = timeTX;
  this.disabled = false;

  // console.log(configs);

  gameLoop = setInterval(function () {
    const self = this;
    try {
      if (!(io.TaiXiu_time % 30)) {
        //TopHu();
      }

      if (io.TaiXiu_time == timeTX) {
        CheckUM(self);
      }

      if (!self.disabled) {
        io.TaiXiu_time--;

        if (io.TaiXiu_time === timeCuoc) {
          resetTaiXiuClientAndAdmin(io);
        } else if (io.TaiXiu_time < timeCuoc) {
          if (io.TaiXiu_time < 0) {
            clearInterval(gameLoop);

            try {
              // Kết thúc phiên
              io.TaiXiu_time = 1;

              throwDiceAndInsertNewPhien();
              resetBots();
            } catch (ex) {
              console.log(ex);
              logger.logError(ex);
            }
          } else {
            try {
              thongtin_thanhtoan(io.TaiXiu_phien);
              botPlacesBets(io);
            } catch (ex) {
              console.log(ex);
              logger.logError(ex);
            }
          }
        }
      }
    } catch (error) {
      console.log(error);
      logger.logError(error);
    }
  }, 1000);

  return gameLoop;
};

function CheckUM(self) {
  GameConfigs.findOne({ name: ConfigHelper.GameTypes.TaiXiu }, function (err, data) {
    if (err) {
      logger.logError(err);
    }

    try {
      ConfigHelper.updateConfig(ConfigHelper.GameTypes.TaiXiu, data);

      self.disabled = data == null || !data.enabled;

      if (self.disabled) {
        const payload = { taixiu: { um: true, um_message: data.disabled_message } };
        io.sendAllUser(payload);
        io.sendAllAdmin(payload, viewName);

        GameConfigs.updateOne({ name: ConfigHelper.GameTypes.TaiXiu }, { disabledround: io.TaiXiu_phien }, function (err, data) {
          if (err) {
            // console.log("update game config error");
            logger.logError(err);
          }
        });

        io.TaiXiu_time = timeTX;

        return;
      }

      io.sendAllUser({ taixiu: { time_remain: timeTX } });
      io.sendAllAdmin({ taixiu: { time_remain: timeTX, phien: io.TaiXiu_phien } }, viewName);
    } catch (err) {
      logger.logError(err);
    }
  });
}

module.exports = init;
