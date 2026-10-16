# EnviroGuard — Project Working Notes

## Overview
Campus environmental hazard reporting system.
- `envro-backend/` — Node.js + Express + Mongoose API (`src/`), monorepo root also hosts this file.
- `envro-frontend/` — React Native (Expo SDK 56) app (see `envro-frontend/AGENTS.md`).
- Backend deployed on Render (auto-deploy from `main`); database MongoDB Atlas; push via Expo push service.
- Local backend stack: MongoDB at `127.0.0.1:27017`; `.env` holds `MONGODB_URI`, `JWT_SECRET`, etc. (committed `.env` files are NOT in the repo).

## Administrative responsibility model (as-built)
- **environmentalAdmin** — system-wide: provisions/manages Environmental Admins and Faculty Admins, manages faculties, **assigns reports**, **updates report statuses**.
- **facultyAdmin** — own faculty only: manages departments, department admins, students; read-only reports; **never a report assignee**.
- **departmentAdmin** — own department only: manages students; read-only reports; **never a report assignee**.
- **student** — reports, tracks own reports; sees own reports only.
- Status flow: `pending → under_review → in_progress → resolved` (resolved terminal; backward/skip transitions rejected with 400).
- Audit logs: every admin CRUD records real actor, actorModel, actorName; `GET /audit-logs` — envAdmin 200 (all), facultyAdmin 200 (own faculty), departmentAdmin 403, anonymous 401.

## Backend commands
- `npm start` — production start (`src/server.js`)
- `npm run dev` — nodemon
- `npm test` — integration suite `test/fixes.test.js` (Node built-in runner; isolated `envro-guard-test` DB, seeded fixtures, ephemeral port). Requires local MongoDB.
- `npm run seed` — `src/scripts/seedEnvironmentalAdmin.js`

## Frontend commands
- `npm start` / `npm run android` / `npm run ios`
- `npx tsc --noEmit` — typecheck

## Progress log
- 2026-10-16 — **Pin anchoring fix after drag** (commit + push).
  - Defect: the pin was flex-centered inside the pan layer, so it always rendered at the **view centre** — correct before any pan, wrong afterwards (it "remained" in the middle while the hazard coordinate moved away).
  - `MapPreview` now computes `pinOffset` = world-pixel distance from `center` to the report coordinate and applies it as a transform on `pinWrap`. The pin therefore moves with the tiles during a drag and does not jump on release; if the user pans far enough it clips out of the box, as on any map.
  - Frontend `tsc` clean (no backend change).
- 2026-10-16 — **Tile source fix #2: OSM's volunteer servers block us** (commit + push).
  - Symptom: map rendered OSM's "Access blocked … tile usage policy" tile — again an **HTTP 200 placeholder image**, so `onError` never fired. Trigger: helmet's default `Referrer-Policy: no-referrer` hid our origin, and OSM's policy tells production apps to use their own tile infrastructure anyway.
  - `MapPreview.TILE_SOURCES`: **Esri World Street Map primary → Esri World Topo Map fallback** (`services.arcgisonline.com`, keyless, verified real tiles). OSM dropped entirely (a blocked tile must never be a fallback). Attribution `© Esri, HERE, Garmin, © OpenStreetMap contributors`.
  - `src/app.js`: `img-src` now only `services.arcgisonline.com` for tiles; added helmet `referrerPolicy: strict-origin-when-cross-origin`.
  - Tests: `GEO-6` asserts Esri allowed, OSM **absent**, referrer-policy value. Backend **44/44**, frontend `tsc` clean.
