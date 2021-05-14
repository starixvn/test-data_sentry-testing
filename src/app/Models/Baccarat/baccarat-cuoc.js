const mongoose = require("mongoose");

const Schema = new mongoose.Schema({
  uid: { type: String, required: true }, // ID Người cược
  name: { type: String, required: true }, // Name Người cược
  phien: { type: Number, required: true, index: true }, // phiên cược
  player: { type: Number, default: 0 },
  banker: { type: Number, default: 0 },
  big: { type: Number, default: 0 }, // Tài
  small: { type: Number, default: 0 }, // Xỉu
  tie: { type: Number, default: 0 },
  playerPair: { type: Number, default: 0 },
  bankerPair: { type: Number, default: 0 },
  thanhtoan: { type: Boolean, default: false }, // tình trạng thanh toán
  betwin: { type: Number, default: 0 }, // Tiền thắng được
  time: { type: Date, default: new Date() }, // thời gian cược,
  memberId: { type: Number },
  siteId: { type: String }
});

module.exports = mongoose.model("baccarat_cuoc", Schema);
