const getTopHQ = require("./getTopHQ");

module.exports = function (client, data) {
  if (!!data.getTopHQ) {
    getTopHQ(client, data.getTopHQ);
  }
};
