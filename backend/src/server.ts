import express, { Request, Response } from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import type { FeatureCollection } from 'geojson';
const haversineDistance: (
    a: { lat: number; lon: number },
    b: { lat: number; lon: number }
  ) => number = require('haversine-distance');
const dijkstra = require('dijkstrajs');

const app = express();
app.use(cors());
app.use(express.json());

function osmToGeoJSON(osm: any): FeatureCollection {
  const features = osm.elements
    .filter((e: any) => e.type === 'way' || e.type === 'relation')
    .map((e: any) => {
      let geometry;
      if (e.type === 'way') {
        geometry = {
          type: 'LineString',
          coordinates: e.geometry.map((pt: any) => [pt.lon, pt.lat]),
        };
      } else {
        geometry = {
          type: 'MultiLineString',
          coordinates: e.members
            .filter((m: any) => m.geometry)
            .map((m: any) =>
              m.geometry.map((pt: any) => [pt.lon, pt.lat])
            ),
        };
      }
      return {
        type: 'Feature',
        properties: e.tags || {},
        geometry,
      };
    });

  return { type: 'FeatureCollection', features };
}

function buildGraph(data: GeoJSON.FeatureCollection) {
    const graph: Record<string, Record<string, number>> = {};
  
    data.features.forEach((f) => {
      if (f.geometry.type !== 'LineString') return;
      const coords = (f.geometry as any).coordinates as [number, number][];
      for (let i = 0; i < coords.length - 1; i++) {
        const [lon1, lat1] = coords[i];
        const [lon2, lat2] = coords[i + 1];
        const key1 = `${lon1},${lat1}`;
        const key2 = `${lon2},${lat2}`;
        const dist = haversineDistance({ lat: lat1, lon: lon1 }, { lat: lat2, lon: lon2 });
        graph[key1] = graph[key1] || {};
        graph[key2] = graph[key2] || {};
        graph[key1][key2] = dist;
        graph[key2][key1] = dist;
      }
    });
  
    return graph;
  }
  
  // find the nearest graph node to an arbitrary click point
  function findNearestNode(
    graph: Record<string, Record<string, number>>,
    point: { lon: number; lat: number }
  ) {
    let bestKey: string | null = null;
    let bestDist = Infinity;
    for (const key of Object.keys(graph)) {
      const [lon, lat] = key.split(',').map(Number);
      const d = haversineDistance({ lat, lon }, point);
      if (d < bestDist) {
        bestDist = d;
        bestKey = key;
      }
    }
    return bestKey!;
  }

  app.get('/api/route', async (req, res) => {
    const [startLon, startLat, endLon, endLat] = (req.query.start as string)
      .split(',')
      .concat((req.query.end as string).split(','))
      .map(parseFloat);
  
    // 1) reuse your Overpass logic to grab all piste ways in a slightly larger bbox
    const padding = 0.01; // small pad so your start/end are inside
    const minLon = Math.min(startLon, endLon) - padding;
    const maxLon = Math.max(startLon, endLon) + padding;
    const minLat = Math.min(startLat, endLat) - padding;
    const maxLat = Math.max(startLat, endLat) + padding;
  
    const overpassQL = `
  [out:json][timeout:25];
  (
    way["piste:type"](${minLat},${minLon},${maxLat},${maxLon});
  );
  out body geom;
    `;
  
    const osmResp = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: overpassQL,
    });
    const osmJson = await osmResp.json();
    const geojson = osmToGeoJSON(osmJson); // your existing converter
  
    // 2) build the graph & find endpoints
    const graph = buildGraph(geojson);
    const startKey = findNearestNode(graph, { lon: startLon, lat: startLat });
    const endKey = findNearestNode(graph, { lon: endLon, lat: endLat });
  
    // 3) compute shortest path
    const pathKeys = dijkstra.find_path(graph, startKey, endKey) as string[];
  
    // 4) turn that back into a LineString
    const coords = pathKeys.map((k) => k.split(',').map(Number) as [number, number]);
    const routeFeature: GeoJSON.Feature = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: coords },
    };
  
    res.json({
      type: 'FeatureCollection',
      features: [routeFeature],
    });
  });
  

app.get('/api/skiroutes', async (req: Request, res: Response) => {
  const defaultBbox = '-122.958,50.114,-122.948,50.124';
  const bbox = (req.query.bbox as string) || defaultBbox;
  const [minLon, minLat, maxLon, maxLat] = bbox
    .split(',')
    .map(parseFloat);

  // plain ASCII quotes here!
  const overpassQL = `
[out:json][timeout:25];
(
  way["piste:type"](${minLat},${minLon},${maxLat},${maxLon});
  node["piste:type"](${minLat},${minLon},${maxLat},${maxLon});
);
out body geom;
`;

  try {
    const osmf = await fetch(
      'https://overpass-api.de/api/interpreter',
      {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: overpassQL,
      }
    );
    const osmJson = await osmf.json();
    const geojson = osmToGeoJSON(osmJson);
    res.json(geojson);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'OSM fetch failed' });
  }
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(`Backend running on port ${PORT}`)
);
