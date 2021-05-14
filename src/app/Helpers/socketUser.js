//let Poker = require('./poker/init');

module.exports = function (io) {
  io.users = []; // danh sách người dùng đăng nhập
  io.admins = []; // danh sách admin đăng nhập
  /*
	io.game   = {
		poker: new Poker(), // thiết lập game poker
	};
	*/

  io.game = {};

  // Phát sóng tới tất cả người dùng và khách
  io.broadcast = function (data, noBroadcast = null) {
    this.clients.forEach(function (client) {
      if (void 0 === client.admin && noBroadcast !== client) {
        client.red(data);
      }
    });
  };
  // Phát sóng tới tất cả  khách
  io.sendAllClient = function (data) {
    this.clients.forEach(function (client) {
      if (void 0 === client.admin && client.auth === false) {
        client.red(data);
      }
    });
  };
  // Phát sóng tới tất cả người dùng
  io.sendAllUser = function (data, noBroadcast = null) {
    this.clients.forEach(function (client) {
      if (void 0 === client.admin && client.auth === true && noBroadcast !== client) {
        client.red(data);
      }
    });
  };
  // Phát sóng tới tất cả người dùng
  io.sendAllAdmin = function (data, viewGameName) {
    this.clients.forEach(function (client) {
      if (client.admin === true && client.auth === true && client.gameEvent && client.gameEvent[viewGameName]) {
        client.red(data);
      }
    });
  };
  // Phát sóng tới tất cả khách
  io.sendInHome = function (data) {
    io.clients.forEach(function (client) {
      if (void 0 === client.admin && (client.auth === false || client.scene === "home")) {
        client.red(data);
      }
    });
  };

  io.sendAllUserExcept = function (data, siteExclusions = []) {
    this.clients.forEach(function (client) {
      const isGameOffered = siteExclusions.find((site) => site === client.session.siteName) === undefined;

      if (void 0 === client.admin && client.auth === true && isGameOffered) {
        client.red(data);
      }
    });
  };
};
