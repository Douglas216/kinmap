# Project Rules

These rules govern how the family-tree data is authored and rendered. They apply
to both data files (`src/data/family.json`) and rendering/layout code
(`src/App.js`).

## Rule 1 — Union nodes: left = male, right = female

In every union (`unions[*]` in `src/data/family.json`):

- `partnerLeftId` must reference a person with `gender: "M"`.
- `partnerRightId` must reference a person with `gender: "F"`.

This convention guarantees consistent visual placement of spouses in every
union node and is relied on by downstream tooling.

**Enforcement:** at app load time, `App.js` walks every union and emits a
`console.warn` for any violation. See `validateUnionGenderRule` in
[src/App.js](src/App.js).

## Rule 2 — Siblings rendered oldest → youngest, left → right

Within any single generation (i.e. children sharing the same parent union),
nodes must be laid out left-to-right in order from oldest to youngest.

Ordering key (in priority order):

1. `dob` (ISO date) — earlier date = older = further left.
2. `birthOrder` (integer, lower = older) — used as fallback when one or both
   `dob` values are missing.
3. Chinese full-name comparison — final tiebreaker, mostly to keep ordering
   stable.

**Enforcement:**

- `sortSiblings` in [src/App.js](src/App.js) implements this comparator and is
  called everywhere children of a union are enumerated.
- `layoutWithElk` post-processes ELK's output so that *every* sibling group —
  not just specially-tagged ones — is reordered along the x-axis to match
  birth order. Each child node carries `siblingOrder` / `siblingParentId`
  metadata so the post-processing pass can find sibling groups generically.
