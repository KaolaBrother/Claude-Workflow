# TDD Task B — Bug 1: Generalize Regex + Remove COARSE_AREAS + Tests 6H/6I

## Result: GREEN

## Changes to scripts/kaola-workflow-classifier.js

### FILE_PATH_REGEX (line ~122)
OLD: `/(?:^|[^A-Za-z0-9_./-])((?:plugins\/kaola-workflow|scripts|commands|hooks|kaola-workflow)(?:\/[A-Za-z0-9_.-]+)*\/[A-Za-z0-9_.-]*[A-Za-z0-9_-])/g`
NEW: `/(?:^|[^A-Za-z0-9_./-])([A-Za-z0-9_-]+(?:\/[A-Za-z0-9_.-]+)+)/g`

### AREA_PATH_REGEX (line ~123)
OLD: hardcoded alternation
NEW: `/(?:^|[^A-Za-z0-9_./-])([A-Za-z0-9_-]+)\/(?=$|[^A-Za-z0-9_./-])/g`

### COARSE_AREAS: Deleted entire block (~10 lines)

### extractCoarseAreas: Removed COARSE_AREAS.has() guards
- for-loop: `if (COARSE_AREAS.has(area)) areas.add(area);` → `areas.add(areaForPath(filePath));`
- while-loop: `if (COARSE_AREAS.has(area)) areas.add(area);` → `if (area) areas.add(area);`

## Tests Added

### simulate-workflow-walkthrough.js
- Case 6H (after 6G ~line 1136): host-path src/foo.ts overlap → red
- Case 6I (~line 1170): ghost lock with missing projectDir + issue 51 candidate → green
  - NOTE: Uses issue 51 (not 50) as candidate — issue 50 is the ghost lock number; using 50 as candidate triggers early-exit (already-claimed path). Issue 51 correctly exercises the existsSync skip.

### plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js
- Semantic mirrors of 6H and 6I added after Case 5e2 block

## RED evidence
Before implementation: `Error: Epic Case 6H: exact file path overlap on host-project path must yield red, got green`

## GREEN evidence
`node scripts/simulate-workflow-walkthrough.js` → exit 0
"Workflow walkthrough simulation passed"
Existing 6A–6F, 6C2–6C5, 6G all still pass.

## Plugin Mirror
`diff scripts/kaola-workflow-classifier.js plugins/kaola-workflow/scripts/kaola-workflow-classifier.js` → zero output

## Deviations
- Case 6I uses issue 51 (not 50) as candidate — justified (issue 50 is ghost lock number; using 50 as candidate triggers early-exit unrelated to existsSync fix)
