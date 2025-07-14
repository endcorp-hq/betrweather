import h3 from "h3-reactnative";

const H3_RESOLUTION = 7;

const getH3Index = (latitude: number, longitude: number) => {
    return h3.geoToH3(latitude, longitude, H3_RESOLUTION);
};

const getH3IndexFromCell = (cell: string) => {
    return h3.h3ToGeo(cell);
};

const getH3Neighbors = (h3Index: string, step: number = 1) => {
    return h3.kRing(h3Index, step);
};

export { getH3Index, getH3IndexFromCell, getH3Neighbors };