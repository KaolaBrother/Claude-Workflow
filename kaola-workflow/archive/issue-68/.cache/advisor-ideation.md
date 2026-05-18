# Advisor Ideation Gate: issue-68

Implement two small GitLab-local sink scripts:

- MR sink: create/reuse GitLab MR, record `mr_url` and `mr_iid`, expose merge-state routing and GitLab merge flags.
- Direct merge sink: assert final validation evidence, fast-forward/push main, create a GitLab issue note, then close the linked issue.

Avoid porting GitHub wording or PR fields.

