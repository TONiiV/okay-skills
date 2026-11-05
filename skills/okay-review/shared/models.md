# Models and effort

Routing picks two things per agent: a **tier** (which model) and an **effort** (how hard it thinks). Tiers are named `haiku`, `sonnet`, `opus` in this pack; on another vendor use the matching row.

## Tiers

| Tier | Use for | Claude | OpenAI | Google | Others |
|---|---|---|---|---|---|
| haiku (small) | Lookups, search, mechanical edits | Haiku | GPT mini / nano | Gemini Flash / Flash-Lite | Grok fast, Qwen Flash, GLM Air, Devstral small |
| sonnet (mid) | L1 implementation and review, normal tickets, fix rounds | Sonnet | GPT standard / Codex | Gemini Flash (high thinking) or Pro | Grok, DeepSeek, Kimi K2, GLM, Qwen Plus, Devstral |
| opus (top) | Architecture, cross-module work, every L2+ review, reflection judgment | Opus | GPT Pro / Codex-Max | Gemini Pro (high thinking) | Grok top, DeepSeek reasoner, Qwen Max, Mistral Large |

Model names drift. Use the newest model in the family that the harness lists; if the family is not offered, take the nearest tier by price and capability. Never invent a model id.

## Effort

Effort is chosen per task, on top of the tier. Use the harness's own knob and its closest level.

| Effort | Use for | Claude | OpenAI | Google | Others |
|---|---|---|---|---|---|
| low | Known path, mechanical, one file | low | minimal / low | thinking low / small budget | no-think or fast mode |
| medium | Lookups, search, small edits | medium | medium | thinking medium | default |
| high | Implementation, review, fix rounds (default) | high | high | thinking high | reasoning / thinking on |
| max | Hard root cause, L4, contested design, L2+ review of risky diffs | xhigh / max | high (or Pro) | thinking high, max budget | reasoning on, largest budget |

If the harness has no effort knob, ignore this table and pick the tier only.

Rules:

1. The reviewer's tier and effort are never below the implementer's.
2. Implementer and reviewer are always different agents, each with fresh context.
3. Hard but well scoped (one root cause, clear files): raise effort first. Wide, ambiguous or cross-module: raise the tier.
4. More effort never replaces a missing spec. Ambiguous work goes back to okay-grilling, not to `max`.
5. A fix round that fails twice on the same finding goes up one effort level, then one tier.
6. L4 work and contested designs get an extra cross-family review pass through Codex when the codex plugin is present and contributor mode is off.
7. Fable only when the user asks for it.
8. Lane, tier and effort may come from Jev (see [jev.md](jev.md)); otherwise classify yourself with these tables.
