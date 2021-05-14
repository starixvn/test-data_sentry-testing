const { defaultBetTracks } = require("../constants");

module.exports = (player, roundId) => {
  const kenoProVietData = player.redT.kenoProViet;

  const betTracks =
    kenoProVietData.ingame[roundId] && kenoProVietData.ingame[roundId][player.profile.name]
      ? kenoProVietData.ingame[roundId][player.profile.name].betTracks
      : defaultBetTracks;

  player.red({
    kenoProViet: {
      ownBets: betTracks,
    },
  });
};
