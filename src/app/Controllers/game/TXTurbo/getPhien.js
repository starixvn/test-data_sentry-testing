const TXTurboPhien = require("../../../Models/TXTurbo/TXTurbo_phien");
const TXTurboCuoc = require("../../../Models/TXTurbo/TXTurbo_cuoc");
const UserInfo = require("../../../Models/UserInfo");

const logger = require("./../../../web/logger");

module.exports = function (client, data) {
  try {
    if (!!data && !!data.phien) {
      const phien = data.phien >> 0;
      const taixiu = !!data.taixiu;
      const red = !!data.red;

      const getPhien = TXTurboPhien.findOne({ id: phien }).exec();
      const uusUser = UserInfo.find({ currency: "UUS" }, "id").exec();
      const getCuoc = TXTurboCuoc.find({ phien: phien, taixiu: taixiu, red: red }, null, { sort: { _id: 1 } }).exec();

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
            client.red({ taixiu_turbo: { get_phien: dataT } });
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
