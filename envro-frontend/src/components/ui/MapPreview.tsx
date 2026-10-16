import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  LayoutChangeEvent,
  StyleProp,
  ViewStyle,
  Pressable,
  Animated,
  PanResponder,
  Platform,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius } from '../../constants';
import { lightColors } from '../../constants/theme';
import { useColors } from '../../contexts/ThemeContext';

const TILE_SIZE = 256;
const DEFAULT_ZOOM = 16;
const MIN_ZOOM = 3;
const MAX_ZOOM = 19;
// Extra tile ring drawn around the viewport so small pans do not refetch.
const PAD = TILE_SIZE;
// Pixels of movement before a touch counts as a drag instead of a tap.
const DRAG_THRESHOLD = 5;

// Two keyless raster sources. OSM is the workhorse; Esri World Street Map is
// the fallback. CARTO is deliberately not used: their basemap CDN now answers
// every tile with an "API key required" placeholder image (HTTP 200), which a
// browser cannot report as an image error, so it would silently break the map.
const TILE_SOURCES = [
  {
    attribution: '© OpenStreetMap contributors',
    url: (z: number, x: number, y: number) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
  },
  {
    attribution: '© Esri, HERE, Garmin, © OpenStreetMap contributors',
    // Esri's tile endpoint is ordered {z}/{y}/{x} — y before x.
    url: (z: number, x: number, y: number) =>
      `https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${z}/${y}/${x}`,
  },
];

const MAX_LAT = 85.05112878;

const lonToWorldX = (lon: number, z: number) => ((lon + 180) / 360) * 2 ** z * TILE_SIZE;

const latToWorldY = (lat: number, z: number) => {
  const clamped = Math.max(Math.min(lat, MAX_LAT), -MAX_LAT);
  const latRad = (clamped * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
    2 ** z *
    TILE_SIZE
  );
};

const worldXToLon = (x: number, z: number) => (x / (2 ** z * TILE_SIZE)) * 360 - 180;

const worldYToLat = (y: number, z: number) => {
  const n = Math.PI - (2 * Math.PI * y) / (2 ** z * TILE_SIZE);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
};

const clampLat = (lat: number) => Math.max(-MAX_LAT, Math.min(MAX_LAT, lat));

const wrapLon = (lon: number) => {
  let value = lon;
  while (value > 180) value -= 360;
  while (value < -180) value += 360;
  return value;
};

// react-native-web forwards unknown style keys to CSS; without this the browser
// scrolls the page instead of letting the map pan on touch devices.
const WEB_PAN_STYLE =
  Platform.OS === 'web' ? ({ touchAction: 'none' } as unknown as StyleProp<ViewStyle>) : null;

interface MapPreviewProps {
  latitude: number;
  longitude: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}

/**
 * Lightweight interactive "map with a pin" built from keyless raster tiles.
 * Renders the same on web and native: drag to pan, use the +/- controls to
 * zoom, tap to run onPress (callers open the native maps app). If neither
 * tile source can load it renders nothing so callers can fall back to a plain
 * "open in maps" action instead of a broken-looking placeholder.
 */
