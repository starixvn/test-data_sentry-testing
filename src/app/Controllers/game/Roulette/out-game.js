const matchRealPlayer = (rouletteData, realPlayer, cleanPreviousInGame) =>
  cleanPreviousInGame
    ? rouletteData && (rouletteData.realPlayers[realPlayer.UID] || rouletteData.players[realPlayer.UID])
    : rouletteData.realPlayers[realPlayer.UID] === realPlayer;

module.exports = (realPlayer, cleanPreviousInGame) => {
  const rouletteData = realPlayer.redT.roulette;

  if (matchRealPlayer(rouletteData, realPlayer, cleanPreviousInGame)) {
    delete rouletteData.realPlayers[realPlayer.UID];
    delete rouletteData.players[realPlayer.UID];

    Object.values(rouletteData.realPlayers).forEach((joinedPlayer) => {
      if (realPlayer !== joinedPlayer) {
        joinedPlayer.red({ roulette: { outgame: { playerId: realPlayer.UID } } });
      }
    });
  }
};
