const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-auto-increment-reworked").MongooseAutoIncrementID;

const RoundSchema = require("./../Schemas/Keno_phien").clone();
const BetSchema = require("./../Schemas/Keno_one");
const BetLogSchema = require("./../Schemas/Keno_cuoc");

RoundSchema.plugin(AutoIncrement.plugin, { modelName: "KenoSouth_phien", field: "id" });

const KenoSouth_phien = mongoose.model("KenoSouth_phien", RoundSchema);
const KenoSouth_one = mongoose.model("KenoSouth_one", BetSchema);
const KenoSouth_cuoc = mongoose.model("KenoSouth_cuoc", BetLogSchema);

module.exports = {
  KenoSouth_phien,
  KenoSouth_one,
  KenoSouth_cuoc,
};
