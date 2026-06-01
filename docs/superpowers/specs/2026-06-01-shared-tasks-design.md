# Shared Tasks Design

## Goal

Allow household members to mark tasks as shared — things they take turns doing. The app tracks whose turn it is automatically based on completions, with a manual override option.

## Context

This app is primarily for pairs (two-person households). Shared tasks are things neither person fully owns but both alternate doing — e.g. cooking dinner, taking bins out, grocery shopping.

---

## Data Model

Two new nullable/defaulted columns on the `tasks` table:

```sql
ALTER TABLE tasks ADD COLUMN is_shared boolean NOT NULL DEFAULT false;
ALTER TABLE tasks ADD COLUMN current_turn_user_id uuid REFERENCES profiles(id) NULL;
```

- `is_shared`: distinguishes shared tasks from unassigned tasks (both have `owner_id = null`)
- `current_turn_user_id`: the member whose turn it currently is. `null` means no turn set yet — the first completion sets it to the other person from that point forward.

No changes to `task_completions`. The existing `completed_by` field captures who did it; balance scoring already uses this.

---

## Turn Logic

When a shared task is marked done:

- If `current_turn_user_id` equals the completer → flip `current_turn_user_id` to the other household member
- If `current_turn_user_id` is the other person (pickup) → no change; the other person still owes their turn
- If `current_turn_user_id` is null → set to the other household member (completer just went, other is next)

"The other household member" is always the one member of `household_members` for this household who is not the completer. Since the app targets pairs, there is always exactly one. Placeholder members are excluded — `current_turn_user_id` references `profiles(id)` (real users only).

The turn flip happens in the existing PATCH `/h/[householdId]/tasks` route alongside the normal completion flow.

---

## Today View

Shared tasks due today appear in a **"Shared" section below the unassigned pool**. Both members always see all shared tasks in this section.

Each card shows a turn badge:
- **"Your turn"** — indigo badge, when `current_turn_user_id` matches the viewing user
- **"[Name]'s turn"** — slate badge, when it's the other person's turn
- No badge — when `current_turn_user_id` is null

Completing a task works identically to today: tapping Done logs a `task_completions` row and advances `next_due_date`. The turn flip is applied on the same PATCH request. Balance score credit goes to whoever marks it done.

The section is hidden when no shared tasks are due today.

---

## Task Form

The `TaskForm` component gets a **"Shared task" toggle**.

When toggled on:
- The assignee picker is hidden (`owner_id` stays null, `is_shared` set to true)
- A **"Whose turn first?"** picker appears — choose between the two real household members (not placeholders), or leave unset
- If left unset, `current_turn_user_id` starts as null and is set after the first completion

When toggled off, behaviour is unchanged from today.

---

## Override

In the task detail modal, a **"Switch turns"** button swaps `current_turn_user_id` to the other member. This does not log a completion and does not affect `next_due_date` or balance scores — it only adjusts whose turn is shown.

---

## Balance Scoring

No changes. Shared task completions flow through `task_completions` as normal. Since `owner_id` is null, shared tasks contribute nothing to `owned_score`. Score is generated only through actual completions, which naturally reflects who has been doing the work.

---

## What This Does Not Change

- The `task_completions` table and schema
- The balance calculation logic
- The unassigned pool (shared tasks are filtered out by `is_shared = true`, unassigned tasks by `is_shared = false AND owner_id IS NULL`)
- RLS policies (shared tasks are household-scoped, same as all tasks)
