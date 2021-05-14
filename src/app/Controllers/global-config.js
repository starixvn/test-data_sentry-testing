const GlobalConfig = require("../Models/GlobalConfig");

const getOfferedGames = async (siteName) => {
  if (!siteName) {
    return [];
  }

  const siteExclusionsConfig = await GlobalConfig.findOne({ type: "game_site_exclusions" }).lean();
  const settings = siteExclusionsConfig?.configs;

  const lowerCaseSiteName = siteName.toLowerCase();

  return settings
    ? Object.keys(settings)
        .filter((gameId) => !settings[gameId]?.some(x => x.toLowerCase() === lowerCaseSiteName))
        .map((gameId) => parseInt(gameId))
    : [];
};

const getSiteExclusions = async (gameId) => {
  const siteExclusionsConfig = await GlobalConfig.findOne({ type: "game_site_exclusions" }).lean();

  return siteExclusionsConfig?.configs && siteExclusionsConfig.configs[gameId] ? siteExclusionsConfig.configs[gameId] : [];
};

module.exports = {
  getOfferedGames: getOfferedGames,
  getSiteExclusions: getSiteExclusions,
};
