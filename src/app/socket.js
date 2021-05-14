let first = require("./Controllers/User.js").first;
let onPost = require("./Controllers/onPost.js");
const baccaratPlayerHandler = require("./Controllers/game/baccarat/player-handler");
const removeRoulettePlayerOutOfRoom = require("./Controllers/game/Roulette/out-game");

let auth = async (client) => {
  client.gameEvent = {};
  client.scene = "home";
  await first(client);
};

let signMethod = function (client) {
  client.TTClear = function () {
    this.redT && delete this.redT;

    this.TTClear = null;
  };
};

module.exports = {
  auth: auth,
  message: onPost,
  signMethod: signMethod,
};
