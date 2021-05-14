const ConfigHelper = require("../../../Helpers/ConfigHelper");
const { constants, boxes } = require("../../../Cron/baccarat/constant");
const NoticeMessage = require("../constants/notice-messages");

module.exports = (client, data) => {
  const baccarat = client.redT.game.baccarat;
  const configs = ConfigHelper.getConfigs(ConfigHelper.GameTypes.Baccarat);
  const maxBetPerChoice = configs.choices_maxbet;

  const validateBetRequest = (client, { bet, box }) => {
    if (!!bet && !!box) {
      const betsOfThisUser = Object.assign({}, baccarat.ingame[client.profile.name] || {});

      if (betsOfThisUser[box]) {
        betsOfThisUser[box] += bet;
      } else {
        betsOfThisUser[box] = bet;
      }

      const totalBets = boxes.reduce((total, box) => total + betsOfThisUser[box], 0);

      const metadata = [
        {
          condition: baccarat.remainingTime <= constants.lockBet || baccarat.remainingTime >= constants.betTime,
          notice: NoticeMessage.placeBetNextRound,
        },
        {
          condition: bet < configs.minbet,
          notice: NoticeMessage.minBet(configs.minbet),
        },
        {
          condition: betsOfThisUser[box] > maxBetPerChoice[box],
          notice: NoticeMessage.maxBetForChoice(maxBetPerChoice[box]),
        },
        {
          condition: totalBets > configs.maxbet,
          notice: NoticeMessage.maxBet(configs.maxbet),
        },
      ];

      const result = metadata.filter((data) => data.condition);

      if (result.length !== 0) {
        client.red({ baccarat: { notice: result[0].notice, endBet: -1 } });

        return false;
      }

      return true;
    }

    return false;
  };

  if (validateBetRequest(client, data)) {
    if (baccarat.ingame[client.profile.name]) {
      baccarat.ingame[client.profile.name][data.box] += data.bet;
      baccarat.ingame[client.profile.name].betQueue.push({ data: data, client: client });
    } else {
      const bets = boxes.reduce((result, box) => {
        if (box === data.box) {
          result[box] = data.bet;
        } else {
          result[box] = 0;
        }

        return result;
      }, {});

      baccarat.ingame[client.profile.name] = {
        name: client.profile.name,
        betQueue: [{ data: data, client: client }],
        ...bets,
      };
    }
  }
};
