# Repo doc layout

Each kind of knowledge has one home:

| File | Holds |
|---|---|
| `AGENTS.md` | How to work in this repo: layout, build, test, commit/PR rules |
| `CLAUDE.md` | Only the line `@AGENTS.md` |
| `CONTEXT.md` | Glossary of domain terms only |
| `docs/adr/` | Decision records (reuse an existing `docs/decisions/` instead) |
| `CONSTRAINTS.md` | Optional: quality bar and perf budgets. Each numeric budget should have a CI check that fails when it is exceeded |
| `docs/perf/` | Perf baseline reports, `<date>-<topic>.md` |
| `docs/models/` | Model-check models (TLA+, PlusCal, Alloy), `<system>/`, each with its re-run command |

Specs and tickets live in the tracker (see [tracker.md](tracker.md)), not in the repo. Contributor mode writes none of these files.