export function MapPreview({ latitude, longitude, height = 160, style, onPress }: MapPreviewProps) {
  const colors = useColors();
  const styles = getStyles(colors);
  const [width, setWidth] = useState(0);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [unavailable, setUnavailable] = useState(false);
  const [center, setCenter] = useState({ lat: latitude, lng: longitude });
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const sourceRef = useRef(0);
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const lastGestRef = useRef({ dx: 0, dy: 0 });

  const valid =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180;

  const centerRef = useRef(center);
  const zoomRef = useRef(zoom);
  const onPressRef = useRef(onPress);

  useEffect(() => {
    centerRef.current = center;
    zoomRef.current = zoom;
    onPressRef.current = onPress;
  });

  // Follow a different report's coordinates.
  useEffect(() => {
    if (!valid) return;
    setCenter({ lat: latitude, lng: longitude });
    setZoom(DEFAULT_ZOOM);
  }, [latitude, longitude, valid]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  }, []);

  const advanceSource = useCallback(() => {
    const next = sourceRef.current + 1;
    if (next >= TILE_SOURCES.length) {
      setUnavailable(true);
      return;
    }
    sourceRef.current = next;
    setSourceIndex(next);
  }, []);

  const onTileError = useCallback(
    (tileSource: number) => {
      // Ignore errors from tiles of a source we have already abandoned.
      if (tileSource !== sourceRef.current) return;
      advanceSource();
    },
    [advanceSource]
  );

  const zoomIn = useCallback(() => setZoom((z) => Math.min(MAX_ZOOM, z + 1)), []);
  const zoomOut = useCallback(() => setZoom((z) => Math.max(MIN_ZOOM, z - 1)), []);

  const endPan = useCallback(() => {
    const { dx, dy } = lastGestRef.current;
    const dragged = Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD;
    lastGestRef.current = { dx: 0, dy: 0 };
    pan.setValue({ x: 0, y: 0 });

    if (!dragged) {
      onPressRef.current?.();
      return;
    }

    // Dragging moves the map under a fixed pin, so the new centre shifts by
    // the opposite of the pixel delta at the current zoom.
    const z = zoomRef.current;
    const c = centerRef.current;
    const worldX = lonToWorldX(c.lng, z) - dx;
    const worldY = latToWorldY(c.lat, z) - dy;
    setCenter({ lat: clampLat(worldYToLat(worldY, z)), lng: wrapLon(worldXToLon(worldX, z)) });
  }, [pan]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          lastGestRef.current = { dx: 0, dy: 0 };
        },
        onPanResponderMove: (_evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
          lastGestRef.current = { dx: gestureState.dx, dy: gestureState.dy };
          pan.setValue({ x: gestureState.dx, y: gestureState.dy });
        },
        onPanResponderRelease: endPan,
        onPanResponderTerminate: endPan,
      }),
    [endPan, pan]
  );

  const source = TILE_SOURCES[sourceIndex];

  const tiles = useMemo(() => {
    if (!valid || width <= 0) return [];

    const worldX = lonToWorldX(center.lng, zoom);
    const worldY = latToWorldY(center.lat, zoom);
    const left = worldX - width / 2;
    const top = worldY - height / 2;

    const tileCount = 2 ** zoom;
    const minTileX = Math.floor((left - PAD) / TILE_SIZE);
    const maxTileX = Math.floor((left + width + PAD) / TILE_SIZE);
    const minTileY = Math.floor((top - PAD) / TILE_SIZE);
    const maxTileY = Math.floor((top + height + PAD) / TILE_SIZE);

    const result: { key: string; uri: string; left: number; top: number; source: number }[] = [];
    for (let ty = minTileY; ty <= maxTileY; ty += 1) {
      if (ty < 0 || ty >= tileCount) continue;
      for (let tx = minTileX; tx <= maxTileX; tx += 1) {
        const wrappedX = ((tx % tileCount) + tileCount) % tileCount;
        result.push({
          key: `${sourceIndex}/${zoom}/${wrappedX}/${ty}`,
          uri: source.url(zoom, wrappedX, ty),
          left: tx * TILE_SIZE - left,
          top: ty * TILE_SIZE - top,
          source: sourceIndex,
        });
      }
    }
    return result;
  }, [valid, width, height, center, zoom, source, sourceIndex]);

  if (!valid || unavailable) return null;

  return (
    <View style={[styles.container, { height }, style]} onLayout={onLayout}>
      <Animated.View
        style={[styles.panLayer, WEB_PAN_STYLE, { transform: pan.getTranslateTransform() }]}
        accessibilityRole={onPress ? 'button' : 'image'}
        accessibilityLabel="Map preview. Drag to explore the area, tap to open in maps."
        onAccessibilityTap={() => onPressRef.current?.()}
        {...panResponder.panHandlers}
      >
        {tiles.map((tile) => (
          <Image
            key={tile.key}
            source={{ uri: tile.uri }}
            style={[styles.tile, { left: tile.left, top: tile.top }]}
            onError={() => onTileError(tile.source)}
          />
        ))}

        <View style={styles.pinWrap} pointerEvents="none">
          <View style={{ marginBottom: 26 }}>
            <Ionicons name="location" size={32} color={colors.danger} />
          </View>
        </View>
      </Animated.View>

      <View style={styles.zoomControls}>
        <Pressable
          onPress={zoomIn}
          disabled={zoom >= MAX_ZOOM}
          accessibilityRole="button"
          accessibilityLabel="Zoom in"
          hitSlop={4}
          style={({ pressed }) => [
            styles.zoomBtn,
            pressed && styles.zoomBtnPressed,
            zoom >= MAX_ZOOM && styles.zoomBtnDisabled,
          ]}
        >
          <Ionicons name="add" size={18} color={colors.textSecondary} />
        </Pressable>
        <View style={styles.zoomDivider} />
        <Pressable
          onPress={zoomOut}
          disabled={zoom <= MIN_ZOOM}
          accessibilityRole="button"
          accessibilityLabel="Zoom out"
          hitSlop={4}
          style={({ pressed }) => [
            styles.zoomBtn,
            pressed && styles.zoomBtnPressed,
            zoom <= MIN_ZOOM && styles.zoomBtnDisabled,
          ]}
        >
          <Ionicons name="remove" size={18} color={colors.textSecondary} />
        </Pressable>
      </View>

      <Text style={styles.attribution} pointerEvents="none">
        {source.attribution}
      </Text>
    </View>
  );
}

const getStyles = (c: typeof lightColors) =>
  StyleSheet.create({
    container: {
      width: '100%',
      borderRadius: borderRadius.md,
      overflow: 'hidden',
      backgroundColor: c.surfaceAlt,
      borderWidth: 1,
      borderColor: c.border,
    },
    panLayer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    tile: {
      position: 'absolute',
      width: TILE_SIZE,
      height: TILE_SIZE,
    },
    pinWrap: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    zoomControls: {
      position: 'absolute',
      top: 6,
      right: 6,
      borderRadius: borderRadius.sm,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    zoomBtn: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    zoomBtnPressed: {
      backgroundColor: c.surfaceAlt,
    },
    zoomBtnDisabled: {
      opacity: 0.4,
    },
    zoomDivider: {
      height: 1,
      backgroundColor: c.border,
    },
    attribution: {
      position: 'absolute',
      right: 4,
      bottom: 2,
      fontSize: 9,
      color: c.textTertiary,
      backgroundColor: c.surface,
      paddingHorizontal: 4,
      borderRadius: borderRadius.sm,
      opacity: 0.85,
    },
  });
