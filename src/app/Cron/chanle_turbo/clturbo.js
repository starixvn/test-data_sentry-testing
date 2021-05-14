//let path        = require('path');
const UserInfo = require("../../Models/UserInfo");
const ChanLeTurboPhien = require("../../Models/ChanLeTurbo/ChanLeTurbo_phien");
const ChanLeTurboCuoc = require("../../Models/ChanLeTurbo/ChanLeTurbo_cuoc");
const ChanLeTurboCuocOne = require("../../Models/ChanLeTurbo/ChanLeTurbo_one");
const GameConfigs = require("../../Models/GameConfig/GameConfigs");

const gameIds = require("../../../config/appConfigs").gameIds;
const balanceApi = require("../../apis/balanceApi");
const logger = require("../../web/logger");
const ConfigHelper = require("../../Helpers/ConfigHelper");
const bot = require("./botchanle");

const random = require("./../../Controllers/diceRandom").random;

let io = null;
let gameLoop = null;
const timeCL = 36;
const timeCuoc = 30;
const viewName = "viewChanLeTurbo";

const init = function (obj) {
  io = obj;

  io.clturbo = {
    ingame: {},
    playerBetEvenCount: 0,
    playerBetOddCount: 0,
    clturbo: {
      red_chan: 0,
      red_le: 0,
      red_player_chan: 0,
      red_player_le: 0,
    },
  };

  io.clturboAdmin = {
    playerBetEvenCount: 0,
    playerBetOddCount: 0,
    clturbo: {
      red_chan: 0,
      red_le: 0,
      red_player_chan: 0,
      red_player_le: 0,
    },
    list: [],
  };

  ConfigHelper.reloadConfigs(ConfigHelper.GameTypes.CLTurbo);

  playGame();
};

ChanLeTurboPhien.findOne({}, "id", { sort: { id: -1 } }, function (_err, last) {
  if (!!last) {
    io.ChanLeTurbo_phien = last.id + 1;
  }
});

const truChietKhau = function (bet, phe) {
  const chietkhau = bet - (bet * phe) / 100;

  return chietkhau;
};

