# Model-check spike

Used by step 7 of [SKILL.md](SKILL.md) when the risky assumption lives in a **state machine** (an order, a session, a document workflow, a game or story state) or in **concurrency** (two actors, retries, webhooks or jobs that can race). People and agents walking through such a machine by hand miss state combinations; a model checker tries all of them. One of the 1 to 3 spikes is then a model check.

## 1. Write the model

A small model of the design, not of the code: the states, the events, the guards on each transition, and the actors that can act at the same time.

- Language: **TLA+** or **PlusCal** (checked with TLC) for transitions, interleavings and liveness; **Alloy** (Alloy Analyzer) when the question is about data shape and relations. Use one the team already knows when there is one.
- Names come from `CONTEXT.md`, so the model reads like the design.
- Keep it bounded: 2 or 3 actors, small constants. A model the checker cannot finish answers nothing.
- One model per candidate when the spike compares designs, run behind the same switcher as the other spikes (for example one `.cfg` per variant).

## 2. Write down what it checks

Before the first run, list in the model's header comment:

- each **invariant** as one plain sentence plus its formula (for example "an order is never both shipped and refunded");
- each **liveness** property when one matters ("every paid order is eventually shipped or refunded"), with the fairness it assumes;
- the bounds (constants) used.

## 3. Run it

1. Run the checker over the full bounded state space.
2. Record the result for the trial: checker and version, bounds, distinct states explored, each property with pass or fail.
3. A failure gives a counterexample trace. Translate it into domain language as a scenario; it is trial evidence and usually a design fix. When okay-prototype also built a logic walkthrough page (its `LOGIC.md` shape), add the trace there as a scenario.
4. Sanity check: remove one guard that protects an invariant and run again. A checker that still passes is checking nothing; fix the model before trusting any green result.

## Fallback: exhaustive property test

When the project will not accept a new tool (no Java on the machines, no checker in CI, the team says no), the spike is a property test in the project's **existing** test runner. It adds no dependency; a property-testing library only when the project already has one.

1. Write the transition function as a pure `(state, event) => state | rejected`.
2. Try **every state and event pair**: assert each legal pair keeps every invariant and each illegal pair is rejected.
3. Then walk every reachable state breadth first from the initial state to a stated depth, checking the invariants after each step.
4. Concurrency: the pairs alone do not cover interleavings. Enumerate the interleavings of 2 actors explicitly, or say in the rationale that the fallback leaves races unchecked.
5. The same sanity check as above: break one guard and watch the test fail.

## Keep it re-runnable

The model is the one spike artifact that outlives the prototype branch, so a later agent that changes the system can check it again.

- The model lives in `docs/models/<system>/` (with its `.cfg` or Alloy commands) and lands in the step 12 PR, next to the ADR when there is one.
- Its header holds **one command** that re-runs it, and the checker version it was last run with (for example `java -cp tla2tools.jar tlc2.TLC -config Order.cfg Order.tla`).
- The same command goes in the rationale, the spec, the ADR when there is one, and as one line in the test section of `AGENTS.md`: "after changing <system>, run <command>".
- Fallback: the property test is a spike like the others, so okay-think does not add it to the suite. The spec carries it as an acceptance criterion ("the exhaustive <system> state test runs in the suite"); its re-run command is the project's test command.
- Contributor mode: the model and its command stay under `.scratch/<feature>/`; nothing lands in the repo.
