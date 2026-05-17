# TDD Task A — Bug 2: existsSync Guard

## Result: GREEN

## Change
File: `scripts/kaola-workflow-classifier.js`
Insert at line 267 (after `projectDir` derivation):
```js
if (!fs.existsSync(projectDir)) continue;
```

## Validation
```
node scripts/simulate-workflow-walkthrough.js
```
Exit 0. "Workflow walkthrough simulation passed"

## Plugin Mirror
```
diff scripts/kaola-workflow-classifier.js plugins/kaola-workflow/scripts/kaola-workflow-classifier.js
```
Zero output — byte-identical.

## Deviations
None. Write set: scripts/kaola-workflow-classifier.js + plugin mirror only.
