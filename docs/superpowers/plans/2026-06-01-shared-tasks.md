# Shared Tasks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add shared tasks — things household members take turns doing — with automatic turn tracking, a manual override, and a dedicated "Shared" section in Today view.

**Architecture:** Two new columns on `tasks` (`is_shared`, `current_turn_user_id`) distinguish shared tasks from unassigned ones. The complete route flips `current_turn_user_id` to the other household member when the current turn-holder marks a task done. A new `SharedPool` component renders the shared section below the unassigned pool in Today view. All UI changes are additive — existing owned/unassigned task flows are unchanged.

**Tech Stack:** Next.js App Router, Supabase Postgres + RLS, Tailwind CSS, TypeScript. **Read `node_modules/next/dist/docs/` before writing any route or server component code.**

---

## File Map

```
supabase/migrations/
  20260601000001_add_shared_tasks.sql   ← new

src/lib/
  types.ts                               ← modify: add is_shared, current_turn_user_id to Task

src/app/h/[householdId]/tasks/
  route.ts                               ← modify: POST + PATCH accept shared fields; PATCH switch_turn action
  complete/route.ts                      ← modify: flip turn after shared task completion

src/components/
  TaskForm.tsx                           ← modify: shared toggle + "Whose turn first?" picker
  TaskCard.tsx                           ← modify: turn badge for shared tasks
  TaskDetailModal.tsx                    ← modify: shared task view + Switch turns button
  SharedPool.tsx                         ← new: section component for shared tasks in Today

src/app/h/[householdId]/today/
  TodayView.tsx                          ← modify: filter shared tasks from unassigned; add SharedPool

src/app/h/[householdId]/tasks/
  tasks.test.ts                          ← modify: add shared task tests
```

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260601000001_add_shared_tasks.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260601000001_add_shared_tasks.sql
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS is_shared boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS current_turn_user_id uuid REFERENCES profiles(id) NULL;
```

- [ ] **Step 2: Push the migration**

```bash
npx supabase db push
```

Expected: `Applying migration 20260601000001_add_shared_tasks.sql` with no errors.

- [ ] **Step 3: Verify columns exist**

```bash
npx supabase db diff --linked
```

Expected: empty diff (no pending changes).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260601000001_add_shared_tasks.sql
git commit -m "feat: add is_shared and current_turn_user_id columns to tasks"
```

---

## Task 2: TypeScript Type Updates

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Add the two new fields to the Task interface**

Find the `Task` interface and add after `snooze_count`:

```typescript
export interface Task {
  id: string
  household_id: string
  title: string
  owner_id: string | null
  category: Category
  frequency: Frequency
  custom_frequency_label: string | null
  custom_frequency_weight: number | null
  next_due_date: string | null
  effort: Effort
  is_invisible_work: boolean
  snooze_count: number
  placeholder_owner_id: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  is_shared: boolean
  current_turn_user_id: string | null
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add is_shared and current_turn_user_id to Task type"
```

---

## Task 3: POST Route — Accept Shared Task Fields

**Files:**
- Modify: `src/app/h/[householdId]/tasks/route.ts` (POST handler only)

- [ ] **Step 1: Extend the body type to include shared fields**

In the POST handler, update the `body` type and the `supabase.from('tasks').insert(...)` call:

```typescript
const body = await request.json() as {
  title: string
  owner_id: string | null
  placeholder_owner_id?: string | null
  category: Category
  frequency: Frequency
  custom_frequency_label?: string
  custom_frequency_weight?: number
  next_due_date?: string
  effort: Effort
  is_invisible_work: boolean
  notes?: string | null
  is_shared?: boolean
  current_turn_user_id?: string | null
}
```

And update the insert to include the new fields:

```typescript
const { data, error } = await supabase.from('tasks').insert({
  household_id: householdId,
  title: body.title.trim(),
  owner_id: body.is_shared ? null : body.owner_id,
  placeholder_owner_id: body.is_shared ? null : resolvedPlaceholderId,
  category: body.category,
  frequency: body.frequency,
  custom_frequency_label: body.frequency === 'custom' ? (body.custom_frequency_label ?? null) : null,
  custom_frequency_weight: body.frequency === 'custom' ? (body.custom_frequency_weight ?? null) : null,
  next_due_date: body.next_due_date ?? new Date().toISOString().slice(0, 10),
  effort: body.effort,
  is_invisible_work: body.is_invisible_work,
  notes: body.notes ?? null,
  created_by: user.id,
  is_shared: body.is_shared ?? false,
  current_turn_user_id: body.is_shared ? (body.current_turn_user_id ?? null) : null,
}).select().single()
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/h/\[householdId\]/tasks/route.ts
git commit -m "feat: POST /tasks accepts is_shared and current_turn_user_id"
```

