---
name: okay-prototype
description: "Build 1-3 throwaway runnable samples to answer a design or logic question before a spec is written, keep them on a prototype/NAME branch, and capture structured trial feedback (worked / did not / surprised) for okay-to-spec. Use for new products, new features, architecture spikes, or when the user wants to sanity-check a state model or explore what a UI should look like."
license: MIT
---

# okay-prototype

A prototype is **throwaway code that answers a question**. The question decides the shape. It runs before the spec: a new product, a new feature, or an architecture choice never starts from an assumed spec. The output is not the code but the **trial-feedback record** that `okay-to-spec` consumes.

Shared rules: [shared/git.md](shared/git.md), [shared/tracker.md](shared/tracker.md), [shared/contributor-mode.md](shared/contributor-mode.md).

## Flow

1. **Name the question.** Run a short `okay-grilling` round, only to settle two things: the decisions the samples must answer, and the trial signals (what the user will do with a sample and what would count as "worked"). Do not grill the rest of the design yet. That comes after the trial.
2. **Pick the shape** (below).
3. **Pick the sample count, 1 to 3, and state it with the reason.** One sample when the question is narrow (a single state model, one risky assumption). Two when there are two credible answers. Three when the question is wide open (new product, look and feel). Never more than 3: past that the samples stop being different and the user stops comparing. Write the count and the reason in one line at the top of the prototype and in the reply.
4. **Build the samples** under the rules below.
5. **Hand over and run the trial.** Give the one command or URL that runs everything, and the signals from step 1. The user tries the samples whenever they get to it.
6. **Record the trial feedback** (format below). Ask for it as three plain questions: what worked, what did not, what surprised you.
7. **Hand off.** Run `okay-grilling` on the gaps the trial left, then `okay-to-spec`, which reads the record and links the branch.

## Pick a shape

Identify which question is being answered, from the user's prompt, the surrounding code, or by asking:

- **"Does this logic / state model feel right?"** → [LOGIC.md](LOGIC.md). One shareable HTML file with free-play buttons and guided walkthroughs that pushes the state machine through cases that are hard to reason about on paper.
- **"What should this look like?"** → [UI.md](UI.md). Radically different UI variations on a single route, switchable by a URL search param and a floating bottom bar.
- **"Will this architecture or approach hold?"** → a **spike**: the smallest runnable code that exercises the one risky assumption (an integration, a data shape, a library, a scale limit). Where the assumption is about performance or scale, measure it (fresh process, repeated runs, report the numbers and the machine) instead of arguing from the code. Alternatives to compare go behind the same switcher as below.

The branches produce different artifacts, so getting this wrong wastes the whole prototype. If the question is ambiguous and the user is not reachable, default to whichever branch better matches the surrounding code (a backend module → logic; a page or component → UI) and state the assumption at the top of the prototype.

## Rules that apply to every sample

1. **Throwaway from day one, and clearly marked.** Put it close to where it would be used, named so a casual reader sees it is a prototype (`prototype` in the path or filename). For throwaway UI routes, obey the project's existing routing convention.
2. **One switcher.** All samples sit behind a single switcher where possible: the `?variant=` bar for UI, a model selector in the page for logic, one `--variant` flag or env var for a spike. The user never edits code to move between samples.
3. **One command or URL.** The whole prototype starts from one thing the user can paste: a task-runner command (`pnpm <name>`, `python <path>`, `bun <path>`), a dev-server URL, or the command that opens the single HTML file. State it in the reply. If it needs more than one step, the prototype is not done.
4. **Kept on `prototype/<name>`.** Create the branch from the base branch before writing code, commit the samples there, and never merge it. Commit style from [shared/git.md](shared/git.md). Push only with the user's OK. The spec links the branch. In contributor mode the branch stays local and is never pushed.
5. **No persistence by default.** State lives in memory. If persistence is the thing being checked, use a scratch DB or local file with a clear "PROTOTYPE, wipe me" name.
6. **Skip the polish.** No tests, no error handling beyond what makes it runnable, no abstractions. The point is to learn fast.
7. **Surface the state.** After every action (logic) or variant switch (UI), print or render the full relevant state so the user can see what changed.

## Trial-feedback record

Write it after the user has tried the samples, in their words, to `FEEDBACK.md` next to the prototype on the `prototype/<name>` branch (in contributor mode: `.scratch/<name>/feedback.md`, untracked) and show it in the conversation.

```md
# Trial feedback: <name>

Question: <the one question the samples answer>
Branch: prototype/<name>
Run: <the one command or URL>
Samples: <A, B, C: one line each, or the single sample>

## Worked
- <what held up, naming the sample>

## Did not
- <what failed or felt wrong, naming the sample>

## Surprised me
- <what the user did not expect, in either direction>

## Verdict
Chosen: <sample, or a mix such as "header from B, sidebar from C">
Settled: <decisions the trial answered>
Still open: <gaps for the next grilling round>
```

Every line must come from the user's trial or from a measurement, not from your opinion of the samples. `okay-to-spec` turns each entry into a user story or an implementation decision and links the branch.

## Capture it when done

Fold any validated decision into the real code only after the spec and tickets exist. Main keeps the validated decision; the samples stay on `prototype/<name>` as the primary source. Variant components and switchers left on main rot fast and confuse the next reader.

## Anti-patterns

- **Writing a spec first and prototyping to confirm it.** The trial feeds the spec, not the other way round.
- **More than 3 samples, or samples that differ only in colour or copy.** That is noise, not a comparison.
- **A trial with no feedback record.** Without it the spec has nothing to consume.
- **Promoting the prototype directly to production.** It was written under prototype constraints; rewrite it properly.