- 2026-10-16 — **Native "Open in Maps" fixed** (commit + push).
  - New `src/utils/openMaps.ts` replaces the duplicated per-screen helper (which was `Linking.openURL(webUrl).catch(() => {})` — i.e. failures were **silent no-ops**).
  - **Android** now uses the `geo:lat,lon?q=lat,lon(label)` scheme so the device maps app opens the pin directly (no browser detour); **iOS/web** keep `https://www.google.com/maps/search/...` (Maps app if installed, new tab otherwise). Falls back from `geo:` → web URL → `ToastService.error('Cannot Open Maps', ...)`.
  - Both detail screens import it and pass `report.location.address` as the pin label; local `Linking` imports removed. Verified: `tsc` clean, 4 call sites updated.
- 2026-10-16 — **Tile source fix: CARTO now requires an API key** (commit + push).
  - Symptom: map rendered as a grid of "API KEY REQUIRED". CARTO's basemap CDN answers every tile with a **200 OK placeholder image** (~2KB) so the browser's `onError` fallback never fired and the map never fell back to OSM.
  - `MapPreview.TILE_SOURCES`: **OSM (`tile.openstreetmap.org`) primary → Esri World Street Map fallback** (`services.arcgisonline.com/.../tile/{z}/{y}/{x}` — note **y before x**). Both keyless; verified with real tiles (Ihiagwa/London/NY: OSM 6–33KB, Esri 3.8–40KB vs CARTO's constant 2049B). Attribution strings updated per source.
  - CSP `img-src` (`src/app.js`): dropped the three `*.basemaps.cartocdn.com` hosts, added `services.arcgisonline.com`.
  - Tests: `GEO-6` now asserts OSM + Esri hosts. Backend **44/44**, frontend `tsc` clean.
- 2026-10-16 — **Interactive map preview** (drag to pan + zoom controls; no new deps, JS-only → no EAS rebuild).
  - `components/ui/MapPreview.tsx`: `center`/`zoom` state, inverse Web-Mercator math (`worldXToLon`/`worldYToLat`), padded tile ring (one 256px tile beyond the viewport) so small pans refetch nothing, `PanResponder` drag-pan (claims responder on touch start; a <5px release is a tap → `onPress`), zoom `+`/`−` chips (clamped 3–19, dimmed at bounds), and `touchAction:'none'` on web so a touch-drag pans instead of scrolling the page. **Same public API → both detail screens unchanged.**
  - Trade-off: a touch that starts on the map pans it rather than scrolling the page (standard map-widget behaviour).
  - Frontend `tsc` clean; backend `npm test` 44/44 (no backend change).
- 2026-10-16 — **Understandable report locations: place name + map + open-in-maps** (commit + push).
  - New `envro-backend/src/services/geocode.service.js`: OSM Nominatim reverse geocoding (no API key), env-gated by `GEOCODE_ENABLED` (default true), `NOMINATIM_URL` override, in-process 1 req/1.1s throttle, 3s timeout, identifying `User-Agent`, returns short label or `null`, never throws.
  - `report/model.js`: added optional `location.placeName` (max 200). `report/service.js`: fire-and-forget geocode on create; on coordinate change clears + refills; `getReportByIdService` lazily backfills legacy reports, capped at a 1.2s read budget (background completion persists for next read).
  - Frontend: `Location.placeName?` type; new `components/ui/MapPreview.tsx` (OSM raster tiles + center pin + "© OpenStreetMap contributors", graceful fallback); student `ReportDetailScreen` + admin `AdminReportDetailScreen` show place name, MapPreview, "Open in Maps" (`google.com/maps/search`), raw coords demoted to a caption.
  - **Defect found+fixed:** student report edits silently ignored location/address — `Object.assign(report, update)` with dotted keys (`'location.coordinates'`, `'location.address'`) never persisted. Now `report.set(update)`.
  - Tests: `test/fixes.test.js` **43/43 passing** (added GEO-1..GEO-5: create blocked-free when disabled, backfill, lazy-fill legacy, failure never blocks, coord edit refill; suite now sets `GEOCODE_ENABLED=false` by default with a local Nominatim stub). Frontend `tsc` clean.
- 2026-10-16 — **Map tile fix + location section polish** (commit + push).
  - **Root cause of "Map unavailable" on Render:** `src/app.js` helmet CSP `img-src` was `['self','blob:','data:',cloudinary]`, so the browser blocked map tiles. Added `tile.openstreetmap.org` + `a/b/c.basemaps.cartocdn.com` to `img-src` (CSP also gates native/web `<img>`).
  - `MapPreview` rewritten: CARTO Voyager primary source → OSM fallback → if both fail render **nothing** (no broken placeholder); per-tile errors guarded so stale sources can't knock out a working map.
  - Hierarchy in both detail screens: labeled **Area** / **Address** rows with tinted icon chips, full-width **Open in Maps** CTA, raw coordinates demoted to an 11px centered caption.
  - Tests: `test/fixes.test.js` **44/44 passing** (added GEO-6 asserting the CSP allows tile hosts). Frontend `tsc` clean.
- 2026-09-18 — **FINAL PRODUCTION VERIFICATION + fixes for the 2 found defects** (not yet committed).
  - Ran 49-check read/write probe vs live production API; **47 PASS**, 2 genuine defects found.
  - Verified live: deploy guard (status transitions), assignment (env-admin-only, 404 on FacultyAdmin/nonexistent, 400 on inactive, notification recipient/recipientModel), report by-id scope, department scope, dept/faculty audit attribution, audit endpoint matrix, malformed-filter hardening. Report: `doc/PRODUCTION_VERIFICATION_REPORT.md` (doc/ is gitignored).
  - **Defect 1 (fixed):** `report/service.js` list-scope bypass — `query.faculty` overwrote the enforced faculty scope. Now gated to `environmentalAdmin` only.
  - **Defect 2 (fixed):** `System`-attributed audit rows on admin actions. Added real `actorModel` to report deletion (`report/service.js` + controller) and student import/batch/delete (`student/service.js` `roleToActorModel` + controller); grep confirms no remaining audit calls omit actorModel.
  - Tests: `test/fixes.test.js` now **25/25 passing** (added PV-L2, PV-L2b, PV-A1..A3 regression tests); evidence `security-tests/evidence/production-defects-fix-test-run.txt`.
  - Residual: push-to-device delivery unverifiable (no device tokens); PV-30/PV-34 harness artifacts resolved as PASS (faculty account name is "SICT Faculty Administrator"; audit-logs `data` is an array).
- 2026-09-18 — **Administrative responsibility fixes** (commit `b481e1b`, pushed; auto-redeploy on Render).
  - Report assignment targets active EnvironmentalAdmin only (`recipientModel: 'EnvironmentalAdmin'`).
  - `getReportByIdService` faculty-scopes facultyAdmin/departmentAdmin, ownership-scopes students.
  - `authorizeFaculty` resolves target department's faculty from DB (client faculty no longer trusted).
  - Status transitions enforced backend + frontend (only valid next action shown).
  - Audit log actor attribution: real actor/actorModel/actorName for department & faculty CRUD/deletes.
  - Audit GET hardened: regex-escaped `search`, validated `dateFrom/dateTo`, `fullName` actor lookup.
  - Added `test/fixes.test.js` — **20/20 passing**; evidence `security-tests/evidence/admin-fixes-test-run.txt`.
  - Reports: `doc/ADMINISTRATIVE_ROLE_FIXES_REPORT.md`, `doc/TECHNICAL_STRUCTURE_REPORT.md` (12 standalone Mongoose models; embedded `images[]/statusHistory[]/timeline[]`).
- Prior: audit-log 500 fix (`6204370`) — user confirmed live page no longer crashes.

## Open / blocked items
- After new commit deploys on Render, testers must **hard-refresh** the app.
- Push notifications need real device tokens + Expo project token; DB notification layer verified.
- iOS device distribution blocked (no $99 Apple Developer Program account).
- Thesis Chapters 4/5 not yet updated (pending verified test evidence).