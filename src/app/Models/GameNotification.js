const mongoose = require("mongoose");

const Schema = new mongoose.Schema({
  uid: { type: String, required: true },
  gameId: { type: Number, required: true },
  gameInfo: { type: Object },
});

module.exports = mongoose.model("GameNotification", Schema);
