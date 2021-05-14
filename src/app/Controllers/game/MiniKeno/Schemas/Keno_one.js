const { Schema } = require("mongoose");

module.exports = new Schema({
  uid: { type: String, required: true },
  name: { type: String, required: true },
  phien: { type: Number, required: true },

  big: { type: Number, default: 0 },
  small: { type: Number, default: 0 },
  odd: { type: Number, default: 0 },
  even: { type: Number, default: 0 },
  gold: { type: Number, default: 0 },
  wood: { type: Number, default: 0 },
  water: { type: Number, default: 0 },
  fire: { type: Number, default: 0 },
  earth: { type: Number, default: 0 },

  thanhtoan: { type: Boolean, default: false },
  betwin: { type: Number, default: 0 },
  time: { type: Date },
  odds: { type: Object },

  memberId: { type: Number },
  siteId: { type: String },
});
