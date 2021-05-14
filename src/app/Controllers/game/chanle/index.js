const ChanLePhien = require("../../../Models/ChanLe/ChanLe_phien");
const ChanLeCuoc = require("../../../Models/ChanLe/ChanLe_cuoc");
const ChanLeCuocOne = require("../../../Models/ChanLe/ChanLe_one");
const UserInfo = require("../../../Models/UserInfo");

const balanceApi = require("./../../../apis/balanceApi");
const gameIds = require("./../../../../config/appConfigs").gameIds;
const betChoiceMapper = require("./../../../apis/betChoiceMapper");
const logger = require("./../../../web/logger");
const ConfigHelper = require("./../../../Helpers/ConfigHelper");
const helper = require("./../../../Helpers/Helpers");

let configs = null;

function getLogs(client) {
  const data = JSON.parse(JSON.stringify(client.redT.chanle));

  data.chanle.red_me_chan = 0;
  data.chanle.red_me_le = 0;

  const active1 = new Promise((resolve, reject) => {
    ChanLePhien.find({}, {}, { sort: { _id: -1 }, limit: 125 }, function (err, post) {
      if (err) {
        logger.logError(err);
        resolve([]);
        return;
      }

      if (post) {
        Promise.all(
          post.map(function (obj) {
            return { dice: [obj.dice1, obj.dice2, obj.dice3], phien: obj.id };
          })
        ).then(function (arrayOfResults) {
          resolve(arrayOfResults);
        });
      }
    });
  });

  const active2 = Promise.all(
    client.redT.chanleAdmin.list.map(function (game) {
      try {
        if (client && client.profile && client.profile.name) {
          if (game.name == client.profile.name) {
            if (game.select) {
              data.chanle.red_me_chan += game.bet;
            } else {
              data.chanle.red_me_le += game.bet;
            }
          }
        }
      } catch (ex) {
        logger.logError(ex);
      }
    })
  );

  Promise.all([active1, active2]).then((values) => {
    data.logs = values[0];
    client.red({ chanle: data });
  });
}

function getNew(client) {
  balanceApi.getBalance({ id: client.UID }, client, function (user) {
    if (!!user) {
      client.red({ user });
    }
  });
}

function insertBetAndNotifyUsers(client, user, phien, bet, select, totalBet, updatedUser, playerBetCount, io) {
  const red = true;
  const isUUSAccount = client.session && client.session.currency && client.session.currency.toUpperCase() === "UUS";

  let create = {
    uid: client.UID,
    name: user.name,
    phien: phien,
    bet: bet,
    taixiu: false,
    select: select,
    red: red,
    time: new Date(),
  };

  if (client.session) {
    create.memberId = client.session.memberId;
    create.siteId = client.session.siteId;
  }

  ChanLeCuoc.create(create)
    .then(() => {
      if (io) {
        if (red && !isUUSAccount) {
          if (select) {
            io.chanle.chanle.red_chan += bet;
            io.chanleAdmin.chanle.red_chan += bet;

            io.chanle.playerBetEvenCount += playerBetCount;
            io.chanleAdmin.playerBetEvenCount += playerBetCount;
          } else {
            io.chanle.chanle.red_le += bet;
            io.chanleAdmin.chanle.red_le += bet;

            io.chanle.playerBetOddCount += playerBetCount;
            io.chanleAdmin.playerBetOddCount += playerBetCount;
          }
        }

        io.chanleAdmin.list.unshift({
          name: user.name,
          select: select,
          red: red,
          bet: bet,
          time: new Date(),
        });

        const chanleVery = select ? { red_me_chan: totalBet } : { red_me_le: totalBet };

        if (!!io.users[client.UID]) {
          Promise.all(
            io.users[client.UID].map(function (obj) {
              obj.red({
                chanle: { chanle: chanleVery },
                user: { red: updatedUser.red },
              });
            })
          );
        }
      }
    })
    .catch((error) => logger.logError(error));
}

const cuoc = function (client, data) {
  try {
    if (!!data) {
      configs = ConfigHelper.getConfigs(ConfigHelper.GameTypes.ChanLe);

      if (client.redT.ChanLe_time < 6 || client.redT.ChanLe_time >= 50) {
        client.red({ chanle: { err: "Vui lòng đặt cược ở phiên sau." } });
      } else {
        const bet = data.bet >> 0; // Số tiền
        const red = true;
        const select = !!data.select; // Cửa đặt (Tài:1, Xỉu:0)
        //console.log(bet);
        if (bet < configs.minbet) {
          client.red({ chanle: { err: "Tiền cược tối thiểu là " + helper.formatNumberWithComma(configs.minbet) } });
        } else if (bet > configs.maxbet) {
          client.red({ chanle: { err: "Tiền cược tối đa là " + helper.formatNumberWithComma(configs.maxbet) } });
        } else {
          const phien = client && client.redT ? client.redT.ChanLe_phien : 0;
          const io = client && client.redT ? client.redT : null;
          data.inSufficientBalance = { chanle: { err: "Bạn hiện không có đủ tiền để cược." } };
          data.gameId = gameIds.chanle;
          data.gameRoundId = phien;
          data.choiceId = betChoiceMapper.convertChanLe(select);
          data.cuoc = bet;

          UserInfo.findOne({ id: client.UID }, red ? "red name" : "xu name", function (err, userInfo) {
            if (err) {
              logger.logError(err);
            }

            balanceApi.placeBet({ id: client.UID }, data, client, (user, {}, updateUserRed) => {
              ChanLeCuocOne.findOne({ uid: client.UID, phien: phien, red: red }, function (isCuocErr, isCuoc) {
                if (isCuocErr) {
                  logger.logError(err);
                }

                try {
                  user.name = userInfo.name;
                  const totalBet = isCuoc ? isCuoc.bet + bet : bet;
                  const playerBetCount = isCuoc ? 0 : 1;

                  if (!!isCuoc) {
                    // update
                    if (isCuoc.select !== select) {
                      client.red({ chanle: { err: "Chỉ được cược 1 bên." } });

                      return;
                    }

                    if (isCuoc.bet + bet > configs.maxbet) {
                      client.red({ chanle: { err: "Tiền cược tối đa là " + helper.formatNumberWithComma(configs.maxbet) } });

                      return;
                    }
                  }

                  updateUserRed((updatedUser) => {
                    const cuocOneCreate = { uid: client.UID, phien: phien, select: select, red: red };
                    if (client.session) {
                      cuocOneCreate.memberId = client.session.memberId;
                      cuocOneCreate.siteId = client.session.siteId;
                    }

                    ChanLeCuocOne.updateOne(
                      { uid: client.UID, phien: phien, red: red, select: select },
                      { $inc: { bet: bet }, $setOnInsert: cuocOneCreate },
                      { upsert: true, setDefaultsOnInsert: true }
                    )
                      .exec()
                      .then((result) => {
                        if (result.ok == 1) {
                          insertBetAndNotifyUsers(client, user, phien, bet, select, totalBet, updatedUser, playerBetCount, io);
                        } else {
                          logger.logWarning(`Upsert CL ONE failed ${JSON.stringify(result)}`);
                        }
                      })
                      .catch((error) => {
                        logger.logError(error);
                      });
                  });
                } catch (ex) {
                  logger.logError(ex);
                }
              });
            });
          });
        }
      }
    }
  } catch (ex) {
    logger.logError(ex);
  }
};

