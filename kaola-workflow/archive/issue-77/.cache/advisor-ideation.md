# Advisor Gate — issue-77 ideation

## Verdict
Ship Approach A. B is scope creep, C is the correct follow-up. No missed approaches.

## Gotchas for Phase 3

### 1. AC #1 requires an explicit user-ask in kaola-workflow-next startup
The AC says startup "records a delegation policy in workflow-state.md OR blocks to request explicit user authorization when needed." Approach A is prose-only, which means the new `kaola-workflow-next/SKILL.md` section must explicitly instruct the agent to ASK the user for delegation authorization at startup — not just "state the policy." Phase 3 must lock the exact instruction language.

### 2. Validator needle trap: `invoked` is a substring of `subagent-invoked`
`assertNotIncludes(skill, 'invoked')` cannot work. Use:
- Positive assertions: `assertIncludes(skill, 'subagent-invoked')` + `assertIncludes(skill, 'local-fallback-explicit')`
- Negative assertions ONLY for the prose phrases: `assertNotIncludes(skill, 'when subagents are available')`, `assertNotIncludes(skill, 'otherwise perform the same')`
- Drop the planner's promise of negative `invoked` assertion — it's not cleanly implementable

### 3. Execute-skill phrasing is the odd one out
`kaola-workflow-execute/SKILL.md:8` uses a different phrase: `"Use the current Codex session as the fallback executor when session policy, availability, or user direction prevents delegation"`. Phase 3 must explicitly enumerate:
- Its replacement prose
- Its own negative needle (`"Use the current Codex session as the fallback executor"`)

### 4. Self-report limitation — document explicitly
Any token in the new vocab is still self-reported. The improvement is forcing the agent to consciously choose a non-`subagent-invoked` value rather than reflexively writing `invoked`. Record as acknowledged limitation in phase2-ideation.md, not a hidden one.

## Risk assessment
Risks are accurate. "Self-report" applies to the entire new vocabulary. Approach A's value is typing enforcement, not behavioral verification.
