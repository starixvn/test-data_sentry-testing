const registerKenoProMax = require("./KenoProMax/reg");
const baccaratHandler = require("./baccarat/player-handler");
const registerRoulette = require("./Roulette/reg");

module.exports = function (client, game) {
  switch (game) {
    case "KenoProMax":
      registerKenoProMax(client);
      break;
    case "baccarat":
      baccaratHandler.registerBaccarat(client);
      break;
    case "roulette":
      registerRoulette(client);
      break;
  }
};
