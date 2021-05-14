const baseIndex = require("./../../MiniBase/index");

const definition = require("./definition");

module.exports = (player, payload) => baseIndex(definition, player, payload);
