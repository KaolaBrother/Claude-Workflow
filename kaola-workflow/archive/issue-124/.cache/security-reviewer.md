security-reviewer: N/A

File-risk scan result:
- package.json: config manifest, no security surface
- scripts/validate-kaola-workflow-contracts.js: uses existing parseJson() helper (read-only local fs access, same-project, already present); no new security surface
- docs/agents-source.md: documentation only
- CHANGELOG.md: documentation only

No auth, payments, user data, external API calls, secrets, or OWASP-relevant patterns in any modified file.
