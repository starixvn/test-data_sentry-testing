const ChanLe_get = require("./chanle/get_time");

module.exports = function (client, data) {
  if (void 0 !== data.view) {
    client.gameEvent.viewChanLe = !!data.view;
  }
  if (void 0 !== data.get_time) {
    ChanLe_get(client);
  }
};
