const TaiXiu_get = require("./taixiu/get_time");

module.exports = function (client, data) {
  if (void 0 !== data.view) {
    client.gameEvent.viewTaiXiu = !!data.view;
  }
  if (void 0 !== data.get_time) {
    TaiXiu_get(client);
  }
};
