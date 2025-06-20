// frontend/src/components/Map.tsx

import React, { useEffect, useRef } from 'react';
import maplibregl, { NavigationControl, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { FeatureCollection } from 'geojson';

const Map: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  let startMarker: Marker | null = null;
  let endMarker: Marker | null = null;

  useEffect(() => {
    if (!mapContainer.current) return;

    // 1) Blank initial style
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: { version: 8, sources: {}, layers: [] },
      center: [-122.953, 50.119],
      zoom: 12,
      pitch: 45,
      bearing: -17.6,
    });
    map.addControl(new NavigationControl({}), 'top-left');

    // helper to fetch ski‐routes in view
    async function reloadRoutes() {
      const b = map.getBounds();
      const bbox = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].join(',');
      const resp = await fetch(`http://localhost:4000/api/skiroutes?bbox=${bbox}`);
      const data: FeatureCollection = await resp.json();
      (map.getSource('skiroutes') as maplibregl.GeoJSONSource).setData(data);
    }

    map.on('load', () => {
      // 2) Background so it’s not purple
      map.addLayer({
        id: 'background',
        type: 'background',
        paint: { 'background-color': '#ffffff' },
      });

      // 3) DEM source + 3D terrain
      map.addSource('dem', {
        type: 'raster-dem',
        tiles: ['https://demotiles.maplibre.org/terrain-rgb/{z}/{x}/{y}.png'],
        tileSize: 512,
        maxzoom: 14,
      });
      map.setTerrain({ source: 'dem', exaggeration: 1.3 });

      // 4) Hillshade for relief shading
      map.addLayer({
        id: 'hillshade',
        type: 'hillshade',
        source: 'dem',
        paint: {
          'hillshade-shadow-color': '#000',
          'hillshade-highlight-color': '#fff',
          'hillshade-accent-color': '#888',
        },
      });

      // 5) Satellite imagery (Esri World Imagery)
      map.addSource('satellite', {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        ],
        tileSize: 256,
        maxzoom: 19,
      });
      map.addLayer(
        { id: 'satellite', type: 'raster', source: 'satellite' },
        // place satellite above the hillshade so it’s draped
        'hillshade'
      );

      // 6) Ski routes vector layers
      map.addSource('skiroutes', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'ski-trails',
        type: 'line',
        source: 'skiroutes',
        filter: ['==', ['geometry-type'], 'LineString'],
        paint: { 'line-color': '#ff6200', 'line-width': 3 },
      });
      map.addLayer({
        id: 'ski-points',
        type: 'circle',
        source: 'skiroutes',
        filter: ['==', ['geometry-type'], 'Point'],
        paint: {
          'circle-radius': 6,
          'circle-color': '#0066ff',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
        },
      });

      // 7) Computed‐route layer
      map.addSource('computed-route', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'computed-route',
        paint: { 'line-color': '#0000ff', 'line-width': 4 },
      });

      // 8) Fetch routes on load + map movement
      reloadRoutes();
      map.on('moveend', reloadRoutes);

      // 9) Click to set start/end & draw route
      map.on('click', async (e) => {
        const { lng, lat } = e.lngLat;
        if (!startMarker) {
          startMarker = new Marker({ color: 'green' })
            .setLngLat([lng, lat])
            .addTo(map);
          return;
        }
        if (!endMarker) {
          endMarker = new Marker({ color: 'red' })
            .setLngLat([lng, lat])
            .addTo(map);
          const sp = startMarker.getLngLat();
          const url = `http://localhost:4000/api/route?start=${sp.lng},${sp.lat}&end=${lng},${lat}`;
          const res = await fetch(url);
          const geo: FeatureCollection = await res.json();
          (map.getSource('computed-route') as maplibregl.GeoJSONSource).setData(geo);
          return;
        }
        // reset
        startMarker.remove();
        endMarker.remove();
        startMarker = endMarker = null;
        (map.getSource('computed-route') as maplibregl.GeoJSONSource).setData({
          type: 'FeatureCollection',
          features: [],
        });
      });
    });

    return () => map.remove();
  }, []);

  return <div ref={mapContainer} style={{ height: '100vh', width: '100%' }} />;
};

export default Map;
