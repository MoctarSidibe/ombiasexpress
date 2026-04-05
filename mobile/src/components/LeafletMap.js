/**
 * LeafletMap — drop-in replacement for react-native-maps MapView.
 * Uses Leaflet.js + OpenStreetMap tiles. No API key required.
 *
 * Props:
 *   style              - ViewStyle
 *   initialRegion      - { latitude, longitude, latitudeDelta, longitudeDelta }
 *   showsUserLocation  - bool (pass userLocation to control the dot)
 *   userLocation       - { latitude, longitude } (live location)
 *   markers            - [{ id, coordinate:{latitude,longitude}, title, color, type }]
 *                        type: 'pickup'|'dropoff'|'driver'|'car'|'pin'|'user'
 *   polylines          - [{ id, coordinates:[{latitude,longitude}], color, width, dashed }]
 *   onPress            - ({latitude, longitude}) => void
 *   onMapReady         - () => void
 *   onRegionChangeComplete - (region) => void
 *
 * Ref methods (via useImperativeHandle):
 *   fitToCoordinates(coords, { edgePadding: {top,right,bottom,left}, animated })
 *   animateToRegion({ latitude, longitude, latitudeDelta, longitudeDelta })
 *   setCenter(latitude, longitude, zoom?)
 */

import React, { useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

// ─── Leaflet HTML template ────────────────────────────────────────────────────
const LEAFLET_HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { width:100vw; height:100vh; overflow:hidden; }
  #map { width:100%; height:100%; }

  /* Custom marker styles */
  .mk-pickup  { width:22px;height:22px;border-radius:50%;background:#2196F3;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4); }
  .mk-dropoff { width:26px;height:26px;border-radius:2px 2px 2px 0;background:#F44336;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4);transform:rotate(-45deg); }
  .mk-driver  { width:36px;height:36px;border-radius:50%;background:#FFA726;border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,.4); }
  .mk-car     { width:32px;height:32px;border-radius:50%;background:#0288D1;border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 6px rgba(0,0,0,.4); }
  .mk-pin     { width:20px;height:20px;border-radius:50%;background:#9C27B0;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4); }
  .mk-user    { width:18px;height:18px;border-radius:50%;background:#2196F3;border:3px solid rgba(33,150,243,.4);box-shadow:0 0 0 6px rgba(33,150,243,.15); }
  .mk-default { width:20px;height:20px;border-radius:50%;background:#607D8B;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4); }

  /* Bigger zoom buttons for touch, clear of bottom panels */
  .leaflet-control-zoom a { width:36px !important; height:36px !important; line-height:36px !important; font-size:20px !important; }
  .leaflet-bottom.leaflet-right { margin-bottom: 8px; margin-right: 8px; }
  .leaflet-bottom.leaflet-left  { margin-bottom: 8px; margin-left: 8px; }
</style>
</head>
<body>
<div id="map"></div>
<script>
var map = null;
var markersMap = {};
var polylinesMap = {};
var userDot = null;
var initialized = false;
var streetLayer = null;
var satelliteLayer = null;
var labelLayer = null;
var currentMapType = 'standard';

function send(type, data) {
  try { window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, data: data || {} })); } catch(e) {}
}

function buildLayers() {
  // Street: CartoDB Voyager — detailed labels, roads, POIs, no API key
  streetLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 19, subdomains: ['a','b','c','d'],
  });
  // Satellite: ESRI World Imagery — free, no API key
  satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
  });
  // Label overlay on top of satellite (CartoDB only-labels layer)
  labelLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png', {
    maxZoom: 19, subdomains: ['a','b','c','d'], opacity: 0.9,
  });
}

function setMapType(type) {
  if (!map) return;
  currentMapType = type;
  if (type === 'satellite') {
    if (map.hasLayer(streetLayer)) map.removeLayer(streetLayer);
    if (!map.hasLayer(satelliteLayer)) satelliteLayer.addTo(map);
    if (!map.hasLayer(labelLayer)) labelLayer.addTo(map);
  } else {
    if (map.hasLayer(satelliteLayer)) map.removeLayer(satelliteLayer);
    if (map.hasLayer(labelLayer)) map.removeLayer(labelLayer);
    if (!map.hasLayer(streetLayer)) streetLayer.addTo(map);
  }
}

