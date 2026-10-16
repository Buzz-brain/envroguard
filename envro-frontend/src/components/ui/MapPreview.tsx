import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  LayoutChangeEvent,
  StyleProp,
  ViewStyle,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, typography } from '../../constants';
import { lightColors } from '../../constants/theme';
import { useColors } from '../../contexts/ThemeContext';

const TILE_SIZE = 256;
const ZOOM = 16;

// Two keyless raster sources. CARTO (CDN) is tried first; OSM is the fallback.
const TILE_SOURCES = [
  {
    attribution: '© OpenStreetMap contributors © CARTO',
    url: (z: number, x: number, y: number) =>
      `https://${['a', 'b', 'c'][Math.abs(x) % 3]}.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`,
  },
  {
    attribution: '© OpenStreetMap contributors',
    url: (z: number, x: number, y: number) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
  },
];

const lonToWorldX = (lon: number, z: number) => ((lon + 180) / 360) * 2 ** z * TILE_SIZE;

const latToWorldY = (lat: number, z: number) => {
  const clamped = Math.max(Math.min(lat, 85.05112878), -85.05112878);
  const latRad = (clamped * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
    2 ** z *
    TILE_SIZE
  );
};

interface MapPreviewProps {
  latitude: number;
  longitude: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}

/**
 * Lightweight "map with a pin" built from keyless raster tiles. Renders the
 * same on web and native. If neither tile source can load it renders nothing
 * so callers can fall back to a plain "open in maps" action instead of a
 * broken-looking placeholder.
 */
export function MapPreview({ latitude, longitude, height = 160, style, onPress }: MapPreviewProps) {
  const colors = useColors();
  const styles = getStyles(colors);
  const [width, setWidth] = useState(0);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [unavailable, setUnavailable] = useState(false);
  const sourceRef = useRef(0);

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

  const valid =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180;

  const source = TILE_SOURCES[sourceIndex];

  const tiles = useMemo(() => {
    if (!valid || width <= 0) return [];

    const worldX = lonToWorldX(longitude, ZOOM);
    const worldY = latToWorldY(latitude, ZOOM);
    const left = worldX - width / 2;
    const top = worldY - height / 2;

    const tileCount = 2 ** ZOOM;
    const minTileX = Math.floor(left / TILE_SIZE);
    const maxTileX = Math.floor((left + width) / TILE_SIZE);
    const minTileY = Math.floor(top / TILE_SIZE);
    const maxTileY = Math.floor((top + height) / TILE_SIZE);

    const result: { key: string; uri: string; left: number; top: number; source: number }[] = [];
    for (let ty = minTileY; ty <= maxTileY; ty += 1) {
      if (ty < 0 || ty >= tileCount) continue;
      for (let tx = minTileX; tx <= maxTileX; tx += 1) {
        const wrappedX = ((tx % tileCount) + tileCount) % tileCount;
        result.push({
          key: `${sourceIndex}/${ZOOM}/${wrappedX}/${ty}`,
          uri: source.url(ZOOM, wrappedX, ty),
          left: tx * TILE_SIZE - left,
          top: ty * TILE_SIZE - top,
          source: sourceIndex,
        });
      }
    }
    return result;
  }, [valid, width, height, latitude, longitude, source, sourceIndex]);

  if (!valid || unavailable) return null;

  const content = (
    <View style={[styles.container, { height }, style]} onLayout={onLayout}>
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

      <Text style={styles.attribution}>{source.attribution}</Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Open location in maps">
        {content}
      </Pressable>
    );
  }

  return content;
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
