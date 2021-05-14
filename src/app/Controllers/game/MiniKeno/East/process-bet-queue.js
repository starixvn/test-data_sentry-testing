const proceedBetQueue = require("./../../MiniBase/place-bet").proceedBetQueue;

const definition = require("./definition");

module.exports = (io) => proceedBetQueue(io, definition);
