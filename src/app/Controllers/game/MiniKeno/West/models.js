const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-auto-increment-reworked").MongooseAutoIncrementID;

const RoundSchema = require("./../Schemas/Keno_phien").clone();
const BetSchema = require("./../Schemas/Keno_one");
const BetLogSchema = require("./../Schemas/Keno_cuoc");

RoundSchema.plugin(AutoIncrement.plugin, { modelName: "KenoWest_phien", field: "id" });

const KenoWest_phien = mongoose.model("KenoWest_phien", RoundSchema);
const KenoWest_one = mongoose.model("KenoWest_one", BetSchema);
const KenoWest_cuoc = mongoose.model("KenoWest_cuoc", BetLogSchema);

module.exports = {
  KenoWest_phien,
  KenoWest_one,
  KenoWest_cuoc,
};
