const BetChoiceMapper = require("./../../../../apis/betChoiceMapper");
const GameIds = require("./../../../../../config/appConfigs").gameIds;
const ConfigHelper = require("./../../../../Helpers/ConfigHelper");

const Constants = require("./../constants");
const generateResult = require("./../shuffleNumbers");
const SettlementRules = require("./../settlementRules");

const { KenoNorth_phien, KenoNorth_one, KenoNorth_cuoc } = require("./models");

module.exports = {
  id: GameIds.kenonorth,
  name: "kenoNorth",
  configName: ConfigHelper.GameTypes.KenoNorth,
  viewName: "viewKenoNorth",
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
  roundRepository: KenoNorth_phien,
  betRepository: KenoNorth_one,
  betLogRepository: KenoNorth_cuoc,
};
