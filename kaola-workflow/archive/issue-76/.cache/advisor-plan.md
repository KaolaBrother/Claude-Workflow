# Advisor Plan Gate: issue-76

Plan is dependency-safe if vendored files are generated before validator execution and installer verification accepts user-owned conflict skips. The manifest should track the destination file hash after each successful managed install. On upgrade, overwrite only when the destination hash equals the recorded prior hash.

The test plan should include a user-added agent preservation check for `uninstall.sh --forge=all`.
