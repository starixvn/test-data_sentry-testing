const logger = require("../app/web/logger");
const { lowercaseFirstCharacter, errors, useAuthenticate } = require("./util");
const settleRound = require("../app/Controllers/game/MiniKeno/ProViet/settle-round");

const validateParams = (req, res, next) => {
  const params = req.body;
  if (
    !params.result ||
    !params.number ||
    !params.time ||
    params.big === null ||
    params.small === null ||
    params.odd === null ||
    params.even === null ||
    params.gold === null ||
    params.wood === null ||
    params.water === null ||
    params.fire === null ||
    params.earth === null
  ) {
    logger.logCritical(`The round information is invalid, details: ${JSON.stringify(params)}`);
  }else{
    next();
  }
};

const handleRequest = (params, res, redT) => {
  if (params) {
    const roundResult = {
      roundId: params.number,
      result: params.result,
      settlementResult: {
        big: params.big,
        small: params.small,
        odd: params.odd,
        even: params.even,
        gold: params.gold,
        earth: params.earth,
        water: params.water,
        wood: params.wood,
        fire: params.fire,
      },
      time: params.time,
    };

    settleRound(redT, roundResult);
  }

  res.send({
    received: true,
  });
};

module.exports = function (app, redT) {
  app.post(
    "/api/proviet-keno/round-result",
    useAuthenticate({
      logger: {
        error: logger.logError,
        warn: logger.logWarning,
      },
    }),
    lowercaseFirstCharacter,
    validateParams,
    (req, res) => handleRequest(req.body, res, redT)
  );
};
