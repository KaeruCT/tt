const r = () => Math.random(); // TODO: use seed?

export const randBool = function (prob = 0.5) {
    return r() < prob;
};

export const randRange = function () {
    const args = Array.prototype.slice.call(arguments);
    const max = Math.max.apply(null, args);
    const min = Math.min.apply(null, args);
    if (min === max) return min;
    return Math.floor(r() * (max - min + 1)) + min;
};

export const randValue = function (vals) {
    return vals[randRange(0, vals.length - 1)];
}