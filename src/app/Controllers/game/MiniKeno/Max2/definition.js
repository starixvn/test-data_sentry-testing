const BetChoiceMapper = require("./../../../../apis/betChoiceMapper");
const GameIds = require("./../../../../../config/appConfigs").gameIds;
const ConfigHelper = require("./../../../../Helpers/ConfigHelper");

const Constants = require("./../constants");
const generateResult = require("./../shuffleNumbers");
const SettlementRules = require("./../settlementRules");

const { KenoMax2_phien, KenoMax2_one, KenoMax2_cuoc } = require("./models");

module.exports = {
  id: GameIds.kenomax2,
  name: "kenoMax2",
  configName: ConfigHelper.GameTypes.KenoMax2,
  viewName: "viewKenoMax2",
  durations: {
    wholeRound: 59,
    placingBets: 50,
    lockingBet: 5,
  },
  additionalValidationCriteria: [],
  choices: Constants.choices,
  choiceMapper: BetChoiceMapper.convertKeno,
  defaultBetTracks: () => ({ ...Constants.defaultBetTracks }),
  defaultTotalBets: () => ({ ...Constants.defaultBetTracks }),
  generateResult: () => generateResult(20, 80),
  settle: SettlementRules.full,
  roundRepository: KenoMax2_phien,
  betRepository: KenoMax2_one,
  betLogRepository: KenoMax2_cuoc,
};
