const ChanLeTurboPhien = require("../../../Models/ChanLeTurbo/ChanLeTurbo_phien");
const ChanLeTurboCuoc = require("../../../Models/ChanLeTurbo/ChanLeTurbo_cuoc");
const UserInfo = require("../../../Models/UserInfo");

const balanceApi = require("./../../../apis/balanceApi");
const logger = require("./../../../web/logger");
const ConfigHelper = require("./../../../Helpers/ConfigHelper");
const NoticeMessages = require("./../constants/notice-messages");

const getLogs = require("./get-logs");

function getNew(client) {
  balanceApi.getBalance({ id: client.UID }, client, function (user) {
    if (!!user) {
      client.red({ user });
    }
  });
}

const validateBetRequest = (player, payload) => {
  const bet = payload.bet >> 0;
  const select = !!payload.select;
  const configs = ConfigHelper.getConfigs(ConfigHelper.GameTypes.CLTurbo);

  const gameData = player.redT.clturbo;
  const { betTracks } = gameData.ingame[player.profile.name] || { betTracks: {} };

  const criteria = [
    {
      failure: player.redT.ChanLeTurbo_time < 6 || player.redT.ChanLeTurbo_time >= 30,
      notice: NoticeMessages.placeBetNextRound,
    },
    {
      failure: bet < configs.minbet,
      notice: NoticeMessages.minBet(configs.minbet),
    },
    {
      failure: bet > configs.maxbet,
      notice: NoticeMessages.maxBet(configs.maxbet),
    },
    {
      failure: bet > configs.maxbet,
      notice: NoticeMessages.maxBet(configs.maxbet),
    },
    {
      failure: betTracks[select] + bet > configs.maxbet,
      notice: NoticeMessages.maxBet(configs.maxbet),
    },
    {
      failure: (betTracks[!select] ?? 0) > 0,
      notice: NoticeMessages.oneChoiceAllowed,
    },
  ];

  const failedCriterion = criteria.find((criterion) => criterion.failure);

  if (failedCriterion) {
    player.red({ clturbo: { err: failedCriterion.notice } });

    return false;
  }

  return true;
};

const cuoc = function (player, payload) {
  if (validateBetRequest(player, payload)) {
    const name = player.profile.name;
    const bet = payload.bet >> 0;
    const select = !!payload.select;
    const gameData = player.redT.clturbo;

    if (gameData.ingame[name]) {
      gameData.ingame[name].betTracks[select] += bet;
      gameData.ingame[name].betQueue.push({ player, payload });
    } else {
      const newPlayer = {
        name: player.profile.name,
        betTracks: {},
        betQueue: [{ player, payload }],
      };

      newPlayer.betTracks[select] = bet;
      gameData.ingame[name] = newPlayer;
    }
  }
};

const get_phien = function (client, data) {
  try {
    if (!!data && !!data.phien) {
      const phien = data.phien >> 0;

      const getPhien = ChanLeTurboPhien.findOne({ id: phien }).exec();
      const uusUser = UserInfo.find({ currency: "UUS" }, "id").exec();
      const getCuoc = ChanLeTurboCuoc.find({ phien: phien }, null, { sort: { _id: 1 } }).exec();

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
            client.red({ clturbo: { get_phien: dataT } });
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
      ChanLeTurboCuoc.countDocuments({ uid: client.UID, thanhtoan: true }).exec(function (_err, total) {
        ChanLeTurboCuoc.find(
          { uid: client.UID, thanhtoan: true },
          {},
          { sort: { _id: -1 }, skip: (page - 1) * kmess, limit: kmess },
          function (_error, result) {
            if (result.length) {
              Promise.all(
                result.map(function (obj) {
                  obj = obj._doc;
                  const getPhien = ChanLeTurboPhien.findOne({ id: obj.phien }).exec();
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
                  clturbo: {
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
                clturbo: {
                  get_log: { data: [], page: page, kmess: kmess, total: 0 },
                },
              });
            }
          }
        );
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
