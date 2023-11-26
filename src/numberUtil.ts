export const toU16 = function(
    b1: number,
    b2: number
): number{
    return (b1<<8) | b2;
};

export const toU32 = function(
    b1: number,
    b2: number,
    b3: number,
    b4: number
): number{
    return (b1<<24) | (b2<<16) | (b3<<8) | b4;
};

const u32s = new Uint32Array(2);
const doubles = new Float64Array(u32s.buffer);
const u64s = new BigUint64Array(u32s.buffer);

export const toDouble = function(
    b1: number,
    b2: number,
    b3: number,
    b4: number,
    b5: number,
    b6: number,
    b7: number,
    b8: number,
): number{
    u32s[1] = toU32(b1,b2,b3,b4);
    u32s[0] = toU32(b5,b6,b7,b8);
    return doubles[0];
}

export const toU64 = function(
    b1: number,
    b2: number,
    b3: number,
    b4: number,
    b5: number,
    b6: number,
    b7: number,
    b8: number
): number{
    u32s[1] = toU32(b1,b2,b3,b4);
    u32s[0] = toU32(b5,b6,b7,b8);
    return Number(u64s[0]);
};
