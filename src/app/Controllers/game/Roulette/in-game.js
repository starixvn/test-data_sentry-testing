const BalanceApi = require("./../../../apis/balanceApi");
const ConfigHelper = require("./../../../Helpers/ConfigHelper");
const UserInfo = require("./../../../Models/UserInfo");
const Logger = require("./../../../web/logger");

const RoulettePhien = require("./Models/Roulette_phien");

const inGame = async (realPlayer, rouletteData) => {
  const { remainingTime, totalBets, chips } = rouletteData;
  const rouletteConfigs = ConfigHelper.getConfigs(ConfigHelper.GameTypes.Roulette);
  const maxNumberOfRounds = 10;
  const gameConfigs = {
    minbet: rouletteConfigs.minbet,
    maxbet: rouletteConfigs.maxbet,
    choices_maxbet: rouletteConfigs.choices_maxbet,
    odds: rouletteConfigs.odds,
  };

  const getRounds = (limit) =>
    RoulettePhien.find({}, "-_id id result", { sort: { id: -1 }, limit })
      .lean()
      .exec();
  const getUserInfo = (uid) => UserInfo.findOne({ id: uid }, "-_id red avatarId").lean().exec();

  const [rawRoundHistory, user] = await Promise.all([getRounds(maxNumberOfRounds), getUserInfo(realPlayer.UID)]);
  const roundHistory = rawRoundHistory.map((round) => ({
    roundId: round.id,
    result: round.result,
  }));
  const players = { ...rouletteData.players };
  const player = {
    id: realPlayer.UID,
    name: realPlayer.profile.name,
    ...user,
  };
  const { betTracks: ownBets } = rouletteData.ingame[realPlayer.profile.name] ?? { betTracks: {} };

  delete players[player.id];

  BalanceApi.getBalance({ id: realPlayer.UID }, realPlayer, (balance) => (player.red = balance.red || 0), true);

  if (!rouletteData.realPlayers[player.id]) {
    return;
  }

  if (!rouletteData.players[player.id]) {
    rouletteData.players[player.id] = player;
  }

  const ingameData = {
    roundHistory,
    players,
    ownBets,
    remainingTime,
    totalBets,
    chips,
    gameConfigs,
  };

  realPlayer.red({ roulette: ingameData });

  Object.values(rouletteData.realPlayers).forEach((joinedPlayer) => {
    if (realPlayer !== joinedPlayer) {
      joinedPlayer.red({ roulette: { player } });
    }
  });
};

module.exports = (realPlayer) => {
  const rouletteData = realPlayer.redT.roulette;

  if (rouletteData.realPlayers[realPlayer.UID] === realPlayer) {
    inGame(realPlayer, rouletteData).catch(Logger.logError);
  } else {
    realPlayer.red({ toGame: "MainGame" });
  }
};
