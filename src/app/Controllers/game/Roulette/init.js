const RoulettePhien = require("./Models/Roulette_phien");

const Constants = require("./constants");

const generateChoices = require("./generate-choices").normalBets;
const runGame = require("./run-game");

const avaliableChoices = [...Array(Constants.numberWheel.max + 1).keys()].map((number) => generateChoices(number));

const groupAvailableChoicesByTypes = () => {
  const draftlyGroupedResult = avaliableChoices.reduce((groupByTypes, choicesPerNumber) => {
    Object.entries(choicesPerNumber).forEach(([type, choices]) => {
      groupByTypes[type] = (groupByTypes[type] ?? []).concat(choices);
    });

    return groupByTypes;
  }, {});

  const finale = Object.entries(draftlyGroupedResult).reduce((sortedResult, [type, choices]) => {
    sortedResult[type] = Array.from(new Set(choices)).sort();

    return sortedResult;
  }, {});

  return finale;
};

module.exports = (io) => {
  io.roulette = {
    roundId: 1,
    remainingTime: Constants.roundDuration,
    delayStartTime: 0,
    ingame: {},
    totalBets: {},
    realPlayers: {},
    winningPlayers: {},
    players: {},
    disabled: true,
    settlementResultFromAdmin: {
      roundId: 0,
      result: 0,
    },
    avaliableChoices: {
      groupedByNumbers: avaliableChoices,
      groupedByTypes: groupAvailableChoicesByTypes(),
    },
  };

  RoulettePhien.findOne({}, "id", { sort: { _id: -1 } })
    .lean()
    .then((lastRound) => {
      if (lastRound) {
        io.roulette.roundId = lastRound.id + 1;
      }
    });

  runGame(io);
};
