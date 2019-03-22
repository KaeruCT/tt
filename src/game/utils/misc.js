export const TILE_DIMENSION = 16;

export const snap = n => Math.floor(n/TILE_DIMENSION);

export const generateUUID = () => {
    var d = Date.now();
    if (typeof performance !== 'undefined' && typeof performance.now === 'function'){
        d += performance.now(); //use high-precision timer if available
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

export const SKIN_COLORS = [
    0x8d5524,
    0xc68624,
    0xe0ac69,
    0xf1c27d,
    0xffdbac,
];

export const HAIR_COLORS = [
    0x333333,
    0x362023,
    0x700548,
    0x5b0505,
    0x562619,
    0xffc187,
    0xffaa5b,
    0xffd17c,
    0x0bb74a,
    0xafa093,
];

export const CLOTHES_COLORS = [
    0xb3954,
    0x087e8b,
    0xc81d25,
    0x25a18e,
    0x004e64,
    0x3c3c3b,
    0xf5d547,
    0x573280,
    0x248232,
];
