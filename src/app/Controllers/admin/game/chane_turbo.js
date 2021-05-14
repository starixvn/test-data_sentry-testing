const ChanLeTurbo_get = require("./chanle_turbo/get_time");

module.exports = function (client, data) {
  if (void 0 !== data.view) {
    client.gameEvent.viewChanLeTurbo = !!data.view;
  }
  if (void 0 !== data.get_time) {
    ChanLeTurbo_get(client);
  }
};