function initMap(region) {
  if (initialized) return;
  initialized = true;
  var lat = region.latitude;
  var lng = region.longitude;
  var zoom = latDeltaToZoom(region.latitudeDelta || 0.05);
  var zoomPos = region.zoomPosition || 'bottomright';
  map = L.map('map', { zoomControl: false, attributionControl: false }).setView([lat, lng], zoom);
  L.control.zoom({ position: zoomPos }).addTo(map);
  buildLayers();
  streetLayer.addTo(map);
  map.on('click', function(e) {
    send('press', { latitude: e.latlng.lat, longitude: e.latlng.lng });
  });
  map.on('moveend', function() {
    var c = map.getCenter(); var b = map.getBounds();
    send('regionChange', {
      latitude: c.lat, longitude: c.lng,
      latitudeDelta: b.getNorth() - b.getSouth(),
      longitudeDelta: b.getEast() - b.getWest()
    });
  });
  send('ready', {});
}

function latDeltaToZoom(delta) {
  if (!delta || delta <= 0) return 14;
  return Math.round(Math.log2(360 / delta)) - 1;
}

function makeIcon(type, color) {
  var cls = 'mk-' + (type || 'default');
  var content = '';
  if (type === 'driver') content = '🚗';
  if (type === 'car')    content = '🚙';
  return L.divIcon({ className: '', html: '<div class="' + cls + '">' + content + '</div>', iconAnchor: [11, 11] });
}

function setMarkers(markers) {
  // Remove old
  Object.keys(markersMap).forEach(function(id) {
    if (!markers.find(function(m){ return m.id == id; })) {
      map.removeLayer(markersMap[id]);
      delete markersMap[id];
    }
  });
  // Add/update
  markers.forEach(function(m) {
    var lat = m.coordinate.latitude;
    var lng = m.coordinate.longitude;
    var icon = makeIcon(m.type, m.color);
    if (markersMap[m.id]) {
      markersMap[m.id].setLatLng([lat, lng]);
      markersMap[m.id].setIcon(icon);
    } else {
      var mk = L.marker([lat, lng], { icon: icon });
      if (m.title) mk.bindTooltip(m.title, { permanent: false });
      (function(markerId) {
        mk.on('click', function(e) {
          L.DomEvent.stopPropagation(e);
          send('markerPress', { id: markerId });
        });
      })(m.id);
      mk.addTo(map);
      markersMap[m.id] = mk;
    }
  });
}

function setPolylines(polylines) {
  Object.keys(polylinesMap).forEach(function(id) {
    if (!polylines.find(function(p){ return p.id == id; })) {
      map.removeLayer(polylinesMap[id]);
      delete polylinesMap[id];
    }
  });
  polylines.forEach(function(p) {
    var latlngs = p.coordinates.map(function(c){ return [c.latitude, c.longitude]; });
    var opts = {
      color: p.color || '#2196F3',
      weight: p.width || 4,
      opacity: 0.85,
      dashArray: p.dashed ? '8 10' : null
    };
    if (polylinesMap[p.id]) {
      polylinesMap[p.id].setLatLngs(latlngs);
    } else {
      polylinesMap[p.id] = L.polyline(latlngs, opts).addTo(map);
    }
  });
}

function setUserLocation(lat, lng) {
  if (!map) return;
  if (!userDot) {
    userDot = L.marker([lat, lng], { icon: L.divIcon({ className: '', html: '<div class="mk-user"></div>', iconAnchor: [9,9] }) }).addTo(map);
  } else {
    userDot.setLatLng([lat, lng]);
  }
}

function fitBounds(coords, padding) {
  if (!map || !coords || coords.length === 0) return;
  var latlngs = coords.map(function(c){ return [c.latitude, c.longitude]; });
  var p = padding || { top: 50, right: 50, bottom: 50, left: 50 };
  map.fitBounds(L.latLngBounds(latlngs), { paddingTopLeft: [p.left, p.top], paddingBottomRight: [p.right, p.bottom], animate: true });
}

function animateTo(region) {
  if (!map) return;
  var zoom = latDeltaToZoom(region.latitudeDelta || 0.05);
  map.flyTo([region.latitude, region.longitude], zoom, { duration: 0.8 });
}

// Listen for messages from React Native
document.addEventListener('message', handleMessage);
window.addEventListener('message', handleMessage);

