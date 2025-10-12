import { Platform } from "react-native";

// Resolve H3 implementation per platform
// - native: use h3-reactnative
// - web: use h3-js
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let h3: any;
try {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    h3 = require('h3-js');
  } else {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const rn = require('h3-reactnative');
    h3 = rn?.default ?? rn;
  }
} catch {}

const H3_RESOLUTION = 7;

const getH3Index = (latitude: number, longitude: number) => {
    return h3?.geoToH3 ? h3.geoToH3(latitude, longitude, H3_RESOLUTION) : undefined;
};

const getH3IndexFromCell = (cell: string) => {
    return h3?.h3ToGeo ? h3.h3ToGeo(cell) : undefined;
};

const getH3Neighbors = (h3Index: string, step: number = 1) => {
    return h3?.kRing ? h3.kRing(h3Index, step) : [];
};

export { getH3Index, getH3IndexFromCell, getH3Neighbors };