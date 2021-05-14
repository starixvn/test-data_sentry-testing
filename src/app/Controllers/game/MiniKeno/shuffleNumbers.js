const Chance = require("chance");
const { Random, MersenneTwister19937 } = require("random-js");

const chance = new Chance();
const random = new Random(MersenneTwister19937.autoSeed());
const generateSeeds = (numberOfSeeds) => [...Array(numberOfSeeds + 1).keys()].slice(1);

const shuffleThenPickByChance = (numberOfPicked, numberOfSeeds) => {
  return chance.pickset(generateSeeds(numberOfSeeds), numberOfPicked);
};

const randomUniqueNumbersByChance = (numberOfPicked, numberOfSeeds) =>
  chance.unique(chance.natural, numberOfPicked, { min: 1, max: numberOfSeeds });

const shuffleThenPickByRandomJs = (numberOfPicked, numberOfSeeds) => {
  return random.shuffle(generateSeeds(numberOfSeeds)).slice(0, numberOfPicked);
};

const randomlyPickNumbersByRandomJs = (numberOfPicked, numberOfSeeds) => {
  return random.sample(generateSeeds(numberOfSeeds), numberOfPicked);
};

const algorithms = [shuffleThenPickByChance, randomUniqueNumbersByChance, shuffleThenPickByRandomJs, randomlyPickNumbersByRandomJs];

module.exports = (numberOfPicked, numberOfSeeds) => {
  const randomSelection = chance.natural({ min: 0, max: algorithms.length - 1 });
  let result = algorithms[randomSelection](numberOfPicked, numberOfSeeds);

  result.sort((pre, next) => pre - next);

  return result;
};
