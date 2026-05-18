Advisor plan gate for issue #87.

The plan is sound if it keeps the GitLab patch narrow and proves behavior with GitLab-local tests. Add validator checks for helper names because issue #87 explicitly cites implementation guarantees, and the GitHub contract validator already checks these names on the GitHub side.

Revision before implementation: include the acceptance-criterion detail that explicit `init-issue --update` is the only update path and must report `updated` accurately.