const setChanLeTurbo_User = function (phien, settlementTime) {
  ChanLeTurboCuocOne.find({ phien: phien, thanhtoan: true }, {}, function (_err, list) {
    if (list.length) {
      Promise.all(
        list.map(function (obj) {
          let action = new Promise((resolve, reject) => {
            try {
              let bet_thua = obj.bet - obj.tralai;
              let bet = obj.win ? obj.betwin + obj.bet : bet_thua;

              const gameInfo = {
                gameId: gameIds.clturbo,
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
                      clturbo: {
                        status: { win: obj.win, thuong: obj.thuong, select: obj.select, bet: bet },
                      },
                    });
                  });
                }

                resolve({ uid: obj.uid, red: obj.red, betwin: obj.betwin });
              });
            } catch (ex) {
              logger.log(ex);
              resolve({ uid: obj.uid, red: obj.red, betwin: obj.betwin });
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

  if (obj.select === true) {
    // Tổng Red Tài
    let win = dice % 2 == 0;
    if (sum.ChanLeTurbo_red_lech_chan && sum.ChanLeTurbo_tong_red_lech > 0) {
      if (sum.ChanLeTurbo_tong_red_lech >= obj.bet) {
        // Trả lại hoàn toàn
        sum.ChanLeTurbo_tong_red_lech -= obj.bet;
        // trả lại hoàn toàn
        obj.thanhtoan = true;
        obj.win = win;
        obj.tralai = obj.bet;
        obj.save();

        userSettlements[obj.uid].redPlay = obj.bet;
        userSettlements[obj.uid].red += obj.bet;

        return ChanLeTurboCuocOne.updateOne(
          { uid: obj.uid, phien: game_id, select: true, red: true },
          { $set: { win: win, thanhtoan: true, time: new Date() }, $inc: { tralai: obj.bet } }
        ).exec();
      } else {
        // Trả lại 1 phần
        let betPlay = obj.bet - sum.ChanLeTurbo_tong_red_lech;
        let betwinP = 0;

        obj.thanhtoan = true;
        obj.win = win;
        obj.tralai = sum.ChanLeTurbo_tong_red_lech;
        sum.ChanLeTurbo_tong_red_lech = 0;

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
        return ChanLeTurboCuocOne.updateOne(
          { uid: obj.uid, phien: game_id, select: true, red: true },
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

        return ChanLeTurboCuocOne.updateOne(
          { uid: obj.uid, phien: game_id, select: true, red: true },
          { $set: { win: true, thanhtoan: true, time: new Date() }, $inc: { betwin: betwin } }
        ).exec();
      } else {
        obj.thanhtoan = true;
        obj.save();

        userSettlements[obj.uid].redPlay += obj.bet;
        userSettlements[obj.uid].redLost += obj.bet;

        return ChanLeTurboCuocOne.updateOne(
          { uid: obj.uid, phien: game_id, select: true, red: true },
          { $set: { thanhtoan: true, time: new Date() } }
        ).exec();
      }
    }
  } else {
    let win = dice % 2 != 0;
    if (!sum.ChanLeTurbo_red_lech_chan && sum.ChanLeTurbo_tong_red_lech > 0) {
      if (sum.ChanLeTurbo_tong_red_lech >= obj.bet) {
        // Trả lại hoàn toàn
        sum.ChanLeTurbo_tong_red_lech -= obj.bet;
        // trả lại hoàn toàn
        obj.thanhtoan = true;
        obj.win = win;
        obj.tralai = obj.bet;
        obj.save();

        userSettlements[obj.uid].red += obj.bet;
        userSettlements[obj.uid].redPlay += obj.bet;
        //balanceApi.endGame(obj.uid, gameInfo, { red: obj.bet });

        return ChanLeTurboCuocOne.updateOne(
          { uid: obj.uid, phien: game_id, select: false, red: true },
          { $set: { win: win, thanhtoan: true, time: new Date() }, $inc: { tralai: obj.bet } }
        ).exec();
      } else {
        // Trả lại 1 phần
        let betPlay = obj.bet - sum.ChanLeTurbo_tong_red_lech;
        let betwinP = 0;

        obj.thanhtoan = true;
        obj.win = win;
        obj.tralai = sum.ChanLeTurbo_tong_red_lech;
        sum.ChanLeTurbo_tong_red_lech = 0;

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
        return ChanLeTurboCuocOne.updateOne(
          { uid: obj.uid, phien: game_id, select: false, red: true },
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

        return ChanLeTurboCuocOne.updateOne(
          { uid: obj.uid, phien: game_id, select: false, red: true },
          { $set: { win: true, thanhtoan: true, time: new Date() }, $inc: { betwin: betwin } }
        ).exec();
      } else {
        obj.thanhtoan = true;
        obj.save();

        userSettlements[obj.uid].redLost += obj.bet;
        userSettlements[obj.uid].redPlay += obj.bet;

        return ChanLeTurboCuocOne.updateOne(
          { uid: obj.uid, phien: game_id, select: false, red: true },
          { $set: { thanhtoan: true, time: new Date() } }
        ).exec();
      }
    }
  }
};

const sumTaiXiu = function (objL, sum) {
  if (objL.select === true) {
    // Tổng Red Chẵn
    sum.ChanLeTurbo_red_tong_chan += objL.bet;
  } else {
    // Tổng Red Lẻ
    sum.ChanLeTurbo_red_tong_le += objL.bet;
  }
};

const processSumTaiXiu = function (sum) {
  sum.ChanLeTurbo_tong_red_lech = Math.abs(sum.ChanLeTurbo_red_tong_chan - sum.ChanLeTurbo_red_tong_le);

  sum.ChanLeTurbo_red_lech_chan = sum.ChanLeTurbo_red_tong_chan > sum.ChanLeTurbo_red_tong_le ? true : false;

  sum.ChanLeTurbo_red_tong_chan = null;
  sum.ChanLeTurbo_red_tong_le = null;
};

const initSumTaiXiu = function () {
  let sum = {};

  sum.ChanLeTurbo_red_tong_chan = 0;
  sum.ChanLeTurbo_red_tong_le = 0;

  return sum;
};

const settleChanLeTurboByGroup = function (dice, game_id, bets, userSettlements) {
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

const settleChanLeTurbo = function (dice, game_id, bets, uusUserIds, settlementTime) {
  if (bets.length) {
    let userSettlements = {};
    let normalBets = bets.filter((bet) => !uusUserIds.includes(bet.uid));

    let processNormalBets = settleChanLeTurboByGroup(dice, game_id, normalBets, userSettlements);

    let uusBets = bets.filter((bet) => uusUserIds.includes(bet.uid));

    let processUUSBets = settleChanLeTurboByGroup(dice, game_id, uusBets, userSettlements);

    Promise.all(processNormalBets.concat(processUUSBets)).then(function () {
      playGame();
      setChanLeTurbo_User(game_id, settlementTime);
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

        ChanLeTurboCuoc.find({ phien: game_id }, null, { sort: { _id: -1 } }, function (err, list) {
          if (err) {
            logger.logError(err);
          }

          settleChanLeTurbo(dice, game_id, list, uusUserIds, settlementTime);
        });
      });
    } else {
      // Users
      Object.values(io.users).forEach(function (users) {
        users.forEach(function (client) {
          if (client.gameEvent !== void 0 && client.gameEvent.viewChanLeTurbo !== void 0 && client.gameEvent.viewChanLeTurbo) {
            io.clturbo.clturbo.red_player_chan = parseInt(
              (io.clturbo.playerBetEvenCount * 100) / (io.clturbo.playerBetEvenCount + io.clturbo.playerBetOddCount)
            );
            io.clturbo.clturbo.red_player_le = 100 - io.clturbo.clturbo.red_player_chan;
            client.red({ clturbo: { clturbo: io.clturbo.clturbo } });
          }
        });
      });

      // Admin
      Object.values(io.admins).forEach(function (admin) {
        admin.forEach(function (client) {
          if (client.gameEvent !== void 0 && client.gameEvent.viewChanLeTurbo !== void 0 && client.gameEvent.viewChanLeTurbo) {
            client.red({ clturbo: io.clturboAdmin });
          }
        });
      });
    }
  } catch (error) {
    logger.logError(error);
  }
};

const resetChanLeTurboClientAndAdmin = function (io) {
  io.clturbo = {
    ingame: {},
    playerBetEvenCount: 0,
    playerBetOddCount: 0,
    clturbo: {
      red_chan: 0,
      red_le: 0,
      red_player_chan: 0,
      red_player_le: 0,
    },
  };

  io.clturboAdmin = {
    playerBetEvenCount: 0,
    playerBetOddCount: 0,
    clturbo: {
      red_chan: 0,
      red_le: 0,
      red_player_chan: 0,
      red_player_le: 0,
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

  ChanLeTurboPhien.create({ dice1: dice1, dice2: dice2, dice3: dice3, time: new Date() }, function (err, create) {
    if (err) {
      logger.logError(err);
    }

    if (!!create) {
      io.ChanLeTurbo_phien = create.id + 1;
      thongtin_thanhtoan(create.id, dice1 + dice2 + dice3, create.time);
      const { ...clturboInfo } = io.clturbo.clturbo;
      io.sendAllUser({
        clturbo: {
          clturbo: clturboInfo,
          finish: { dices: [create.dice1, create.dice2, create.dice3], phien: create.id },
        },
      });

      Object.values(io.admins).forEach(function (admin) {
        admin.forEach(function (client) {
          client.red({
            clturbo: { finish: { dices: [create.dice1, create.dice2, create.dice3], phien: create.id } },
          });
        });
      });
      dice1 = null;
      dice2 = null;
      dice3 = null;
    }
  });
};

const botPlacesBets = function () {
  bot.botPlacesBets(io);
};

const playGame = function () {
  io.ChanLeTurbo_time = timeCL;
  this.disabled = false;

  gameLoop = setInterval(function () {
    const self = this;
    try {
      if (io.ChanLeTurbo_time == timeCL) {
        CheckUM(self);
      }

      if (!self.disabled) {
        io.ChanLeTurbo_time--;

        if (io.ChanLeTurbo_time === timeCuoc) {
          resetChanLeTurboClientAndAdmin(io);
        } else if (io.ChanLeTurbo_time < timeCuoc) {
          if (io.ChanLeTurbo_time < 0) {
            clearInterval(gameLoop);

            try {
              // Kết thúc phiên
              io.ChanLeTurbo_time = 1;

              throwDiceAndInsertNewPhien();
              resetBots();
            } catch (ex) {
              logger.logError(ex);
            }
          } else {
            try {
              thongtin_thanhtoan(io.ChanLeTurbo_phien);
              botPlacesBets();
            } catch (ex) {
              logger.logError(ex);
            }
          }
        }
      }
    } catch (error) {
      logger.logError(error);
    }
  }, 1000);

  return gameLoop;
};

function CheckUM(self) {
  GameConfigs.findOne({ name: ConfigHelper.GameTypes.CLTurbo }, function (err, data) {
    if (err) {
      logger.logError(err);
    }

    ConfigHelper.updateConfig(ConfigHelper.GameTypes.CLTurbo, data);

    self.disabled = data == null || !data.enabled;
    const disabledMessage = data == null ? "" : data.disabled_message;

    if (self.disabled) {
      const payload = { clturbo: { um: true, um_message: disabledMessage } };
      io.sendAllUser(payload);
      io.sendAllAdmin(payload, viewName);

      GameConfigs.updateOne({ name: ConfigHelper.GameTypes.CLTurbo }, { disabledround: io.ChanLeTurbo_phien }, function (err, data) {
        if (err) {
          // console.log("update game config error");
          logger.logError(err);
        }
      });

      io.ChanLeTurbo_time = timeCL;

      return;
    }

    io.sendAllUser({ clturbo: { time_remain: timeCL } });
    io.sendAllAdmin({ clturbo: { time_remain: timeCL, phien: io.ChanLeTurbo_phien } }, viewName);
  });
}

module.exports = init;
