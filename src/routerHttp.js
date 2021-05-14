// Router HTTP / HTTPS
let mobile = require("is-mobile");

module.exports = function (app, redT) {
  // Home
  app.get("/", function (req, res) {
    res.send("Site is running");
    // // if (mobile({ua:req})){
    // // 	return res.redirect('/mobile/');
    // // } else {
    // // 	return res.redirect('/web/');
    // // }
  });
  // // app.get('/web/', function(req, res) {
  // // 	if (mobile({ua:req})){
  // // 		return res.redirect('/mobile/');
  // // 	} else {
  // // 		return res.render('index');
  // // 	}
  // // });
  // // app.get('/mobile/', function(req, res) {
  // // 	if (mobile({ua:req})){
  // // 		return res.render('index_mobile');
  // // 	} else {
  // // 		return res.redirect('/web/');
  // // 	}
  // // });

  // // // Admin
  // // app.get('/zad199/', function(req, res) {
  // // 	return res.render('admin');
  // // });

  // // // Fanpage
  // // app.get('/fanpage/', function(req, res) {
  // // 	return require('./routes/fanpage/redirect')(res);
  // // });

  // // // Help IOS
  // // app.get('/help/ios/', function(req, res) {
  // // 	return res.render('help/ios');
  // // });

  // // // Sign API
  // // require('./routes/api')(app, redT);  // load routes API

  require("./routes/common")(app, redT);
  require("./routes/games")(app, redT);

  require("./routes/baccarat-test")(app);

  require("./routes/jwt")(app, redT);
  require("./routes/proviet-keno-round-result")(app, redT);
};