---

## Task 4: PATCH Route — switch_turn Action + Field Allowlist

**Files:**
- Modify: `src/app/h/[householdId]/tasks/route.ts` (PATCH handler)

- [ ] **Step 1: Add switch_turn action before the regular PATCH logic**

In the PATCH handler, after the `claim_placeholder` block and before the regular `body` parse, add:

```typescript
if ('action' in raw && raw.action === 'switch_turn') {
  const task_id = raw.task_id as string | undefined
  if (!task_id) return NextResponse.json({ error: 'task_id is required' }, { status: 400 })

  const { data: task } = await supabase
    .from('tasks')
    .select('current_turn_user_id')
    .eq('id', task_id)
    .eq('household_id', householdId)
    .single()
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

  // Find the other household member (the one who is NOT the current turn holder)
  const pivotUserId = task.current_turn_user_id ?? user.id
  const { data: others } = await supabase
    .from('household_members')
    .select('user_id')
    .eq('household_id', householdId)
    .neq('user_id', pivotUserId)
  const otherUserId = others?.[0]?.user_id ?? null
  if (!otherUserId) return NextResponse.json({ error: 'No other member found' }, { status: 400 })

  const { error: upErr } = await supabase
    .from('tasks')
    .update({ current_turn_user_id: otherUserId })
    .eq('id', task_id)
    .eq('household_id', householdId)
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, current_turn_user_id: otherUserId })
}
```

- [ ] **Step 2: Add is_shared and current_turn_user_id to the regular PATCH field allowlist**

In the regular PATCH section, after the existing `if (body.notes !== undefined)` line, add:

```typescript
if (body.is_shared !== undefined) updates.is_shared = body.is_shared
if (body.current_turn_user_id !== undefined) updates.current_turn_user_id = body.current_turn_user_id
```

Also update the `body` type assertion to include the new fields:

```typescript
const body = raw as { id: string; snooze?: boolean } & Partial<{
  title: string; owner_id: string | null; placeholder_owner_id: string | null; category: Category; frequency: Frequency
  custom_frequency_label: string; custom_frequency_weight: number
  next_due_date: string; effort: Effort; is_invisible_work: boolean; notes: string | null
  is_shared: boolean; current_turn_user_id: string | null
}>
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/h/\[householdId\]/tasks/route.ts
git commit -m "feat: PATCH /tasks — switch_turn action and shared field allowlist"
```

---

## Task 5: Complete Route — Flip Turn After Completion

**Files:**
- Modify: `src/app/h/[householdId]/tasks/complete/route.ts`

- [ ] **Step 1: Fetch is_shared and current_turn_user_id alongside existing fields**

Update the task SELECT:

```typescript
const { data: task } = await supabase
  .from('tasks')
  .select('owner_id, frequency, next_due_date, is_shared, current_turn_user_id')
  .eq('id', task_id)
  .eq('household_id', householdId)
  .single()
```

- [ ] **Step 2: After logging the completion, flip the turn when appropriate**

Add this block after the `await supabase.from('task_completions').insert(...)` call and before the frequency advance block:

```typescript
// Flip turn for shared tasks when the current turn-holder completes it
if (task.is_shared) {
  const shouldFlip = task.current_turn_user_id === user.id || task.current_turn_user_id === null
  if (shouldFlip) {
    const { data: others } = await supabase
      .from('household_members')
      .select('user_id')
      .eq('household_id', householdId)
      .neq('user_id', user.id)
    const otherUserId = others?.[0]?.user_id ?? null
    if (otherUserId) {
      await supabase.from('tasks').update({ current_turn_user_id: otherUserId }).eq('id', task_id)
    }
  }
  // If current_turn_user_id is the other person, they still owe — no flip
}
```

