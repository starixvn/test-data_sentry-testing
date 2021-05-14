const logger = require("./logger");
const v8 = require("v8");

const terminate = (server, options = { coredump: false, timeout: 500 }) => {
  // Exit function
  const exit = (code) => {
    options.coredump ? process.abort() : process.exit(code);
  };

  return (code, reason) => (err, promise) => {
    if (err && err instanceof Error) {
      // Log error information, use a proper logging library here :)
      logger.logCritical(err);

      const heapStats = v8.getHeapCodeStatistics();
      logger.logError(heapStats);
      console.log(heapStats);

      let messageLog = `${new Date()} Exception `;

      if (err.message) {
        messageLog += err.message;
      }

      if (err.stack) {
        messageLog += "stack: " + err.stack;
      }

      console.log(messageLog);
    }

    // Attempt a graceful shutdown
    server.close(exit);
    setTimeout(exit, options.timeout).unref();
  };
};

module.exports = terminate;
