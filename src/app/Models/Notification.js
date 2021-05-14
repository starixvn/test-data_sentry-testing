
let mongoose = require('mongoose');

let Schema = new mongoose.Schema({	
	message:   {type: String,  required: true},
	displayKind:   {type: Number,  required: true}, 
});

module.exports = mongoose.model('notifications', Schema);