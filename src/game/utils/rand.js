const r = () => Math.random(); // TODO: use seed?

export const randBool = (prob = 0.5) => r() < prob;

export const randRange = (...args) => {
  const max = Math.max.apply(null, args);
  const min = Math.min.apply(null, args);
  if (min === max) return min;
  return Math.floor(r() * (max - min + 1)) + min;
};

export const randValue = (vals) => vals[randRange(0, vals.length - 1)];
