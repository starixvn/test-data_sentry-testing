const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-auto-increment-reworked").MongooseAutoIncrementID;

const RoundSchema = require("./../Schemas/Keno_phien").clone();
const BetSchema = require("./../Schemas/Keno_one");
const BetLogSchema = require("./../Schemas/Keno_cuoc");

RoundSchema.plugin(AutoIncrement.plugin, { modelName: "KenoMax2_phien", field: "id" });

const KenoMax2_phien = mongoose.model("KenoMax2_phien", RoundSchema);
const KenoMax2_one = mongoose.model("KenoMax2_one", BetSchema);
const KenoMax2_cuoc = mongoose.model("KenoMax2_cuoc", BetLogSchema);

module.exports = {
  KenoMax2_phien,
  KenoMax2_one,
  KenoMax2_cuoc,
};
