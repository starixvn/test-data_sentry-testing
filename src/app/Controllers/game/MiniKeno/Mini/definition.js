const BetChoiceMapper = require("./../../../../apis/betChoiceMapper");
const GameIds = require("./../../../../../config/appConfigs").gameIds;
const ConfigHelper = require("./../../../../Helpers/ConfigHelper");

const Constants = require("./../constants");
const generateResult = require("./../shuffleNumbers");
const SettlementRules = require("./../settlementRules");

const { KenoMini_phien, KenoMini_one, KenoMini_cuoc } = require("./models");

module.exports = {
  id: GameIds.kenomini,
  name: "kenoMini",
  configName: ConfigHelper.GameTypes.KenoMini,
  viewName: "viewKenoMini",
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
  generateResult: () => generateResult(10, 40),
  settle: SettlementRules.mini,
  roundRepository: KenoMini_phien,
  betRepository: KenoMini_one,
  betLogRepository: KenoMini_cuoc,
};
