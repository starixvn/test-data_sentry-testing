let mongoose = require("mongoose");

let Schema = new mongoose.Schema({
  uid: { type: String, required: true, index: true }, // ID Người cược
  phien: { type: Number, required: true, index: true }, // phiên cược
  bet: { type: Number, required: true, default: 0 }, // số tiền cược
  red: { type: Boolean, required: true }, // loại tiền (Red        = true, Xu       = false)
  select: { type: Boolean, required: true }, // bên cược  (Tài = Chẵn = true, Xỉu = Lẻ = false)
  tralai: { type: Number, default: 0 }, // Số tiền trả lại
  thuong: { type: Number, default: 0 }, // Thưởng Red khi chơi bằng xu
  win: { type: Boolean, default: false }, // Thắng hoặc thua
  betwin: { type: Number, default: 0 }, // Tiền thắng được
  memberId: { type: Number },
  siteId: { type: String },
  time: { type: Date },
  thanhtoan: { type: Boolean, default: false }    // tình trạng thanh toán
});

Schema.index({ uid: 1, phien: 1, red: 1 }, { background: true });

module.exports = mongoose.model("ChanLe_one", Schema);
