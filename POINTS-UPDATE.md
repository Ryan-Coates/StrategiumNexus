# Updating 11th edition points and rules

## What is stored

- Official publisher: <https://mfm.warhammer-community.com/en>.
- `Data/11th/mfm-points.json` is the downloaded, structured points snapshot.
  It records the download timestamp, faction page versions, source URLs, unit sizes,
  mixed-model compositions, copy-number price brackets, paid wargear, and
  detachment DP costs, Unique tags and enhancement prices. It also retains the original price labels.
- `Data/11th/points-overrides.json` contains explicitly reviewed datasheet-to-points
  mappings. An empty file is valid.
- `Data/11th/points-match-report.json` lists unmatched datasheets, enhancements,
  detachments without verified costs, and official detachments without CSV rules.
- `public/data/wh40k11e.json` is generated from the snapshot and the supplied CSVs.
  The app loads this static file; there is no server or runtime scraping.
- `public/data/wh40k11e-version.json` contains the SHA-256 revision of that
  generated rules file. Publish both files together.

## Local rules cache

The rules viewer and roster builder share a persistent IndexedDB cache in
`strategium-nexus-11e-rules`, separate from armies and downloaded BSData.
The first visit downloads and verifies the full rules file. Subsequent page
loads check only the small version manifest and read unchanged rules directly
from IndexedDB; they do not download the full JSON again. Within a page, callers
share the same in-memory load.

`build:11e` regenerates the revision from the complete file contents, so any
rules, points or importer change invalidates the cache, even on the same day.
The loader verifies the download against the published hash before replacing
the cached snapshot. Publish the generated JSON and version manifest together;
a partial deployment cannot replace a good cache with mismatched data.

If the network is unavailable, the last valid cached rules remain usable, with
a browser-console warning that refreshing failed. The version check times out
after five seconds. This caches rules data, not the application shell; it is not
a full offline installation. If browser storage is blocked/full, a valid network
load still works and the console explicitly warns that caching is unavailable.
Clearing browser data removes the cache, so the next load downloads again.

The current official points site and supplied CSV export do not describe exactly
the same set of unit/detachment names. Do not equate similarly named units without
reviewing their rules. The importer does **not** invent rules or fuzzy-match names.

## Refresh official points

From PowerShell:

```powershell
Set-Location C:\www\StrategiumNexus

# Only needed after pulling dependency changes, or on first setup:
docker run --rm -v "c:\www\StrategiumNexus:/app" -w /app node:20-alpine npm install

# Refresh the dev image if dependency manifests have changed.
docker compose -f c:\www\StrategiumNexus\docker-compose.yml build dev

# Downloads every faction linked by the official English index, sequentially.
docker compose -f c:\www\StrategiumNexus\docker-compose.yml run --rm dev npm run update:points

# Rebuild the app-ready data and match report from the local snapshots.
docker compose -f c:\www\StrategiumNexus\docker-compose.yml run --rm dev npm run build:11e

# Run focused importer/pricing tests, then the required checks.
docker compose -f c:\www\StrategiumNexus\docker-compose.yml run --rm dev npm run test:11e
docker compose -f c:\www\StrategiumNexus\docker-compose.yml run --rm dev npm run lint
docker compose -f c:\www\StrategiumNexus\docker-compose.yml run --rm dev npm run build
```

The updater fails on HTTP errors, missing pricing markup, unresolved streaming
slots, and duplicate identifiers. It only replaces the points snapshot after all
faction pages have been downloaded and parsed successfully. A failed run leaves
the previous snapshot in place. No deploy should be recommended until lint and
build succeed.

The HTML cache in `Data/11th/mfm-cache/` is ignored by git. To debug a parser change
without requesting the publisher again, run `npm run update:points -- --offline`
in the same Docker environment. This requires a previous complete download and
preserves the original snapshot timestamp; it does not fetch new points.

## Review matches before publishing

1. Compare the new snapshot and `points-match-report.json` with the previous data.
2. Verify a few prices directly against the linked official faction pages,
   including later-copy costs, multi-size squads, and paid wargear.
3. Check unmatched units. Many are Legends or old/renamed datasheets. Unknown
   prices display explicitly and make roster totals incomplete, not zero.
4. If a datasheet really corresponds to an official entry despite a name
   difference, copy its exact official entry ID into `points-overrides.json`:

   ```json
   {
     "datasheets": {
       "<CSV datasheet ID, preserving leading zeros>": "<exact id from mfm-points.json>"
     }
   }
   ```

   These placeholders are documentation only. Do not add a mapping based solely
   on a similar name. Invalid IDs fail the build.

5. Re-run `build:11e`, `test:11e`, lint, and build after changing mappings.
6. Review the refreshed JSON, match report, mapping file, and any source/parser
   changes together. Production builds regenerate app data but **do not** fetch
   the network, so builds remain reproducible from the saved snapshot.
7. Refresh the browser to load the new snapshot. Already-open tabs keep their
   loaded snapshot until refreshed.

## Refresh the rules CSV export

Replace the complete related set of pipe-delimited CSV files in `Data/11th/`,
preserving their headers, leading-zero identifiers, and UTF-8 encoding. Run
`build:11e` and the checks above. Model profiles, weapons, written restrictions,
unit eligibility links, detachment abilities, and enhancements come from this
export, not from the points site.

