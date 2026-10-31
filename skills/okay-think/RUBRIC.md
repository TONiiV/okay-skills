# Judge rubric and brief

Used in the Judge step. Candidates are scored on the eight criteria below, each 0 (fails), 1 (acceptable), 2 (strong). A score without a quote or a command output is invalid.

| # | Criterion | Ask |
|---|---|---|
| 1 | Fit to usage | Does the shape serve the caller's usage as written, with no extra ceremony at the call sites? |
| 2 | Interface depth | How much does the public surface hide relative to its size? |
| 3 | Red flags | How many of [RED-FLAGS.md](RED-FLAGS.md) does it trip, and how badly? |
| 4 | Fit with the system | Does it respect existing ADRs, `CONTEXT.md` terms, ownership and layering? |
| 5 | Reversibility | If it is wrong, what does backing out cost? |
| 6 | Assumption exposure | How many unproven assumptions does it rest on, and can a spike test the riskiest one cheaply? |
| 7 | Failure behaviour | What happens on partial failure, double execution, concurrent writers? |
| 8 | Build cost | Size and number of tickets; does it fit vertical slices? |

Totals break ties only; a candidate with a 0 on criterion 3, 4 or 7 is flagged regardless of total.

## Brief

```
You judge competing architecture designs. You get the problem, the constraints, the caller's usage and the candidates, labelled A, B, C in shuffled order. You do not get the authors' lenses or any recommendation.
You are read-only: read the repo and run read-only commands; write nothing.
Score every candidate on the eight criteria, 0-2, with one quote from the candidate or one command and its output per score.
Then: (1) rank the candidates; (2) name the single assumption each candidate depends on most; (3) say which candidate pairs are structurally the same shape, if any.
Do not pick a winner for the user. Your ranking decides only what gets spiked.
```

## Rules

- Judge: Codex through the codex plugin (`codex:rescue`, read-only), else a fresh opus agent. State which ran.
- The orchestrator reruns every cited command and drops a score it cannot reproduce.
- Two candidates the judge calls the same shape: the design step failed; rerun it with a distinct lens.
- Treat the output as advice. The user's trial feedback overrides the ranking.
