const TaiXiu_event = require("../../../Models/TaiXiu/TaiXiu_event");

module.exports = function (client, date) {
  const topWin = TaiXiu_event.find({ date: date, win: true }, {}, { sort: { top: -1 } }).exec();
  const topLost = TaiXiu_event.find({ date: date, win: false }, {}, { sort: { top: -1 } }).exec();

  Promise.all([topWin, topLost]).then((result) => {
    client.red({ event: { taixiu: { topHQ: { win: result[0], lost: result[1] } } } });
  });
};
