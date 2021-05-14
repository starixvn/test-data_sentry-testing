
let AutoIncrement = require('mongoose-auto-increment-reworked').MongooseAutoIncrementID;
let mongoose = require('mongoose');

let Schema = new mongoose.Schema({
	dragon: { type: Object },
	tiger: { type: Object },
	time: { type: Date, default: new Date() },
});

Schema.plugin(AutoIncrement.plugin, { modelName: 'MiniDragonTiger_phien', field: 'id' });

module.exports = mongoose.model('MiniDragonTiger_phien', Schema);
