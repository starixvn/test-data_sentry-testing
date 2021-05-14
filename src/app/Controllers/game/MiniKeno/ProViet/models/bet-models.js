const mongoose = require("mongoose");

const BetSchema = require("../../Schemas/Keno_one");
const BetLogSchema = require("../../Schemas/Keno_cuoc");

const KenoProViet_one = mongoose.model("KenoProViet_one", BetSchema);
const KenoProViet_cuoc = mongoose.model("KenoProViet_cuoc", BetLogSchema);

module.exports = {
  KenoProViet_one,
  KenoProViet_cuoc,
};