const get_phien = function (client, data) {
  try {
    if (!!data && !!data.phien) {
      const phien = data.phien >> 0;

      const getPhien = ChanLePhien.findOne({ id: phien }).exec();
      const uusUser = UserInfo.find({ currency: "UUS" }, "id").exec();
      const getCuoc = ChanLeCuoc.find({ phien: phien }, null, { sort: { _id: 1 } }).exec();

      let tong_L = 0;
      let tong_R = 0;
      let tong_tralai_L = 0;
      let tong_tralai_R = 0;

      Promise.all([getPhien, getCuoc, uusUser]).then((values) => {
        if (!!values[0]) {
          let infoPhienCuoc = values[0];
          let phienCuoc = values[1];
          let uusUsers = values[2];

          phienCuoc = phienCuoc.filter(function (obj) {
            return (
              !uusUsers ||
              uusUsers.filter((uusUser) => {
                return uusUser.id === obj.uid;
              }).length == 0
            );
          });

          const dataT = {};
          dataT["phien"] = phien;
          dataT["time"] = infoPhienCuoc.time;
          dataT["dice"] = [infoPhienCuoc.dice1, infoPhienCuoc.dice2, infoPhienCuoc.dice3];
          const dataL = new Promise((resolve, reject) => {
            Promise.all(
              phienCuoc.filter(function (obj) {
                if (obj.select) {
                  tong_L += obj.bet;
                  tong_tralai_L += obj.tralai;
                } else {
                  tong_R += obj.bet;
                  tong_tralai_R += obj.tralai;
                }
                return obj.select == 1;
              })
            ).then(function (arrayOfResults) {
              resolve(arrayOfResults);
            });
          });
          const dataR = new Promise((resolve, reject) => {
            Promise.all(
              phienCuoc.filter(function (obj) {
                return obj.select == 0;
              })
            ).then(function (arrayOfResults) {
              resolve(arrayOfResults);
            });
          });
          Promise.all([dataL, dataR]).then((result) => {
            dataT["tong_L"] = tong_L;
            dataT["tong_R"] = tong_R;
            dataT["tong_tralai_L"] = tong_tralai_L;
            dataT["tong_tralai_R"] = tong_tralai_R;
            dataT["dataL"] = result[0];
            dataT["dataR"] = result[1];
            client.red({ chanle: { get_phien: dataT } });
          });
        } else {
          client.red({
            notice: { title: "LỖI", text: "Phiên không tồn tại...", load: false },
          });
        }
      });
    }
  } catch (error) {
    logger.logError(error);
  }
};

const get_log = function (client, data) {
  if (!!data && !!data.page) {
    const page = data.page >> 0;
    const kmess = 9;
    if (page > 0) {
      ChanLeCuoc.countDocuments({ uid: client.UID, thanhtoan: true }).exec(function (_err, total) {
        ChanLeCuoc.find({ uid: client.UID, thanhtoan: true }, {}, { sort: { _id: -1 }, skip: (page - 1) * kmess, limit: kmess }, function (
          error,
          result
        ) {
          if (result.length) {
            Promise.all(
              result.map(function (obj) {
                obj = obj._doc;
                const getPhien = ChanLePhien.findOne({ id: obj.phien }).exec();
                return Promise.all([getPhien]).then((values) => {
                  Object.assign(obj, values[0]._doc);
                  delete obj.__v;
                  delete obj._id;
                  delete obj.thanhtoan;
                  delete obj.id;
                  delete obj.uid;
                  return obj;
                });
              })
            ).then(function (arrayOfResults) {
              client.red({
                chanle: {
                  get_log: {
                    data: arrayOfResults,
                    page: page,
                    kmess: kmess,
                    total: total,
                  },
                },
              });
            });
          } else {
            client.red({
              chanle: {
                get_log: { data: [], page: page, kmess: kmess, total: 0 },
              },
            });
          }
        });
      });
    }
  }
};

module.exports = {
  getLogs: getLogs,
  cuoc: cuoc,
  get_phien: get_phien,
  get_log: get_log,
  getNew: getNew,
};