The full updated handler should look like:

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getNextDueDate } from '@/lib/balance'
import type { Frequency } from '@/lib/types'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ householdId: string }> }
) {
  const { householdId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { task_id } = await request.json() as { task_id: string }
  if (!task_id) return NextResponse.json({ error: 'task_id is required' }, { status: 400 })

  const { data: task } = await supabase
    .from('tasks')
    .select('owner_id, frequency, next_due_date, is_shared, current_turn_user_id')
    .eq('id', task_id)
    .eq('household_id', householdId)
    .single()

  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

  const is_pickup = task.owner_id !== null && task.owner_id !== user.id

  await supabase.from('task_completions').insert({ task_id, completed_by: user.id, is_pickup })

  if (task.is_shared) {
    const shouldFlip = task.current_turn_user_id === user.id || task.current_turn_user_id === null
    if (shouldFlip) {
      const { data: others } = await supabase
        .from('household_members')
        .select('user_id')
        .eq('household_id', householdId)
        .neq('user_id', user.id)
      const otherUserId = others?.[0]?.user_id ?? null
      if (otherUserId) {
        await supabase.from('tasks').update({ current_turn_user_id: otherUserId }).eq('id', task_id)
      }
    }
  }

  if (task.frequency !== 'one-off' && task.frequency !== 'custom' && task.next_due_date) {
    const next = getNextDueDate(task.frequency as Frequency, new Date(task.next_due_date))
    if (next) {
      await supabase.from('tasks').update({ next_due_date: next.toISOString().slice(0, 10) }).eq('id', task_id)
    }
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/h/\[householdId\]/tasks/complete/route.ts
git commit -m "feat: flip current_turn_user_id after shared task completion"
```

---

## Task 6: TaskForm — Shared Toggle + Turn Picker

**Files:**
- Modify: `src/components/TaskForm.tsx`

- [ ] **Step 1: Add isShared state and replace the Owner section**

Add `isShared` state after the existing state declarations:

```typescript
const [isShared, setIsShared] = useState(task?.is_shared ?? false)
const [firstTurnId, setFirstTurnId] = useState<string>(task?.current_turn_user_id ?? '')
```

Replace the entire Owner `<div>` block with:

```tsx
<div className="space-y-1.5">
  <label className="text-sm font-medium text-slate-700">Owner</label>
  <div className="flex items-center gap-3 mb-2">
    <button
      type="button"
      onClick={() => setIsShared(false)}
      className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
        !isShared ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
      }`}
    >
      Assigned
    </button>
    <button
      type="button"
      onClick={() => setIsShared(true)}
      className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
        isShared ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
      }`}
    >
      Shared
    </button>
  </div>
  {!isShared ? (
    <select id="owner" value={ownerId} onChange={e => setOwnerId(e.target.value)} className={INPUT}>
      <option value="">Unassigned</option>
      {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
    </select>
  ) : (
    <div className="space-y-1">
      <label className="text-xs text-slate-500">Whose turn first?</label>
      <select
        value={firstTurnId}
        onChange={e => setFirstTurnId(e.target.value)}
        className={INPUT}
      >
        <option value="">Not set (set after first completion)</option>
        {members
          .filter(m => !(placeholderMemberIds ?? []).includes(m.id))
          .map(m => <option key={m.id} value={m.id}>{m.name}</option>)
        }
      </select>
    </div>
  )}
</div>
```

- [ ] **Step 2: Include is_shared and current_turn_user_id in the submit body**

Update `handleSubmit` to include the shared fields:

```typescript
const body: Record<string, unknown> = {
  ...(task ? { id: task.id } : {}),
  title,
  owner_id: isShared ? null : (isPlaceholder ? null : (ownerId || null)),
  placeholder_owner_id: isShared ? null : (isPlaceholder ? ownerId : null),
  category,
  frequency,
  effort,
  is_invisible_work: false,
  next_due_date: nextDueDate,
  ...(frequency === 'custom' ? { custom_frequency_label: customLabel, custom_frequency_weight: parseInt(customWeight, 10) } : {}),
  notes: notes.trim() || null,
  is_shared: isShared,
  current_turn_user_id: isShared ? (firstTurnId || null) : null,
}
```

(The `isPlaceholder` variable is already defined in the existing `handleSubmit`; keep it unchanged for the non-shared path.)

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/TaskForm.tsx
git commit -m "feat: TaskForm shared toggle and first-turn picker"
```

---

## Task 7: TaskCard — Turn Badge

**Files:**
- Modify: `src/components/TaskCard.tsx`

- [ ] **Step 1: Compute turn display values from task and currentUserId**

After the existing `const owner` and `const isPickup` lines, add:

```typescript
const turnMember = currentTask.is_shared ? members.find(m => m.id === currentTask.current_turn_user_id) : undefined
const isMyTurn = currentTask.is_shared && currentTask.current_turn_user_id === currentUserId
```

- [ ] **Step 2: Render the turn badge inside the card's metadata row**

In the JSX, inside the `<div className="flex items-center gap-2 mt-1.5 flex-wrap">` block, add the turn badge after the effort span:

```tsx
{currentTask.is_shared && (
  <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${
    isMyTurn
      ? 'bg-indigo-100 text-indigo-700'
      : 'bg-slate-100 text-slate-500'
  }`}>
    {isMyTurn
      ? 'Your turn'
      : turnMember
        ? `${turnMember.name}'s turn`
        : 'No turn set'
    }
  </span>
)}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/TaskCard.tsx
git commit -m "feat: TaskCard turn badge for shared tasks"
```

---

## Task 8: TaskDetailModal — Shared Task UI + Switch Turns

**Files:**
- Modify: `src/components/TaskDetailModal.tsx`

- [ ] **Step 1: Add isShared and currentTurnUserId state**

After the existing state declarations, add:

```typescript
const [isShared, setIsShared] = useState(task.is_shared)
const [currentTurnUserId, setCurrentTurnUserId] = useState<string | null>(task.current_turn_user_id)
const [switchingTurn, setSwitchingTurn] = useState(false)
```

- [ ] **Step 2: Add handleSwitchTurn function**

After the `handleDelete` function, add:

```typescript
async function handleSwitchTurn() {
  setSwitchingTurn(true)
  const res = await fetch(`/h/${householdId}/tasks`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'switch_turn', task_id: task.id }),
  })
  const data = await res.json()
  setSwitchingTurn(false)
  if (!res.ok) { setSaveError(data.error); return }
  setCurrentTurnUserId(data.current_turn_user_id)
  onUpdate({ ...task, current_turn_user_id: data.current_turn_user_id })
}
```

- [ ] **Step 3: Include is_shared in the handleSave body**

In `handleSave`, update the body to include the shared fields:

```typescript
const body: Record<string, unknown> = {
  id: task.id,
  title,
  owner_id: isShared ? null : (isPlaceholder ? null : (ownerId || null)),
  placeholder_owner_id: isShared ? null : (isPlaceholder ? ownerId : null),
  category,
  frequency,
  effort,
  is_invisible_work: isInvisible,
  next_due_date: nextDueDate || null,
  notes: notes.trim() || null,
  is_shared: isShared,
  ...(frequency === 'custom' ? {
    custom_frequency_label: customLabel,
    custom_frequency_weight: parseInt(customWeight, 10),
  } : {}),
}
```

- [ ] **Step 4: Replace the Owner section in the edit form**

Replace the Owner `<div className="space-y-1.5">` block with:

```tsx
<div className="space-y-1.5">
  <label className="text-sm font-medium text-slate-700">Owner</label>
  <div className="flex items-center gap-3 mb-2">
    <button
      type="button"
      onClick={() => setIsShared(false)}
      className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
        !isShared ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
      }`}
    >
      Assigned
    </button>
    <button
      type="button"
      onClick={() => setIsShared(true)}
      className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
        isShared ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
      }`}
    >
      Shared
    </button>
  </div>
  {!isShared ? (
    <select value={ownerId} onChange={e => setOwnerId(e.target.value)} className={INPUT}>
      <option value="">Unassigned</option>
      {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
    </select>
  ) : (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
      <div>
        <p className="text-xs text-slate-500 mb-0.5">Current turn</p>
        <p className="text-sm font-medium text-slate-900">
          {currentTurnUserId
            ? (members.find(m => m.id === currentTurnUserId)?.name ?? 'Unknown')
            : 'Not set'
          }
        </p>
      </div>
      <button
        type="button"
        onClick={handleSwitchTurn}
        disabled={switchingTurn}
        className="text-xs px-3 py-1.5 rounded-lg font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50 transition-colors"
      >
        {switchingTurn ? 'Switching…' : 'Switch turns'}
      </button>
    </div>
  )}
</div>
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/TaskDetailModal.tsx
git commit -m "feat: TaskDetailModal shared task UI and switch turns button"
```

---

## Task 9: SharedPool Component

**Files:**
- Create: `src/components/SharedPool.tsx`

- [ ] **Step 1: Create the component**

```typescript
// src/components/SharedPool.tsx
'use client'

import type { Task, Profile } from '@/lib/types'
import { TaskCard } from './TaskCard'

interface Props {
  tasks: Task[]
  members: Profile[]
  currentUserId: string
  householdId: string
  onComplete: (taskId: string) => void
  onDelete: (taskId: string) => void
  onSnooze: (task: Task) => void
  onUpdate?: (task: Task) => void
}

export function SharedPool({ tasks, members, currentUserId, householdId, onComplete, onDelete, onSnooze, onUpdate }: Props) {
  if (tasks.length === 0) return null

  return (
    <section className="mb-6 bg-slate-100 rounded-2xl p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-3">
        Shared ({tasks.length})
      </h2>
      <div className="space-y-2">
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            members={members}
            currentUserId={currentUserId}
            householdId={householdId}
            onComplete={onComplete}
            onDelete={onDelete}
            onSnooze={onSnooze}
            onUpdate={onUpdate}
          />
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/SharedPool.tsx
git commit -m "feat: SharedPool component for Today view"
```

---

## Task 10: TodayView — Integrate SharedPool

**Files:**
- Modify: `src/app/h/[householdId]/today/TodayView.tsx`

- [ ] **Step 1: Import SharedPool**

Add to the imports at the top of TodayView.tsx:

```typescript
import { SharedPool } from '@/components/SharedPool'
```

- [ ] **Step 2: Split shared tasks out of the unassigned filter**

Find:
```typescript
const unassigned = sortTasks(dueTodayTasks.filter(t => t.owner_id === null && t.placeholder_owner_id === null), sortBy)
```

Replace with:
```typescript
const unassigned = sortTasks(
  dueTodayTasks.filter(t => t.owner_id === null && t.placeholder_owner_id === null && !t.is_shared),
  sortBy
)
const shared = sortTasks(dueTodayTasks.filter(t => t.is_shared), sortBy)
```

- [ ] **Step 3: Render SharedPool after UnassignedPool**

In the JSX, immediately after the closing `/>` of `<UnassignedPool ... />`, add:

```tsx
<SharedPool
  tasks={shared}
  members={members}
  currentUserId={currentUserId}
  householdId={householdId}
  onComplete={handleComplete}
  onDelete={handleDelete}
  onSnooze={handleSnooze}
  onUpdate={handleUpdate}
/>
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/h/\[householdId\]/today/TodayView.tsx
git commit -m "feat: SharedPool section in TodayView below unassigned pool"
```

---

## Task 11: Tests

**Files:**
- Modify: `src/app/h/[householdId]/tasks/tasks.test.ts`

- [ ] **Step 1: Add a shared task creation test**

Add inside the existing `describe('POST /h/[householdId]/tasks', ...)` block:

```typescript
it('creates a shared task with is_shared and current_turn_user_id', async () => {
  const turnUserId = 'some-user-id'
  const res = await fetch(`${BASE}/h/${householdId}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      title: 'Cook dinner',
      owner_id: null,
      category: 'chores',
      frequency: 'weekly',
      effort: 'medium',
      is_invisible_work: false,
      next_due_date: '2026-06-01',
      is_shared: true,
      current_turn_user_id: turnUserId,
    }),
  })
  expect(res.ok).toBe(true)
  const task = await res.json()
  expect(task.is_shared).toBe(true)
  expect(task.current_turn_user_id).toBe(turnUserId)
  expect(task.owner_id).toBeNull()
  expect(task.placeholder_owner_id).toBeNull()
})

it('creates a shared task with no first turn set', async () => {
  const res = await fetch(`${BASE}/h/${householdId}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      title: 'Take bins out',
      owner_id: null,
      category: 'chores',
      frequency: 'weekly',
      effort: 'low',
      is_invisible_work: false,
      next_due_date: '2026-06-01',
      is_shared: true,
    }),
  })
  expect(res.ok).toBe(true)
  const task = await res.json()
  expect(task.is_shared).toBe(true)
  expect(task.current_turn_user_id).toBeNull()
})
```

- [ ] **Step 2: Add a switch_turn test**

Add a new `describe` block after the existing ones:

```typescript
describe('PATCH /h/[householdId]/tasks — switch_turn', () => {
  it('returns 404 for unknown task', async () => {
    const res = await fetch(`${BASE}/h/${householdId}/tasks`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'switch_turn', task_id: '00000000-0000-0000-0000-000000000000' }),
    })
    expect(res.status).toBe(404)
  })

  it('returns 400 when task_id is missing', async () => {
    const res = await fetch(`${BASE}/h/${householdId}/tasks`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'switch_turn' }),
    })
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 3: Commit**

```bash
git add src/app/h/\[householdId\]/tasks/tasks.test.ts
git commit -m "test: add shared task creation and switch_turn tests"
```
