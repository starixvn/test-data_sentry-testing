const BetChoiceMapper = require("./../../../../apis/betChoiceMapper");
const GameIds = require("./../../../../../config/appConfigs").gameIds;
const ConfigHelper = require("./../../../../Helpers/ConfigHelper");

const Constants = require("./../constants");
const generateResult = require("./../shuffleNumbers");
const SettlementRules = require("./../settlementRules");

const { KenoMini2_phien, KenoMini2_one, KenoMini2_cuoc } = require("./models");

module.exports = {
  id: GameIds.kenomini2,
  name: "kenoMini2",
  configName: ConfigHelper.GameTypes.KenoMini2,
  viewName: "viewKenoMini2",
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
  roundRepository: KenoMini2_phien,
  betRepository: KenoMini2_one,
  betLogRepository: KenoMini2_cuoc,
};
