# Notice

okay-dev adapts ideas from the following MIT-licensed works. The text here is condensed and rewritten, not copied.

| Source | Used for |
|---|---|
| [pstack](https://github.com/cursor/plugins/tree/main/pstack) feature playbook (`skills/poteto-mode/playbooks/feature.md`), Copyright (c) 2026 Lauren Tan | Throughput checkpoint (blocking first steps, independent workstreams, shared mutable state; inapplicable items kept as `n/a`) |
| [pstack](https://github.com/cursor/plugins/tree/main/pstack) playbooks `investigation.md`, `refactoring.md`, `session-pickup.md`, `pause-safely.md`, `multi-phase-plan.md` (under `skills/poteto-mode/playbooks/`) and the `how` and `why` skills, Copyright (c) 2026 Lauren Tan | The five files under `playbooks/`: read-only cited answers and history as the source for why; pin the behaviour, subtract first, migrate callers then delete; resume from the trail without redoing it; stop at a safe boundary with a resume note; one PR per verifiable phase |
| [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) `planning-and-task-breakdown`, Copyright (c) 2025 Addy Osmani | Task size table (XS to XL, split L and larger) in `shared/lanes.md` |
| [ayghri/i-have-adhd](https://github.com/ayghri/i-have-adhd), Copyright (c) 2026 Ayoub Ghriss | Condensed output style in `shared/output-style.md` |
| [pstack](https://github.com/cursor/plugins/tree/main/pstack) `skills/poteto-mode` (Autonomy section and the full-autonomy grant), `skills/principle-never-block-on-the-human`, `skills/show-me-your-work` and `docs/guide/07-overnight.md`, Copyright (c) 2026 Lauren Tan | Autonomy grant, always-pause list, safest default for a user-only call, and the one-line-per-decision trail in `shared/autonomy.md` |
| [pstack](https://github.com/cursor/plugins/tree/main/pstack) playbooks (`skills/poteto-mode/playbooks/autonomous-run.md`, `autopilot-full.md`, `autopilot-stack.md`, `orchestrate.md`, `babysit.md`, `shipping.md`), Copyright (c) 2026 Lauren Tan | `playbooks/autopilot.md` (exit condition, one owner per PR, review on every head, stack variant without merging), `playbooks/babysit.md` (modes, conflicts then threads then CI, sceptical triage of bot comments), `playbooks/shipping.md` (green is not safe, the contiguous verified run from the root, land bottom-up) |
| [pstack](https://github.com/cursor/plugins/tree/main/pstack) by poteto, `skills/principle-*` and the Principles index in `skills/poteto-mode/SKILL.md`, Copyright (c) 2026 Lauren Tan | The engineering principles in `shared/principles.md`: 23 of the 24 principles merged into 20 entries, one (exhaust the design space) dropped, rewritten, each with a trigger; name a principle only with the decision it changed |
| [pstack](https://github.com/cursor/plugins/tree/main/pstack) by poteto, `agents/poteto-agent.md` and the Subagents section of `skills/poteto-mode/SKILL.md`, Copyright (c) 2026 Lauren Tan | The `okay-agent` delegate (`agents/okay-agent.md`): read the skill and its principles in full before any work, at the absolute path the parent passes |

## MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
