# Security Review: codex-parity Phase 4

## Overall Verdict: No CRITICAL or HIGH findings. Three LOW defense-in-depth notes.

## LOW Findings

### LOW-S1: pick.project in path construction before parent-side isSafeName
File: scripts/kaola-workflow-claim.js, lines 314-321
`pick.project` is passed as --project to child claim (which validates via isSafeName), but `path.join` for cacheDir runs after execFileSync (line 319). If execFileSync throws, cacheDir write is unreachable — safe today. But parent path ops should not rely on child validation. Add `assert(isSafeName(pick.project), ...)` before path.join.
In practice: `roadmap.js project-name` subcommand is unimplemented (dispatcher has no case), so the try/catch always falls to `'issue-' + N` fallback. Value is always safe at runtime, but defense-in-depth recommended.

### LOW-S2: args.runtime has no whitelist validation
File: scripts/kaola-workflow-claim.js, lines 92, 260, 315
No shell interpolation; stored only in JSON lock file. Risk exists if future consumers use runtime value in path/command. Should add `claude|codex` whitelist in validateClaimArgs.

### LOW-S3: Dead code — project-name subcommand missing from roadmap.js
File: scripts/kaola-workflow-claim.js, lines 281-283; scripts/kaola-workflow-roadmap.js lines 211-218
`project-name` is not in the roadmap dispatcher. The try/catch always falls to `'issue-' + N` fallback. If `project-name` is ever implemented with untrusted GitHub issue title content, parent-side isSafeName guard (LOW-S1) becomes critical.

## Non-Issues Confirmed Safe
- classifierScript from __filename: safe (not user input)
- String(N) in subprocess args array: safe (no shell, N is JSON number)
- pick.verdict === 'yellow' controlling file append: safe (no path interpolation)
- JSON parsing: both in try/catch with safe error defaults
- Error swallowing in runBootstrapSweep/WatchPr: intentional best-effort behavior
- OFFLINE guard in listOpenIssues: correct (first line of function)
- SKILL.md files: no hardcoded credentials
- Case 5 temp dir cleanup: correctly in finally block
