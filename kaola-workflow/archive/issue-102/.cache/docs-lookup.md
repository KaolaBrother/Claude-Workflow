# Docs Lookup Notes - issue-102

Status: N/A

No external documentation lookup is needed. The defect is local behavior in Kaola's installer: duplicate TOML table injection caused by appending a template block into a target config that already contains `[features]`.
