let mongoose = require("mongoose");

let Schema = new mongoose.Schema({
  uid: { type: String, required: true },
  name: { type: String, required: true },
  phien: { type: Number, required: true, index: true },

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

  memberId: { type: Number },
  siteId: { type: String },
});

module.exports = mongoose.model("KenoProMax_cuoc", Schema);
