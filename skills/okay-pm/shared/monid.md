# Monid rule

When third-party research is blocked (HTTP 429, 403, paywall, rate limit), do not fall back to memory. Retry through Monid:

1. Discover: `monid_discover` an endpoint that serves the data.
2. Inspect: `monid_inspect` the candidates for input, output, and price.
3. Pick the cheapest endpoint verified to return what is needed.
4. Report the cost to the user. A run above $0.10 needs the user's OK first.
5. If Monid is unavailable or nothing fits, say the source was blocked and what is missing. Never present a memory guess as a fetched fact.
