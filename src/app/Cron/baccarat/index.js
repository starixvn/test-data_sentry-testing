const BaccaratPhien = require("../../Models/Baccarat/baccarat-phien");
const startGame = require("./game-handler");
const logger = require("./../../web/logger");
const constants = require("./constant");
const cloneDeep = require("lodash.clonedeep");

module.exports = io => {
  io.game.baccarat = {
    roundId: 1,
    remainingTime: 0,
    ingame: {},
    totalBets: { player: 0, banker: 0, big: 0, small: 0, tie: 0, playerPair: 0, bankerPair: 0 },
    totalBetsAdmin: { player: 0, banker: 0, big: 0, small: 0, tie: 0, playerPair: 0, bankerPair: 0 },
    realPlayers: {},
    players: {},
    disabled: false,
    winningPlayers: {},
    chips: cloneDeep(constants.defaultChips),
    settlementResultFromAdmin: {
      roundId: 0,
      result: {
        player: [],
        banker: []
      }
    }
  };

  BaccaratPhien
    .findOne({}, "id", { sort: { _id: -1 } })
    .then(last => {
      if (!!last) {
        io.game.baccarat.roundId = last.id + 1;
      }

      startGame(io);
    })
    .catch(err => logger.logError(err));
};
