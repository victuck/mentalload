# Mental Load App — MVP Design Spec

**Date:** 2026-05-11
**Scope:** Web app MVP

---

## Overview

A web app that helps households visualise and rebalance the mental load each person carries. Covers tasks, chores, and the planning/remembering work behind them (not emotional labour). Built for general households, not a specific demographic.

---

## User Journey

Two distinct phases:

1. **Setup phase** — household members spend time inputting tasks and reviewing the Balance tab to understand and rebalance the current distribution.
2. **Steady state** — once the household is happy with the split, members shift to using the Today tab as a daily task view.

Each user can set their default tab to match where they are in this journey.

---

## Core Structure

### Household Model

- A user creates a household (named) and shares an invite link/code with others.
- Invite links expire after 24 hours. Anyone with the link can join — no approval step for MVP.
- Each member has a profile: name and avatar colour.
- No hierarchy — all members can add, edit, and assign tasks.
- A user can belong to multiple households.

### Two Tabs: Today | Balance

Users choose their default tab in their account settings.

**Today tab**
- Tasks due today, grouped by person. A recurring task appears on its scheduled day (e.g. a weekly task appears once on its recurrence day each week). One-off tasks appear on the day they were created until completed.
- Unassigned tasks appear in a "Needs an owner" section at the top — visible to all members, not hidden.
- Each task shows: owner, category, effort level, and whether it's invisible work.
- Members can mark their own tasks as done.
- Any member can also mark someone else's task as done ("I picked this up") — the completion is attributed to them, not the owner. This counts toward their balance score for the period.

**Balance tab**
- Visual load distribution across the household (bar or proportional breakdown per person).
- Filters: this week / this month / this year.
- Tap into a person to see their full task list.
- Unassigned tasks are shown separately — the prompt for the rebalancing conversation.
- This is the primary screen for the household to discuss redistribution.

---

## Task Model

Each task has:

| Field | Values |
|---|---|
| Title | Free text |
| Owner | A household member, or unassigned |
| Category | Chores / Planning / Errands / Admin / Other |
| Frequency | One-off / Daily / Weekly / Monthly / Custom |
| Custom frequency label | Free text, only when frequency = Custom (e.g. "Every school term") |
| Custom frequency weight | User-defined integer, only when frequency = Custom — determines how it is weighted in the balance score |
| Effort | Low / Medium / High |
| Invisible work flag | Boolean — marks planning/remembering tasks with no physical output |
| Created by | Member who added it |

### Balance Calculation

Load score per person = (owned task score) + (pickup score for the selected period).

**Owned task score** = sum of (frequency weight × effort weight) for all tasks owned by the person.

**Pickup score** = sum of (effort weight) for tasks completed by this person but owned by someone else, within the selected period. This ensures that picking up another person's task counts toward the doer's load, not the owner's.

Frequency weights: One-off = 1, Monthly = 2, Weekly = 4, Daily = 7. Custom = user-defined weight.
Effort weights: Low = 1, Medium = 2, High = 3.

Balance percentage = person's total score ÷ total household score.

Invisible work tasks are included in the score but visually distinguished in the Balance tab.

> **Note:** The invisible work concept is flagged as an area for iteration. The MVP uses a simple boolean flag; how this is captured and surfaced may evolve based on user feedback.

---

## Adding New Tasks

Tasks can be added without an owner (unassigned pool). This supports the household conversation — anyone can surface something ("we need to sort the car insurance") without it automatically landing on them.

Unassigned tasks appear:
- In the "Needs an owner" section at the top of the Today tab.
- As a distinct group in the Balance tab.

When a task is assigned, it moves into that person's load and the balance score updates in real time.

---

## Onboarding Flow

For new households:

1. **Create household** — give it a name.
2. **Invite members** — share link or code.
3. **Seed your tasks** — guided prompt to add recurring tasks by category. Not mandatory, but sets up the Balance tab to be meaningful immediately.
4. **Assign owners** — select who owns each task.
5. **See your baseline** — land on the Balance tab showing the current split. UI makes clear this is a starting point.

New members joining an existing household skip to step 1 (join) and see the current state directly.

---

## Auth & Accounts

- Email + magic link (no password).
- One account per email, can belong to multiple households.
- Default tab preference stored per user.

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js | React-based, easy to deploy, good ecosystem |
| Backend / DB / Auth | Supabase | Postgres + magic link auth + real-time subscriptions built in |
| Deployment | Vercel | Zero-config for Next.js |

Real-time subscriptions via Supabase mean household members see task and balance updates live without refreshing.

---

## Data Model

```
users
  id, email, name, avatar_colour

households
  id, name, created_at

household_members
  household_id, user_id, default_tab (today | balance)

tasks
  id, household_id, title, owner_id (nullable), category,
  frequency (one-off | daily | weekly | monthly | custom),
  custom_frequency_label (nullable text),
  custom_frequency_weight (nullable integer),
  effort (low | medium | high), is_invisible_work,
  created_by, created_at

task_completions
  task_id, completed_by, completed_at, is_pickup (boolean)
  -- is_pickup = true when completed_by != task owner_id

invites
  household_id, token, expires_at
```

`task_completions` feeds the balance view — tracking who actually did what over time, not just who owns a task.

---

## Error Handling & Edge Cases

| Scenario | Behaviour |
|---|---|
| Expired invite link | Clear message; household member can regenerate |
| Last member leaves household | Household is archived, not deleted |
| Unassigned task on Today tab | Shown in "Needs an owner" section, not hidden |
| Offline / connection lost | Subtle "reconnecting" indicator; no silent staleness |

---

## Testing

- **Unit tests** — balance calculation logic: effort weighting, frequency weighting, unassigned task exclusion.
- **Integration tests** — key flows: household creation, invite + join, task add/assign/complete, balance score updates. Run against Supabase local dev environment.
- No end-to-end browser tests for MVP.

---

## Icebox (Post-MVP)

- **Auto-suggest rebalancing** — app suggests which unassigned tasks to assign to whom based on current load distribution.
- **Proactive pickup pattern detection** — if a member repeatedly completes tasks they don't own well before they're due, surface this as a load imbalance signal (they're voluntarily absorbing extra work).
- **Overdue pickup detection** — if a member repeatedly picks up tasks because the assigned owner hasn't done them by the due date, treat this as a separate signal from proactive pickup; the issue is the owner not completing their tasks, not just load imbalance.
- **Mobile app** — iOS/Android after web MVP is validated.
