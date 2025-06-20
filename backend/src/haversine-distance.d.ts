declare module 'haversine-distance' {
    // The function takes two points {lat:number, lon:number} and returns a number
    export default function haversineDistance(
      a: { lat: number; lon: number },
      b: { lat: number; lon: number }
    ): number;
  }
  