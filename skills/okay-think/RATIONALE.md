# Rationale template

One page per design, and one for the final choice. Sentence-case headings, no boilerplate. Replace the italic notes with content. No source files: signatures with `not implemented` bodies are allowed here as text.

## Problem

*One paragraph: what we are trying to do and what about the existing system or constraints makes the shape non-obvious. Name the constraints the grounding found (types to interoperate with, callers we cannot break, invariants), so the reader sees what you saw.*

## Usage (caller's view)

*Written first, before the shape. The README or quickstart the consumer reads, plus two or three realistic call sites in their own code: what they import, what they call, what comes back. The shape is derived from this and must agree with it. When they diverge, change the shape, not the usage.*

## Shape

*The recommended architecture. Data structures first, then how data flows through the signatures. Name the load-bearing decisions: which invariants live in types, where validation sits, what the system deliberately does not do. Judge interface depth explicitly: what complexity the public surface hides, what stays exposed to callers, why the interface is no larger than needed.*

## Synthesis decision

*Which candidate became the base and why; what was adapted from the others; what was rejected and why. Cite the judge's ranking and the user's trial verdict. When they disagreed, say which won and why (the trial decides).*

## Tradeoffs accepted

*One bullet per tradeoff: "we accept X in exchange for Y." Name anything a future reader might mistake for an oversight, including what looks like premature optimisation or premature simplification.*

## Alternatives considered

*Required. At least one concrete alternative shape, one line each on why it lost, judged on interface depth and not only implementation simplicity. One alternative is fine when constraints forced the answer; phrase it "this was the only viable shape because...". Not flavours of the same shape.*

## Open questions and risks

*Things the human must weigh in on, phrased as questions so the answer is the resolution. Include any assumption the spikes did not exercise.*

## Next step

*One sentence: the first thing to build against this design, normally "cut tickets from the spec".*
