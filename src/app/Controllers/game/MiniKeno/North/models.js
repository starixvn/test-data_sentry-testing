const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-auto-increment-reworked").MongooseAutoIncrementID;

const RoundSchema = require("./../Schemas/Keno_phien").clone();
const BetSchema = require("./../Schemas/Keno_one");
const BetLogSchema = require("./../Schemas/Keno_cuoc");

RoundSchema.plugin(AutoIncrement.plugin, { modelName: "KenoNorth_phien", field: "id" });

const KenoNorth_phien = mongoose.model("KenoNorth_phien", RoundSchema);
const KenoNorth_one = mongoose.model("KenoNorth_one", BetSchema);
const KenoNorth_cuoc = mongoose.model("KenoNorth_cuoc", BetLogSchema);

module.exports = {
  KenoNorth_phien,
  KenoNorth_one,
  KenoNorth_cuoc,
};
