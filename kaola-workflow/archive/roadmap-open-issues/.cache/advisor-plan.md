Advisor plan gate performed locally.

Verdict: proceed.

Required revisions before implementation:
- Add explicit issue-to-evidence mapping in Phase 6 so closing issues is justified by concrete tests.
- For #19, prefer classifier remote awareness over only retrying bootstrap after yield, because it avoids creating extra transient GitHub claims.
- For #18, preserve manual release behavior; only tiebreaker-yield and ticker-late-yield should skip remote issue cleanup.
- For #21, checkout the requested branch immediately after fetch and before merge-base calculation.
- For #16, plugin-local script copies must include the final patched script content.
