let users = require('./socketUsers');
let admin = require('./socketAdmin');

// Router Websocket
module.exports = function (app, redT) {
	app.ws('/websocket', function (ws, req) {
		//config.rateLimit.enabled && rateLimit(ws);
		users(ws, redT, req);
	});
	app.ws('/admin', function (ws, req) {
		admin(ws, redT)
	});
};
