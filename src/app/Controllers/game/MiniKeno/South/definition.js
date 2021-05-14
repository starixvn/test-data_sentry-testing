const BetChoiceMapper = require("./../../../../apis/betChoiceMapper");
const GameIds = require("./../../../../../config/appConfigs").gameIds;
const ConfigHelper = require("./../../../../Helpers/ConfigHelper");

const Constants = require("./../constants");
const generateResult = require("./../shuffleNumbers");
const SettlementRules = require("./../settlementRules");

const { KenoSouth_phien, KenoSouth_one, KenoSouth_cuoc } = require("./models");

module.exports = {
  id: GameIds.kenosouth,
  name: "kenoSouth",
  configName: ConfigHelper.GameTypes.KenoSouth,
  viewName: "viewKenoSouth",
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
  roundRepository: KenoSouth_phien,
  betRepository: KenoSouth_one,
  betLogRepository: KenoSouth_cuoc,
};
