# Placeholder Partner Feature — Design Spec

**Date:** 2026-05-22

## Problem

During onboarding, Person A allocates seed tasks but can only assign them to themselves. Person B doesn't exist as a user yet, so tasks that obviously belong to them are left unassigned. When Person B eventually joins, they see a flat list of unassigned tasks with no context about which ones Person A already attributed to them.

## Solution

Introduce a `placeholder_members` table for named-but-not-yet-signed-up household members. Person A names their partner during onboarding step 1, tasks can be attributed to that placeholder during seed task allocation, and when Person B joins they are offered a one-tap "is this you?" match that auto-assigns all attributed tasks to their real account.

---

## Data Model

### New table: `placeholder_members`

```sql
CREATE TABLE placeholder_members (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id  UUID REFERENCES households(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  avatar_colour TEXT NOT NULL DEFAULT '#6366f1',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

RLS: household members can SELECT, INSERT, and DELETE rows where `household_id` matches a household they belong to.

### New column: `tasks.placeholder_owner_id`

```sql
ALTER TABLE tasks ADD COLUMN placeholder_owner_id UUID;
```

No FK constraint — Postgres cannot enforce a FK that alternates between two parent tables. When a placeholder is claimed, this column is nulled out and `owner_id` is set to the real user's ID. Index on `(household_id, placeholder_owner_id)` for the claim UPDATE.

---

## Onboarding Changes (step 1)

An optional "Partner's name" field is added to the step 1 form, beneath the household name input. It is labelled clearly as optional so single-person households are not confused.

On submit, after `create_household` succeeds, if a partner name was entered:

1. Pick a random avatar colour from the set used for real members: `['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#8b5cf6']`.
2. `INSERT INTO placeholder_members (household_id, name, avatar_colour)`.
3. Pass the returned `placeholder_id` and `partnerName` through onboarding state to step 4.

If no partner name is entered, `placeholder_id` is null and step 4 behaves exactly as today.

---

## Seed Task Allocation (step 4)

`SeedTasks` already accepts `memberNames: Record<string, string>`. The call site in `onboarding/page.tsx` is updated to include the placeholder:

```ts
memberNames={{
  [userId]: name,
  ...(placeholderId ? { [placeholderId]: partnerName } : {}),
}}
```

`SuggestionsModal` already renders a member picker per task using this map — no changes needed inside `SuggestionsModal` itself. Tasks assigned to the placeholder UUID are saved with `placeholder_owner_id = placeholderId` and `owner_id = null`.

---

## Join Flow Changes

In `src/app/join/[token]/page.tsx`, after the new member row is inserted, query `placeholder_members` for the household:

```ts
const { data: placeholder } = await supabase
  .from('placeholder_members')
  .select('id, name')
  .eq('household_id', invite.household_id)
  .single()
```

If a placeholder exists, pass it to a new `ClaimPlaceholder` client component that renders before the existing `UnassignedReview`.

### `ClaimPlaceholder` component

Displays: *"Your household has a slot set up for **[placeholder name]** — is that you?"*

**Confirm ("Yes, that's me"):**
1. `PATCH /h/[householdId]/tasks` with body `{ action: 'claim_placeholder', placeholder_id: '<uuid>' }` → `UPDATE tasks SET owner_id = $real_user_id, placeholder_owner_id = null WHERE placeholder_owner_id = $placeholder_id AND household_id = $hh_id`.
2. `DELETE FROM placeholder_members WHERE id = $placeholder_id`.
3. Proceed to `UnassignedReview` (claimed tasks are now owned, so they won't appear there).

**Decline ("No, I'm someone else"):**
1. Placeholder is left intact.
2. Proceed directly to `UnassignedReview` as today.

---

## RLS

- `placeholder_members`: SELECT, INSERT, DELETE for authenticated users who are members of the household. No UPDATE needed.
- `tasks.placeholder_owner_id`: no new RLS rules needed — existing task policies cover the column.

---

## What This Does Not Cover

- Multiple placeholders per household (deferred; single partner covers the primary use case).
- Placeholder visibility in the Balance or Today views before Person B joins (deferred; the attributed tasks are unowned from the DB's perspective and won't appear in balance scores until claimed).
- Cleaning up stale placeholders if Person B never joins (deferred; can be added as a settings action later).
