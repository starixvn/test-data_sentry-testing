const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-auto-increment-reworked").MongooseAutoIncrementID;

const RoundSchema = require("./../Schemas/Keno_phien").clone();
const BetSchema = require("./../Schemas/Keno_one");
const BetLogSchema = require("./../Schemas/Keno_cuoc");

RoundSchema.plugin(AutoIncrement.plugin, { modelName: "KenoEast_phien", field: "id" });

const KenoEast_phien = mongoose.model("KenoEast_phien", RoundSchema);
const KenoEast_one = mongoose.model("KenoEast_one", BetSchema);
const KenoEast_cuoc = mongoose.model("KenoEast_cuoc", BetLogSchema);

module.exports = {
  KenoEast_phien,
  KenoEast_one,
  KenoEast_cuoc,
};
