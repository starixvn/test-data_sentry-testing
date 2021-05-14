let MiniDragonTiger_Phien = require("./../../Models/MiniDragonTiger/MiniDragonTiger_phien");
let playGame = require("./playgame");

let io = null;

module.exports = function (obj) {
  io = obj;

  io.miniDragonTiger = {
    phien: 1,
    time: 0,
    ingame: {},
    data: { dragon: 0, tiger: 0, tie: 0 },
    dataAdmin: { dragon: 0, tiger: 0, tie: 0 },
  };

  MiniDragonTiger_Phien.findOne({}, "id", { sort: { _id: -1 } }, (_err, last) => {
    if (!!last) {
      io.miniDragonTiger.phien = last.id + 1;
    }

    playGame(io);
  });
};
