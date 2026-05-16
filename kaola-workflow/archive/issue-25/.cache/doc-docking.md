# Documentation Docking - issue-25

## Verdict

DOCKED

## Changed Behavior

- Startup receipts are now verified by `verify-startup` before phase work.
- Normal handoff is guarded by `can-handoff` and default `handoff` rejection when
  live owner evidence exists.
- Successful handoff writes an owned startup receipt for the recovering session.
- Routers stop on `claim: "none"` unless explicit recovery is requested.

## Docked Surfaces

| Surface | Status | Evidence |
|---------|--------|----------|
| README | docked | Multi-session support and release versioning updated |
| CHANGELOG | docked | 3.1.8 / Codex 1.1.8 entry added |
| Claude commands | docked | `workflow-next` and phase guards updated |
| Codex skills | docked | router and phase skills updated |
| Validators | docked | root and packaged contract assertions updated |
| Roadmap | docked | issue #25 removed from active roadmap during finalization |

## Not Applicable

- `.env.example`: no environment variable contract changed.
- API docs: no public API docs exist for this script surface.
