# Jev rule

Jev (OpenRouter model `typesafe/jev-1.13`) is a cheap classifier. It is used only to pick a lane and a model tier.

1. Use Jev only when `OPENROUTER_JEV_API_KEY` is set and contributor mode is off.
2. Send it a one-line task summary plus the lane and tier lists from [lanes.md](lanes.md) and [models.md](models.md). Ask for `{"lane": "...", "tier": "..."}` and nothing else.
3. Never hand Jev the task itself, code, secrets, or the conversation. No subagent works from Jev's output alone.
4. Prefer the local `jev` skill when installed; otherwise call the OpenRouter chat completions API directly.
5. Missing key, contributor mode, an error, or an answer outside the lists: classify yourself with the tables. Never block on Jev.
