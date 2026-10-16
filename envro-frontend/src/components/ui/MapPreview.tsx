import React, { useCallback, useMemo, useState } from 'react';
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
 * Lightweight "map with a pin" built from OpenStreetMap raster tiles.
 * Needs no API key and renders identically on web and native. Falls back to a
 * plain panel if the tiles cannot be loaded.
 */
export function MapPreview({ latitude, longitude, height = 160, style, onPress }: MapPreviewProps) {
  const colors = useColors();
  const styles = getStyles(colors);
  const [width, setWidth] = useState(0);
  const [tilesFailed, setTilesFailed] = useState(false);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  }, []);

  const valid =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180;

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

    const result: { key: string; uri: string; left: number; top: number }[] = [];
    for (let ty = minTileY; ty <= maxTileY; ty += 1) {
      if (ty < 0 || ty >= tileCount) continue;
      for (let tx = minTileX; tx <= maxTileX; tx += 1) {
        const wrappedX = ((tx % tileCount) + tileCount) % tileCount;
        result.push({
          key: `${ZOOM}/${wrappedX}/${ty}`,
          uri: `https://tile.openstreetmap.org/${ZOOM}/${wrappedX}/${ty}.png`,
          left: tx * TILE_SIZE - left,
          top: ty * TILE_SIZE - top,
        });
      }
    }
    return result;
  }, [valid, width, height, latitude, longitude]);

  const pinOffset = 26;

  const content = (
    <View style={[styles.container, { height }, style]} onLayout={onLayout}>
      {!tilesFailed &&
        tiles.map((tile) => (
          <Image
            key={tile.key}
            source={{ uri: tile.uri }}
            style={[styles.tile, { left: tile.left, top: tile.top }]}
            onError={() => setTilesFailed(true)}
          />
        ))}

      {tilesFailed && (
        <View style={styles.fallback}>
          <Ionicons name="map-outline" size={26} color={colors.textTertiary} />
          <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 4 }]}>
            Map unavailable
          </Text>
        </View>
      )}

      {valid && !tilesFailed && (
        <View style={styles.pinWrap} pointerEvents="none">
          <View style={{ marginBottom: pinOffset }}>
            <Ionicons name="location" size={32} color={colors.danger} />
          </View>
        </View>
      )}

      <Text style={styles.attribution}>© OpenStreetMap contributors</Text>
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
    fallback: {
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
