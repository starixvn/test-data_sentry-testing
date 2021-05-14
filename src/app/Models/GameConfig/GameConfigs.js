let mongoose = require("mongoose");

let Schema = new mongoose.Schema({
  name: { type: String, required: true },
  enabled: { type: Boolean, required: true },
  minbet: { type: mongoose.Schema.Types.Number, required: true },
  maxbet: { type: mongoose.Schema.Types.Number, required: true },
  disabledround: { type: Number, required: false },
  botenabled: { type: Boolean, default: false },
  maxbot: { type: Number, required: true },
  bot_maxbet: { type: Number, required: false },
  bot_minbet: { type: Number, required: false },
  hour_maxbot: { type: Array, required: false },
  disabled_message: { type: String, required: false },
  choices_maxbet: { type: Object, required: false },
  odds: { type: Object, required: false },
  delayStartTime: { type: Number, required: false },
  enableFreeBet: { type: Boolean, default: false },
  slotsConfig: { type: Object },
  siteExclusions: { type: Array },
});

Schema.index({ name: 1 }, { unique: true, background: true });

module.exports = mongoose.model("game_configs", Schema);
