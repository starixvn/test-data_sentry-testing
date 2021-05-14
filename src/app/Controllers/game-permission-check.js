module.exports = {
  checkGamePermission: function (client, gameConfigs, gameId) {
    if (gameConfigs.siteExclusions?.some((x) => x.toLowerCase() === client.session.siteName.toLowerCase())) {
      client.red({
        notPermittedToPlay: true,
        gameId
      });
      
      return false;
    }

    return true;
  },
};
