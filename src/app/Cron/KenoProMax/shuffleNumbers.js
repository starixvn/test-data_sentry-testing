const Chance = require("chance");
const { Random, MersenneTwister19937 } = require("random-js");

const chance = new Chance();
const random = new Random(MersenneTwister19937.autoSeed());
const seeds = [...Array(81).keys()].slice(1);

const shuffleThenPickOut20ByChance = () => {
  return chance.pickset(seeds, 20);
};

const random20UniqueNumbersByChance = () => {
  return chance.unique(chance.natural, 20, { min: 1, max: 80 });
};

const shuffleThenPickOut20ByRandomJs = () => {
  return random.shuffle([...seeds]).slice(0, 20);
};

const randomlyPick20NumbersByRandomJs = () => {
  return random.sample(seeds, 20);
};

const algorithms = [
  shuffleThenPickOut20ByChance,
  random20UniqueNumbersByChance,
  shuffleThenPickOut20ByRandomJs,
  randomlyPick20NumbersByRandomJs,
];

module.exports = () => {
  const randomSelection = chance.natural({
    min: 0,
    max: algorithms.length - 1,
  });
  let result = algorithms[randomSelection]();

  result.sort((pre, next) => pre - next);

  return result;
};
