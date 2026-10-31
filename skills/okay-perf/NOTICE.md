# Notice

okay-perf adapts ideas from the following works. The text here is condensed and rewritten, not copied.

| Source | Used for |
|---|---|
| Emery Berger, "Performance Matters", Strange Loop 2019 (talk, joint work with Charlie Curtsinger) | Layout effects of up to 40% from link order, environment size and working directory; Stabilizer's re-randomization and why it makes times near-normal; t-test and ANOVA across a suite; profilers show where time goes, not what matters; causal profiling with virtual speed-ups, Coz, progress points, Little's law for latency; the small-change case studies |
| [pstack](https://github.com/cursor/plugins/tree/main/pstack) by poteto, `skills/benchmark-checklist`, `skills/poteto-mode/playbooks/perf-issue.md` and `hillclimb.md` (MIT), Copyright (c) 2026 Lauren Tan | The seven benchmark questions, interleaved A/B, verdict-first reporting and the Inconclusive rules; the performance mantras in order; one change, one measurement, keep or revert; a frozen harness that prints error and work counts |
| [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) `performance-optimization` and `references/performance-checklist.md` (MIT), Copyright (c) 2025 Addy Osmani | Same conditions before and after, cold against warm cache, neutral means revert, correctness gates the metric, the attempt ledger |
| [ayghri/i-have-adhd](https://github.com/ayghri/i-have-adhd), Copyright (c) 2026 Ayoub Ghriss | Condensed output style in `shared/output-style.md` |

## MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
