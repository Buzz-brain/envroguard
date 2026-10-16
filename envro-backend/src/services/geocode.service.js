import { logger } from '../utils/logger.js';

const DEFAULT_NOMINATIM_URL = 'https://nominatim.openstreetmap.org';

const MIN_INTERVAL_MS = 1100;
const REQUEST_TIMEOUT_MS = 3000;
const MAX_PLACE_NAME_LENGTH = 200;

const enabled = () => String(process.env.GEOCODE_ENABLED || 'true').toLowerCase() !== 'false';
const baseUrl = () => process.env.NOMINATIM_URL || DEFAULT_NOMINATIM_URL;

// OpenStreetMap Nominatim asks for max 1 request/second and a User-Agent that
// identifies the application. We queue requests in-process and space them out.
let chain = Promise.resolve();
let lastRequestAt = 0;

const enqueue = (job) => {
  const run = chain.then(async () => {
    const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastRequestAt = Date.now();
    return job();
  });
  chain = run.then(() => undefined, () => undefined);
  return run;
};

const withTimeout = (ms) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
};

const buildLabel = (payload) => {
  if (!payload) return null;

  const address = payload.address || {};
  const parts = [
    address.building || address.house_number || address.road || payload.name,
    address.suburb || address.quarter || address.neighbourhood || address.hamlet,
    address.town || address.city || address.village || address.county,
    address.state,
    address.country,
  ].filter(Boolean);

  const label = [...new Set(parts)].join(', ').trim() || (payload.display_name || '').trim();
  if (!label) return null;

  return label.length > MAX_PLACE_NAME_LENGTH
    ? `${label.slice(0, MAX_PLACE_NAME_LENGTH - 1).trimEnd()}…`
    : label;
};

const requestReverse = async (latitude, longitude) => {
  const url = new URL('/reverse', baseUrl());
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', String(latitude));
  url.searchParams.set('lon', String(longitude));
  url.searchParams.set('zoom', '18');
  url.searchParams.set('addressdetails', '1');

  const timeout = withTimeout(REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: timeout.signal,
      headers: {
        'User-Agent': 'EnviroGuard/1.0 (campus hazard reporting)',
        Accept: 'application/json',
      },
    });
    if (!res.ok) return null;
    const payload = await res.json();
    if (!payload || payload.error) return null;
    return buildLabel(payload);
  } catch {
    return null;
  } finally {
    timeout.clear();
  }
};

/**
 * Resolve a short human-readable place name for a coordinate pair.
 * Never throws and never blocks the caller for long — returns null on any
 * failure so report creation/reads keep working without it.
 */
export const reverseGeocode = async (latitude, longitude) => {
  if (!enabled()) return null;

  const lat = Number(latitude);
  const lon = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;

  try {
    return await enqueue(() => requestReverse(lat, lon));
  } catch (error) {
    logger.warn('Reverse geocoding failed', { error: error.message });
    return null;
  }
};

export const isGeocodingEnabled = enabled;
