const BetChoiceMapper = require("./../../../../apis/betChoiceMapper");
const GameIds = require("./../../../../../config/appConfigs").gameIds;
const ConfigHelper = require("./../../../../Helpers/ConfigHelper");

const Constants = require("./../constants");
const generateResult = require("./../shuffleNumbers");
const SettlementRules = require("./../settlementRules");

const { KenoEast_phien, KenoEast_one, KenoEast_cuoc } = require("./models");

module.exports = {
  id: GameIds.kenoeast,
  name: "kenoEast",
  configName: ConfigHelper.GameTypes.KenoEast,
  viewName: "viewKenoEast",
  durations: {
    wholeRound: 39,
    placingBets: 30,
    lockingBet: 5,
  },
  additionalValidationCriteria: [],
  choices: Constants.choices,
  choiceMapper: BetChoiceMapper.convertKeno,
  defaultBetTracks: () => ({ ...Constants.defaultBetTracks }),
  defaultTotalBets: () => ({ ...Constants.defaultBetTracks }),
  generateResult: () => generateResult(20, 80),
  settle: SettlementRules.full,
  roundRepository: KenoEast_phien,
  betRepository: KenoEast_one,
  betLogRepository: KenoEast_cuoc,
};
