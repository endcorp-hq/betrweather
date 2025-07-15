    
    //Takes in latitude and longitude of two location and returns the distance between them as the crow flies (in km)
    const getDistance = (lat_source: number, lon_source: number, lat_dest: number, lon_dest: number) => {

        var R = 6371; // km
        var dLat = toRad(lat_dest-lat_source);
        var dLon = toRad(lon_dest-lon_source);
        var lat_source = toRad(lat_source);
        var lat_dest = toRad(lat_dest);

        var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat_source) * Math.cos(lat_dest); 
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
        var d = R * c;
        return d;
        }

    // convert degrees to radians
    const toRad = (val: number) => {
        return val * Math.PI / 180;
    }

    export { getDistance };