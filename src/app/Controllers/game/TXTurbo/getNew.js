const balanceApi = require("../../../apis/balanceApi");

module.exports = function (client) {
  balanceApi.getBalance({ id: client.UID }, client, function (user) {
    if (!!user) {
      client.red({ user });
    }
  });
};