function handleMessage(e) {
  try {
    var msg = JSON.parse(e.data);
    if (msg.type === 'init')           initMap(msg.region);
    else if (msg.type === 'markers')   { if(map) setMarkers(msg.markers); }
    else if (msg.type === 'polylines') { if(map) setPolylines(msg.polylines); }
    else if (msg.type === 'userLocation') { setUserLocation(msg.lat, msg.lng); }
    else if (msg.type === 'fitBounds') fitBounds(msg.coords, msg.padding);
    else if (msg.type === 'animateTo') animateTo(msg.region);
    else if (msg.type === 'setCenter') { if(map) map.setView([msg.lat, msg.lng], msg.zoom || map.getZoom()); }
    else if (msg.type === 'setMapType') setMapType(msg.mapType);
  } catch(err) {}
}
</script>
</body>
</html>`;

// ─── React component ──────────────────────────────────────────────────────────
const LeafletMap = forwardRef(function LeafletMap(props, ref) {
    const {
        style,
        initialRegion,
        showsUserLocation,
        userLocation,
        mapType = 'standard',
        zoomPosition = 'bottomright',
        markers = [],
        polylines = [],
        onPress,
        onMarkerPress,
        onMapReady,
        onRegionChangeComplete,
    } = props;

    const webViewRef = useRef(null);
    const mapReadyRef = useRef(false);
    const pendingRef = useRef([]);

    // ── send message to WebView ───────────────────────────────────────────────
    function inject(msg) {
        if (!webViewRef.current) return;
        const js = `(function(){ try { window.dispatchEvent(new MessageEvent('message',{data:${JSON.stringify(JSON.stringify(msg))}})); } catch(e){} })();true;`;
        webViewRef.current.injectJavaScript(js);
    }

    function sendWhenReady(msg) {
        if (mapReadyRef.current) inject(msg);
        else pendingRef.current.push(msg);
    }

    // ── imperative API ────────────────────────────────────────────────────────
    useImperativeHandle(ref, () => ({
        fitToCoordinates(coords, options = {}) {
            if (!coords || coords.length === 0) return;
            inject({ type: 'fitBounds', coords, padding: options.edgePadding || { top: 60, right: 40, bottom: 60, left: 40 } });
        },
        animateToRegion(region) {
            inject({ type: 'animateTo', region });
        },
        setCenter(latitude, longitude, zoom) {
            inject({ type: 'setCenter', lat: latitude, lng: longitude, zoom });
        },
    }));

    // ── sync map type ─────────────────────────────────────────────────────────
    useEffect(() => {
        sendWhenReady({ type: 'setMapType', mapType });
    }, [mapType]);

    // ── sync markers ──────────────────────────────────────────────────────────
    useEffect(() => {
        sendWhenReady({ type: 'markers', markers });
    }, [JSON.stringify(markers)]);

    // ── sync polylines ────────────────────────────────────────────────────────
    useEffect(() => {
        sendWhenReady({ type: 'polylines', polylines });
    }, [JSON.stringify(polylines)]);

    // ── sync user location ────────────────────────────────────────────────────
    useEffect(() => {
        if (showsUserLocation && userLocation) {
            sendWhenReady({ type: 'userLocation', lat: userLocation.latitude, lng: userLocation.longitude });
        }
    }, [userLocation?.latitude, userLocation?.longitude, showsUserLocation]);

    // ── handle messages from WebView ──────────────────────────────────────────
    function onMessage(event) {
        try {
            const msg = JSON.parse(event.nativeEvent.data);
            if (msg.type === 'ready') {
                mapReadyRef.current = true;
                // Flush pending messages
                pendingRef.current.forEach(m => inject(m));
                pendingRef.current = [];
                // Send initial state
                if (markers.length > 0) inject({ type: 'markers', markers });
                if (polylines.length > 0) inject({ type: 'polylines', polylines });
                if (showsUserLocation && userLocation) {
                    inject({ type: 'userLocation', lat: userLocation.latitude, lng: userLocation.longitude });
                }
                if (onMapReady) onMapReady();
            } else if (msg.type === 'markerPress') {
                if (onMarkerPress) onMarkerPress(msg.data.id);
            } else if (msg.type === 'press') {
                if (onPress) onPress({ latitude: msg.data.latitude, longitude: msg.data.longitude });
            } else if (msg.type === 'regionChange') {
                if (onRegionChangeComplete) onRegionChangeComplete(msg.data);
            }
        } catch (_) {}
    }

    // ── init map once WebView loads ───────────────────────────────────────────
    function onLoad() {
        const region = { ...(initialRegion || { latitude: 0.4162, longitude: 9.4673, latitudeDelta: 0.05, longitudeDelta: 0.05 }), zoomPosition };
        inject({ type: 'init', region });
    }

    return (
        <View style={[styles.container, style]}>
            <WebView
                ref={webViewRef}
                source={{ html: LEAFLET_HTML }}
                style={styles.webview}
                originWhitelist={['*']}
                javaScriptEnabled
                domStorageEnabled
                geolocationEnabled
                mixedContentMode="always"
                onLoadEnd={onLoad}
                onMessage={onMessage}
                scrollEnabled={false}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
});

const styles = StyleSheet.create({
    container: { flex: 1, overflow: 'hidden' },
    webview: { flex: 1, backgroundColor: '#e8e0d8' },
});

export default LeafletMap;
