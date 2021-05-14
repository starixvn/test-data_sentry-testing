const get_time = require("./txturbo/get_time");

module.exports = function (client, data) {
  if (void 0 !== data.view) {
    client.gameEvent.viewTaiXiuTurbo = !!data.view;
  }
  if (void 0 !== data.get_time) {
    get_time(client);
  }
};
