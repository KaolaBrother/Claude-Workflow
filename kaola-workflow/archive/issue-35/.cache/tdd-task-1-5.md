# tdd-guide Task 1-5 — claim.js core priority ranking

## Tasks Executed
1. PRIORITY_TIER_BY_LABEL constant — inserted at line 12
2. parsePriorityTier helper — inserted before sortIssueRecords
3. readPriorityConfig helper — inserted before parsePriorityTier
4. sortIssueRecords extended with opts parameter and priority tier sort key
5. cmdStartup wired with topTierLabels (5a), re-sort (5b), ranking array (5c), ranking in all three writeStartupReceipt calls (5d/5e/5f)

## Advisor Verifications
- V1 (HOME isolation): Verified — Epic Case 14 sets `HOME: startupTmp` in env; Tasks 14a/14b will mirror this pattern
- V2 (re-sort placement): Verified — runStartupClaimFirstAvailable at line 1263 receives issueFetch.issues AFTER re-sort at line 1224-1226; no pre-captured const reference

## Validation
Command: `node scripts/simulate-workflow-walkthrough.js`
Result: exit 0, "Workflow walkthrough simulation passed"