`isLegends` is generated on each datasheet from its source record's Legends
designation, or from a matched official Legends section. It is not inferred from
flavour text (the CSV `legend` column is lore, **not** a Legends status flag).
Legends are hidden by default in the datasheet viewer and builder add-unit list.
Showing or hiding them never deletes saved army units.

## Using and retaining rosters

Use **Warband Forge → New 11th edition army**, or **Build an 11th edition army**
from the rules viewer. Set the army name, faction, battle size and points limit,
then add one or more detachments.
Add units, choose their published size/composition, then configure wargear,
enhancements, optional names/descriptions, and optional images.

- Use **Save army** or **Save and view rules**. Changes are not auto-saved.
- Armies and resized unit/army images are stored in the separate IndexedDB
  database `strategium-nexus-11e-rosters`; existing BSData armies are untouched.
  Data is local to this browser and origin. Clearing browser data deletes armies;
  it does not sync to another device.
- Costs recalculate from the currently loaded official snapshot. Later copies
  of a datasheet may cost more; deleting a copy recalculates those remaining.
- Paid wargear quantities must be checked separately, including equipment in a
  default loadout. Totals remain incomplete until this check is confirmed.
- Manual base-unit and enhancement overrides are explicitly labelled. They are
  retained through future points updates until cleared by the user.
- Enhancement choices are constrained by the CSV's unit eligibility links and
  all selected detachments. Removing a detachment clears only enhancements that
  no longer qualify, after confirmation. Changing faction clears the draft's
  units after confirmation.
- Wargear counts are whole-unit allocations. Record model-specific allocation
  and non-weapon options in the notes. Written restrictions, chapter/ally rules,
  model-specific limits and complete army legality are **not** automatically
  adjudicated from prose. The builder is not a full competitive legality checker.

## Multiple detachments and army view

The official **Muster Armies** panel on the
[Munitorum Field Manual](https://mfm.warhammer-community.com/en/adeptus-custodes)
defines these separate budgets:

| Battle size | Unit/enhancement points | Detachment Points (DP) | Enhancement limit |
|---|---:|---:|---:|
| Incursion | 1,000 | 2 | 2 |
| Strike Force | 2,000 | 3 | 4 |

Incursion has an explicit exception: a single 3 DP detachment can be selected
as the army's **only** detachment. Changing the custom points limit does not
silently change the selected battle size's DP budget.

- DP never increases the unit-points total. Each selected detachment displays its
  own cost, with a separate army DP subtotal and budget.
- The same detachment cannot be selected twice. Roster checks flag selections
  that exceed the DP budget or share an official Unique tag.
- CSV detachments are matched by exact normalized name and faction. Current MFM
  detachments missing from the CSVs are also listed, clearly marked **rules not
  supplied**: their costs/Unique tags are known, but their abilities, stratagems
  and unit enhancement eligibility are not invented. Import updated CSV rules
  to make those rules available.
- Boarding Actions entries are a separate game format: they never inherit a
  standard-army DP cost just because they share a detachment name.
- Old CSV detachments without an exact official match display **DP unknown**.
  Their DP subtotal is incomplete until resolved. A reviewed manual DP override
  is available and labelled; it does not verify Unique tags or other restrictions.
- Enhancements unlock army-wide from all selected detachments; units are not
  assigned to detachments. The army view gathers selected detachment rules
  together, includes general and all selected-detachment stratagems, and groups
  units into collapsible battlefield-role sections with point subtotals.
  Sections have a consistent order: Characters, Battleline, Dedicated
  Transports, Other, Fortifications, then unclassified units. Within each
  section, units are alphabetized by datasheet name with copies kept together.
  Custom unit names do not split copies apart. View sorting never changes saved
  army order or later-copy pricing.
- Saved single-detachment armies are normalized on read without deleting or
  recreating IndexedDB. Names, descriptions, images and unit choices are kept;
  saving persists the new format. Legacy 1,000/2,000-point armies get the
  corresponding battle size; other sizes require an explicit choice.
- Enhancement-limit and duplicate warnings use supplied eligibility data.
  Upgrade exceptions, required/excluded units or detachments, Force Dispositions,
  and other prose restrictions still require review against the official rules.

## All-factions unrestricted lists

Choose **All factions (unrestricted)** in the army faction selector to make a
collection/list using units from every faction, without selecting detachments.
There are no faction, detachment, enhancement-eligibility, duplicate-enhancement
or army-points-limit checks. All supplied enhancements are available; normal
cost calculation and explicit unknown-pricing warnings remain, so unknown does
not mean free. The points target is for reference only. Legends can still be
shown/hidden in the picker without removing saved units.

Switching an existing army to All factions preserves its units, names, notes,
images and enhancements; it removes detachments and their manual DP overrides
after confirmation. Switching back to a normal faction uses the existing
confirmation to clear units, preventing an accidentally mixed restricted army.
Unrestricted saved lists retain this mode when reopened. Their army view uses
the same ordered type groups, includes faction labels on units and general
stratagems only, and never shows detachment rules or DP budgets.
