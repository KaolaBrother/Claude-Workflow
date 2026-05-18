# Advisor Ideation Gate - issue-55

## Review

The selected minimal skeleton strategy is the correct first step. It preserves the dependency graph and prevents later issues from racing over missing directories or manifests.

## Hidden Risks Checked

- Empty GitLab source directories can break current installer verification. Mitigation: add a skeleton-only allowance and message.
- Same slash command names can collide in manual installs. Mitigation: document choose-one and use separate support dirs.
- Manifest homepage/repository metadata may still point to this GitHub-hosted repository. Mitigation: forbidden-reference checks should target runtime/prose surfaces, not manifests.
- Copying GitHub commands/scripts too early would create false confidence and likely run `gh` from a GitLab install. Mitigation: #55 only scaffolds; #56/#57 own runtime content.

## Recommendation

Proceed with Option A: minimal skeleton, manifest entries, forge-aware install/uninstall, and no-op GitLab test placeholder. Do not implement production `glab` behavior in #55.
