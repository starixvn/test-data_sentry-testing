// server.js
const cluster = require("cluster");
const logger = require("./app/web/logger");

logger.logError("Test Error");

if (cluster.isMaster) {
  logger.start();
  cluster.fork();

  cluster.on("online", function (worker) {
    const message = "Worker " + worker.process.pid + ` is online at ${new Date()}`;
    console.log(message);
    logger.log(message);
  });

  cluster.on("exit", function (worker, code, signal) {
    const message = "Worker " + worker.process.pid + " died with code: " + code + ", and signal: " + signal;
    console.log(message);
    console.log("Starting a new worker");
    logger.log(message, "error");
    cluster.fork();
    logger.log(`Started a new worker done at ${new Date()}`);
  });
} else {
  logger.start();
  require("dotenv").config();

  const express = require("express");
  const appConfig = require("./config/appConfigs");
  const app = express();
  const port = appConfig.port;
  const expressWs = require("express-ws")(app);
  const bodyParser = require("body-parser");
  const morgan = require("morgan");
  const useragent = require("express-useragent");
  app.use(useragent.express());

  const expressip = require("express-ip");
  app.use(expressip().getIpInfoMiddleware);

  // kết nối tới database
  require("./app/web/mongodb_connection")();

  // cấu hình tài khoản admin mặc định và các dữ liệu mặc định
  require("./config/admin");

  // đọc dữ liệu from
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(morgan("combined"));

  app.set("view engine", "ejs"); // chỉ định view engine là ejs
  app.set("views", "./views"); // chỉ định thư mục view

  // Serve static html, js, css, and image files from the 'public' directory
  app.use(express.static("public"));

  // server socket
  let redT = expressWs.getWss();

  redT.on("connection", (ws, request, client) => {
    ws.on("error", (error) => {
      logger.logError(error);

      const { ipInfo } = request ?? { ipInfo: {} };
      logger.log(`Got socket error from request ip: ${ipInfo.ip}`);
    });
  });

  redT.on("error", (error) => {
    logger.logError(error);
  });

  require("./app/web/cors")(redT);
  require("./app/Helpers/socketUser")(redT); // Add function socket
  require("./app/Controllers/UnderMaintenance").assignRedT(redT);
  require("./routerHttp")(app, redT); // load các routes HTTP
  require("./routerSocket")(app, redT); // load các routes WebSocket
  require("./app/Helpers/ConfigHelper").loadAllConfigs(); // load all game configs

  require("./app/Cron/marquee")(redT);

  require("./app/Controllers/game/MiniKeno/Max/init")(redT);
  require("./app/Controllers/game/MiniKeno/Max2/init")(redT);
  require("./app/Controllers/game/MiniKeno/Mini/init")(redT);
  require("./app/Controllers/game/MiniKeno/Mini2/init")(redT);
  require("./app/Controllers/game/MiniKeno/East/init")(redT);
  require("./app/Controllers/game/MiniKeno/West/init")(redT);
  require("./app/Controllers/game/MiniKeno/South/init")(redT);
  require("./app/Controllers/game/MiniKeno/North/init")(redT);

  require("./app/Controllers/game/MiniKeno/Max/process-bet-queue")(redT);
  require("./app/Controllers/game/MiniKeno/Max2/process-bet-queue")(redT);
  require("./app/Controllers/game/MiniKeno/Mini/process-bet-queue")(redT);
  require("./app/Controllers/game/MiniKeno/Mini2/process-bet-queue")(redT);
  require("./app/Controllers/game/MiniKeno/East/process-bet-queue")(redT);
  require("./app/Controllers/game/MiniKeno/West/process-bet-queue")(redT);
  require("./app/Controllers/game/MiniKeno/South/process-bet-queue")(redT);
  require("./app/Controllers/game/MiniKeno/North/process-bet-queue")(redT);
  require("./botUsers").resetInRoom();

  const server = app.listen(port, function () {
    console.log("Server listen on port ", port);
  });

  require("./app/web/authentication")(app);

  const exitHandler = require("./app/web/process-error-handler")(server, { coredump: true, timeout: 500 });
  process.on("uncaughtException", exitHandler(1, "Unexpected Error"));
  process.on("unhandledRejection", exitHandler(1, "Unhandled Promise"));
  process.on("SIGTERM", exitHandler(0, "SIGTERM"));
  process.on("SIGINT", exitHandler(0, "SIGINT"));
}
