# Wayfinder: efforts too big for one session

Used when the size gate in SKILL.md says one session cannot hold the effort. The way from here to the **destination** is wrapped in fog, so chart it as a **map** of **decision tickets** on the tracker and resolve them one per session until the route is clear. Wayfinding finds the way; it does not build the destination. Rules adapted from Matt Pocock's wayfinder (MIT, see NOTICE.md) to [shared/tracker.md](shared/tracker.md).

## Plan, don't do

Each ticket resolves a decision. The map is done when nothing is left to decide before someone builds. The pull to start building is the signal you have reached the edge of the map: hand off. The destination is normally "ready for `okay-to-spec`", so the last step of a finished map is the normal okay-think flow from step 9 (close the gaps) onward.

## Refer by name

Every map and ticket has a title. In replies and in the map body, refer to it by its title wrapped around its link, never a bare id. A wall of ids is unreadable.

## Where things live

Per [shared/tracker.md](shared/tracker.md); the map is an **index**, a decision lives in exactly one place, its ticket.

| Tracker | Map | Ticket | Blocking | Claim |
|---|---|---|---|---|
| Linear | Parent issue in the repo's project, label `wayfinder:map` | Sub-issue, label `wayfinder:<type>` | Native `blocks` relation | Assign the issue to the user |
| GitHub / GitLab | Issue, label `wayfinder:map` | Issue labelled `wayfinder:<type>`, first line `Map: #<n>` | Last line `Blocked by: #a, #b` | Assignee |
| Local, contributor mode | `.scratch/<map>/map.md` | `.scratch/<map>/issues/<NN>-<slug>.md` | `Blocked by: 01, 03` line | `Claimed:` line |

Contributor mode: everything stays under `.scratch/`, untracked; no issues. A ticket is **unblocked** when every ticket blocking it is closed. The **frontier** is the open, unblocked, unclaimed tickets. Do not call the map or a ticket a `spec`: the label `spec` is reserved for the final spec.

## The map body

```md
## Destination
<what reaching the end looks like: normally the spec, or a decision to lock. One or two lines.>

## Notes
<domain, skills every session should consult, standing preferences>

## Decisions so far
<one line per closed ticket: its title as a link, then a gist of the answer>

## Not yet specified
<in-scope fog you cannot ticket yet; graduates as the frontier advances>

## Out of scope
<work ruled beyond the destination, with the reason; closed, never graduates>
```

Open tickets are not listed in the body; they are found by query.

## Tickets

The body is the question, sized to one session (about 100K tokens):

```md
## Question
<the decision or investigation this ticket resolves>
```

The answer goes in a resolution comment when the ticket closes, not in the body. Assets (spike branches, measurements) are linked, not pasted.

| Type | Driven by | Resolved by |
|---|---|---|
| `research` (AFK) | A sub-agent (haiku for lookups, sonnet for analysis) | Reads primary sources for a fact a decision waits on; blocked pages go through [shared/monid.md](shared/monid.md). Answer = the fact and its source. |
| `prototype` (needs the user) | `okay-prototype` | A spike or sample the user tries; answer = the trial-feedback record. |
| `grilling` (needs the user) | `okay-grilling` + `okay-domain-modeling` | A conversation; the agent never answers its own questions. |
| `task` (user or agent) | Whoever can | Manual work that unblocks a decision (provisioning access, moving data to see its shape). Answer = what was done and the facts later tickets rely on. |

A ticket that needs the user only resolves through a live exchange with the user.

## Fog of war

Chart only what you can see. The map is deliberately incomplete; **Not yet specified** holds the dim view of decisions you can tell are coming but cannot phrase yet.

- **Ticket when** you can state the question precisely now, even if you cannot answer it and it is blocked.
- **Fog when** you cannot yet phrase it that sharply. Do not pre-slice fog into ticket-sized pieces; one patch may become several tickets or none.

Resolving a ticket clears fog: graduate what is now specifiable into new tickets and remove it from **Not yet specified**. Work beyond the destination is **out of scope**: close its ticket, leave one line in **Out of scope** with the reason, and keep it out of **Decisions so far**.

## Chart the map (one session)

1. Name the destination: `okay-grilling` + `okay-domain-modeling`, until the destination and its scope are settled.
2. Map the frontier: grill again, breadth-first, to surface the open decisions and the first steps takeable now. If no fog appears (small enough for one session), there is no map: tell the user and continue the normal flow.
3. Create the map with Destination and Notes filled, Decisions empty, fog sketched.
4. Create the tickets you can specify now, then wire blocking edges in a second pass (ids first).
5. Start each `research` ticket as a sub-agent in parallel; capture findings on a throwaway `research/<name>` note linked from the ticket.
6. Stop. Charting resolves nothing by hand. Deliver the map link per [shared/delivery.md](shared/delivery.md).

## Work through the map (one ticket per session)

`/okay-think <map>`; a ticket is optional, otherwise take the first frontier ticket.

1. Load the map (the low-resolution view, not every ticket body).
2. Claim the ticket before any work, so concurrent sessions skip it.
3. Resolve it with the skill its type names; zoom into related closed tickets only as needed. Never resolve more than one ticket per session, except `research` tickets.
4. Post the resolution comment, close the ticket, append a one-line pointer to **Decisions so far**.
5. Create newly surfaced tickets (create, then wire), graduate fog, rule out-of-scope items out, and update or delete tickets the answer invalidated. Other sessions may be editing the tracker, so re-read before editing the map body.

When the frontier is empty and **Not yet specified** is clear, the way is visible: continue at SKILL.md step 9, now with every settled decision on the map as input.
