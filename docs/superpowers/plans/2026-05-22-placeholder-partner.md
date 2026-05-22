# Placeholder Partner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the onboarding user name their partner, attribute seed tasks to that partner, and auto-assign those tasks when the partner joins via invite link.

**Architecture:** A new `placeholder_members` table stores named-but-not-signed-up partners. Tasks get a non-FK `placeholder_owner_id` UUID column so they can be attributed to a placeholder without violating the `profiles` FK. On join, a `ClaimPlaceholder` UI step lets Person B confirm their identity, triggering a server-side bulk reassignment from placeholder UUID to real user ID.

**Tech Stack:** Next.js App Router, Supabase (Postgres + RLS), TypeScript, Vitest for route tests

---

### Task 1: DB Migration — placeholder_members table + tasks column

**Files:**
- Create: `supabase/migrations/20260522000001_placeholder_members.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- New table for named-but-not-signed-up household partners
CREATE TABLE placeholder_members (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id  UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  name          TEXT NOT NULL,
  avatar_colour TEXT NOT NULL DEFAULT '#6366f1',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE placeholder_members ENABLE ROW LEVEL SECURITY;

-- Household members can read, create, and delete placeholders in their household
CREATE POLICY "placeholder_members_select" ON placeholder_members FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM household_members
    WHERE household_id = placeholder_members.household_id AND user_id = auth.uid()
  ));

CREATE POLICY "placeholder_members_insert" ON placeholder_members FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM household_members
    WHERE household_id = placeholder_members.household_id AND user_id = auth.uid()
  ));

CREATE POLICY "placeholder_members_delete" ON placeholder_members FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM household_members
    WHERE household_id = placeholder_members.household_id AND user_id = auth.uid()
  ));

-- Non-FK column on tasks for placeholder attribution (no FK — see spec for rationale)
ALTER TABLE tasks ADD COLUMN placeholder_owner_id UUID;

CREATE INDEX idx_tasks_placeholder_owner_id ON tasks(placeholder_owner_id);
```

- [ ] **Step 2: Apply the migration**

```bash
npx supabase db push
```

Expected: migration applied with no errors.

- [ ] **Step 3: Verify the schema**

```bash
npx supabase db diff
```

Expected: no diff (migration fully applied).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260522000001_placeholder_members.sql
git commit -m "feat: add placeholder_members table and tasks.placeholder_owner_id column"
```

---

### Task 2: Types — PlaceholderMember + update Task

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Add `PlaceholderMember` type and `placeholder_owner_id` to `Task`**

In `src/lib/types.ts`, add after the `Invite` interface:

```ts
export interface PlaceholderMember {
  id: string
  household_id: string
  name: string
  avatar_colour: string
  created_at: string
}
```

In the `Task` interface, add after `snooze_count`:

```ts
  placeholder_owner_id: string | null
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add PlaceholderMember type and placeholder_owner_id to Task"
```

---

### Task 3: Tasks route — POST accepts placeholder_owner_id

**Files:**
- Modify: `src/app/h/[householdId]/tasks/route.ts`
- Modify: `src/app/h/[householdId]/tasks/tasks.test.ts`

- [ ] **Step 1: Write the failing test**

Add to the `describe('POST /h/[householdId]/tasks', ...)` block in `src/app/h/[householdId]/tasks/tasks.test.ts`:

```ts
it('stores placeholder_owner_id when provided', async () => {
  const placeholderId = '00000000-0000-0000-0000-000000000001'
  const res = await fetch(`${BASE}/h/${householdId}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      title: 'Partner task',
      owner_id: null,
      placeholder_owner_id: placeholderId,
      category: 'chores',
      frequency: 'weekly',
      effort: 'medium',
      is_invisible_work: false,
      next_due_date: '2026-05-22',
    }),
  })
  expect(res.ok).toBe(true)
  const task = await res.json()
  expect(task.owner_id).toBeNull()
  expect(task.placeholder_owner_id).toBe(placeholderId)
})
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npx vitest run src/app/h/[householdId]/tasks/tasks.test.ts
```

Expected: the new test fails with `placeholder_owner_id` being null.

- [ ] **Step 3: Update the POST handler to accept and store placeholder_owner_id**

In `src/app/h/[householdId]/tasks/route.ts`, update the POST body type to include `placeholder_owner_id`:

```ts
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
}
```

In the `supabase.from('tasks').insert(...)` call, add `placeholder_owner_id`:

```ts
const { data, error } = await supabase.from('tasks').insert({
  household_id: householdId,
  title: body.title.trim(),
  owner_id: body.owner_id,
  placeholder_owner_id: body.placeholder_owner_id ?? null,
  category: body.category,
  frequency: body.frequency,
  custom_frequency_label: body.frequency === 'custom' ? (body.custom_frequency_label ?? null) : null,
  custom_frequency_weight: body.frequency === 'custom' ? (body.custom_frequency_weight ?? null) : null,
  next_due_date: body.next_due_date ?? new Date().toISOString().slice(0, 10),
  effort: body.effort,
  is_invisible_work: body.is_invisible_work,
  created_by: user.id,
}).select().single()
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
npx vitest run src/app/h/[householdId]/tasks/tasks.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/h/[householdId]/tasks/route.ts src/app/h/[householdId]/tasks/tasks.test.ts
git commit -m "feat: tasks POST accepts and stores placeholder_owner_id"
```

---

### Task 4: Tasks route — PATCH claim_placeholder action

**Files:**
- Modify: `src/app/h/[householdId]/tasks/route.ts`
- Modify: `src/app/h/[householdId]/tasks/tasks.test.ts`

- [ ] **Step 1: Write the failing test**

Add a new `describe` block at the bottom of `tasks.test.ts`:

```ts
describe('PATCH /h/[householdId]/tasks — claim_placeholder', () => {
  it('reassigns placeholder tasks to the authenticated user and deletes the placeholder', async () => {
    // Insert placeholder directly (bypassing RLS)
    const { data: ph } = await testSupabase
      .from('placeholder_members')
      .insert({ household_id: householdId, name: 'Jamie', avatar_colour: '#ec4899' })
      .select()
      .single()
    const placeholderId = ph!.id

    // Insert a task attributed to the placeholder
    const { data: task } = await testSupabase.from('tasks').insert({
      household_id: householdId,
      title: 'Partner placeholder task',
      owner_id: null,
      placeholder_owner_id: placeholderId,
      category: 'chores',
      frequency: 'weekly',
      effort: 'low',
      is_invisible_work: false,
      next_due_date: '2026-05-22',
    }).select().single()

    const res = await fetch(`${BASE}/h/${householdId}/tasks`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'claim_placeholder', placeholder_id: placeholderId }),
    })
    expect(res.ok).toBe(true)

    // Task should now be owned by the real user, placeholder_owner_id cleared
    const { data: updated } = await testSupabase.from('tasks').select('owner_id, placeholder_owner_id').eq('id', task!.id).single()
    expect(updated!.owner_id).not.toBeNull()
    expect(updated!.placeholder_owner_id).toBeNull()

    // Placeholder row should be gone
    const { data: gone } = await testSupabase.from('placeholder_members').select('id').eq('id', placeholderId).maybeSingle()
    expect(gone).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npx vitest run src/app/h/[householdId]/tasks/tasks.test.ts
```

Expected: new test fails (no claim_placeholder handler yet).

- [ ] **Step 3: Add the claim_placeholder branch to the PATCH handler**

At the top of the `PATCH` function in `route.ts`, after getting the `user`, add:

```ts
const body = await request.json() as
  | { action: 'claim_placeholder'; placeholder_id: string }
  | { id: string; snooze?: boolean } & Partial<{
      title: string; owner_id: string | null; category: Category; frequency: Frequency
      custom_frequency_label: string; custom_frequency_weight: number
      next_due_date: string; effort: Effort; is_invisible_work: boolean
    }>

if ('action' in body && body.action === 'claim_placeholder') {
  if (!body.placeholder_id) return NextResponse.json({ error: 'placeholder_id is required' }, { status: 400 })

  const { error: taskErr } = await supabase.from('tasks')
    .update({ owner_id: user.id, placeholder_owner_id: null })
    .eq('placeholder_owner_id', body.placeholder_id)
    .eq('household_id', householdId)

  if (taskErr) return NextResponse.json({ error: taskErr.message }, { status: 500 })

  const { error: phErr } = await supabase.from('placeholder_members')
    .delete()
    .eq('id', body.placeholder_id)
    .eq('household_id', householdId)

  if (phErr) return NextResponse.json({ error: phErr.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
```

Remove the old `const body = await request.json() as ...` line that was at the top of the PATCH handler and replace it with the union type above (the existing logic below uses `body.id`, `body.snooze`, etc., which are only present in the second branch — TypeScript will need a type narrowing guard or you can cast after the `action` check).

The full updated PATCH handler after the auth check:

```ts
const raw = await request.json()

if ('action' in raw && raw.action === 'claim_placeholder') {
  const placeholder_id = raw.placeholder_id as string | undefined
  if (!placeholder_id) return NextResponse.json({ error: 'placeholder_id is required' }, { status: 400 })

  const { error: taskErr } = await supabase.from('tasks')
    .update({ owner_id: user.id, placeholder_owner_id: null })
    .eq('placeholder_owner_id', placeholder_id)
    .eq('household_id', householdId)
  if (taskErr) return NextResponse.json({ error: taskErr.message }, { status: 500 })

  const { error: phErr } = await supabase.from('placeholder_members')
    .delete()
    .eq('id', placeholder_id)
    .eq('household_id', householdId)
  if (phErr) return NextResponse.json({ error: phErr.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

const body = raw as { id: string; snooze?: boolean } & Partial<{
  title: string; owner_id: string | null; category: Category; frequency: Frequency
  custom_frequency_label: string; custom_frequency_weight: number
  next_due_date: string; effort: Effort; is_invisible_work: boolean
}>
// ... rest of existing PATCH logic unchanged
```

- [ ] **Step 4: Run all tests to confirm they pass**

```bash
npx vitest run src/app/h/[householdId]/tasks/tasks.test.ts
```

Expected: all tests pass including the new claim_placeholder test.

- [ ] **Step 5: Commit**

```bash
git add src/app/h/[householdId]/tasks/route.ts src/app/h/[householdId]/tasks/tasks.test.ts
git commit -m "feat: tasks PATCH supports claim_placeholder action"
```

---

### Task 5: Onboarding — partner name field + placeholder creation

**Files:**
- Modify: `src/app/onboarding/page.tsx`

- [ ] **Step 1: Add state and the partner name field to step 1**

Add two new state variables after `const [loading, setLoading] = useState(false)`:

```ts
const [partnerName, setPartnerName] = useState('')
const [placeholderId, setPlaceholderId] = useState<string | null>(null)
```

In the step 1 `<form>`, add the partner name field after the household name field and before the submit button:

```tsx
<div className="space-y-1.5">
  <label htmlFor="partnerName" className="text-sm font-medium text-slate-700">
    Partner's name <span className="text-slate-400 font-normal">(optional)</span>
  </label>
  <input
    id="partnerName"
    value={partnerName}
    onChange={e => setPartnerName(e.target.value)}
    placeholder="Jamie"
    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
  />
</div>
```

- [ ] **Step 2: Create the placeholder after household creation in handleStep1**

The avatar colour is chosen randomly from the palette. Add this constant at the top of the file (outside the component):

```ts
const AVATAR_COLOURS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6']
```

In `handleStep1`, after `setHouseholdId(id)` and before `setLoading(false)`, add:

```ts
if (partnerName.trim()) {
  const colour = AVATAR_COLOURS[Math.floor(Math.random() * AVATAR_COLOURS.length)]
  const { data: ph } = await supabase
    .from('placeholder_members')
    .insert({ household_id: id, name: partnerName.trim(), avatar_colour: colour })
    .select('id')
    .single()
  if (ph) setPlaceholderId(ph.id)
}
```

- [ ] **Step 3: Pass placeholderId and partnerName through to SeedTasks (step 4)**

Find the `step === 4` block where `<SeedTasks>` is rendered. Update the `memberNames` prop:

```tsx
<SeedTasks
  profile={profile}
  householdId={householdId}
  memberNames={{
    [userId]: name,
    ...(placeholderId && partnerName.trim() ? { [placeholderId]: partnerName.trim() } : {}),
  }}
  placeholderMemberIds={placeholderId ? [placeholderId] : []}
  onDone={handleDone}
/>
```

- [ ] **Step 4: Manually verify in the browser**

Start the dev server (`npm run dev`), go through onboarding, enter a partner name in step 1, and confirm the placeholder appears in the task owner dropdown in step 4.

- [ ] **Step 5: Commit**

```bash
git add src/app/onboarding/page.tsx
git commit -m "feat: onboarding step 1 collects partner name and creates placeholder member"
```

---

### Task 6: SuggestionsModal — placeholder-aware task assignment

**Files:**
- Modify: `src/components/SuggestionsModal.tsx`
- Modify: `src/app/onboarding/SeedTasks.tsx`

- [ ] **Step 1: Add placeholderMemberIds prop to SuggestionsModal**

In `src/components/SuggestionsModal.tsx`, update the `Props` interface:

```ts
interface Props {
  suggestions: SuggestedTask[]
  householdId: string
  members: Member[]
  placeholderMemberIds?: string[]
  onDone: () => void
}
```

Update the function signature:

```ts
export function SuggestionsModal({ suggestions, householdId, members, placeholderMemberIds = [], onDone }: Props) {
```

- [ ] **Step 2: Route placeholder assignments to placeholder_owner_id in handleAdd**

Replace the `handleAdd` function body in `SuggestionsModal.tsx`:

```ts
async function handleAdd() {
  setSaving(true)
  setError(null)
  const isPlaceholder = ownerId !== '' && placeholderMemberIds.includes(ownerId)
  const res = await fetch(`/h/${householdId}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
      owner_id: isPlaceholder ? null : (ownerId || null),
      placeholder_owner_id: isPlaceholder ? ownerId : null,
      category,
      frequency,
      effort,
      is_invisible_work: false,
      next_due_date: nextDueDate || null,
    }),
  })
  setSaving(false)
  if (!res.ok) {
    const data = await res.json()
    setError(data.error ?? 'Failed to create task')
    return
  }
  advance()
}
```

- [ ] **Step 3: Add placeholderMemberIds prop to SeedTasks**

In `src/app/onboarding/SeedTasks.tsx`, update the `Props` interface and component:

```ts
interface Props {
  profile: HouseholdProfile
  householdId: string
  memberNames: Record<string, string>
  placeholderMemberIds?: string[]
  onDone: () => void
}

export function SeedTasks({ profile, householdId, memberNames, placeholderMemberIds = [], onDone }: Props) {
  const suggestions = getSuggestionsForProfile(profile, [], memberNames)
  const members = Object.entries(memberNames).map(([id, name]) => ({ id, name }))

  if (suggestions.length === 0) {
    return (
      <div className="w-full space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">You're all set</h2>
        <p className="text-sm text-slate-500">No suggestions for your profile. You can add tasks manually.</p>
        <button
          type="button"
          onClick={onDone}
          className="w-full bg-indigo-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          Done, see my balance
        </button>
      </div>
    )
  }

  return (
    <SuggestionsModal
      suggestions={suggestions}
      householdId={householdId}
      members={members}
      placeholderMemberIds={placeholderMemberIds}
      onDone={onDone}
    />
  )
}
```

- [ ] **Step 4: Manually verify in the browser**

Go through onboarding with a partner name. In the seed tasks step, assign a task to the partner. Check Supabase (Table Editor → tasks) that the task has `owner_id = null` and `placeholder_owner_id = <placeholder uuid>`.

- [ ] **Step 5: Commit**

```bash
git add src/components/SuggestionsModal.tsx src/app/onboarding/SeedTasks.tsx
git commit -m "feat: SuggestionsModal routes placeholder assignments to placeholder_owner_id"
```

---

### Task 7: Join page — filter unassigned tasks + query placeholder

**Files:**
- Modify: `src/app/join/[token]/page.tsx`

- [ ] **Step 1: Exclude placeholder-attributed tasks from the unassigned list, and fetch the placeholder**

Find the `Promise.all` near the bottom of the server component. Replace it:

```ts
const [{ data: unassigned }, { data: memberRows }, { data: placeholder }] = await Promise.all([
  supabase
    .from('tasks')
    .select('*')
    .eq('household_id', invite.household_id)
    .is('owner_id', null)
    .is('placeholder_owner_id', null),
  supabase
    .from('household_members')
    .select('user_id, profile:profiles(id, name, avatar_colour, avatar_url, created_at)')
    .eq('household_id', invite.household_id),
  supabase
    .from('placeholder_members')
    .select('id, name')
    .eq('household_id', invite.household_id)
    .maybeSingle(),
])
```

- [ ] **Step 2: Pass the placeholder to JoinClient**

Update the `<JoinClient>` render:

```tsx
<JoinClient
  tasks={unassigned ?? []}
  householdId={invite.household_id}
  userId={user.id}
  members={members}
  hasName={hasName}
  placeholder={placeholder ?? null}
/>
```

- [ ] **Step 3: Commit**

```bash
git add src/app/join/[token]/page.tsx
git commit -m "feat: join page fetches placeholder and excludes placeholder-attributed tasks from unassigned list"
```

---

### Task 8: ClaimPlaceholder component

**Files:**
- Create: `src/app/join/[token]/ClaimPlaceholder.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client'

import { useState } from 'react'

interface Props {
  placeholder: { id: string; name: string }
  householdId: string
  onDone: () => void
}

export function ClaimPlaceholder({ placeholder, householdId, onDone }: Props) {
  const [claiming, setClaiming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClaim() {
    setClaiming(true)
    setError(null)
    const res = await fetch(`/h/${householdId}/tasks`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'claim_placeholder', placeholder_id: placeholder.id }),
    })
    setClaiming(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Something went wrong')
      return
    }
    onDone()
  }

  return (
    <div className="w-full space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">One more thing</h1>
        <p className="text-sm text-slate-500 mt-1">
          Your household has a slot set up for <strong>{placeholder.name}</strong> — is that you?
        </p>
      </div>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        type="button"
        onClick={handleClaim}
        disabled={claiming}
        className="w-full bg-indigo-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {claiming ? 'Claiming…' : `Yes, I'm ${placeholder.name}`}
      </button>

      <button
        type="button"
        onClick={onDone}
        disabled={claiming}
        className="w-full border border-slate-300 text-slate-700 rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors"
      >
        No, I'm someone else
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/join/[token]/ClaimPlaceholder.tsx
git commit -m "feat: add ClaimPlaceholder component for join flow"
```

---

### Task 9: JoinClient — insert ClaimPlaceholder step

**Files:**
- Modify: `src/app/join/[token]/JoinClient.tsx`

- [ ] **Step 1: Add the placeholder prop and claimDone state**

Update the `Props` interface:

```ts
interface Props {
  tasks: Task[]
  householdId: string
  userId: string
  members: Profile[]
  hasName: boolean
  placeholder?: { id: string; name: string } | null
}
```

Add `ClaimPlaceholder` import at the top:

```ts
import { ClaimPlaceholder } from './ClaimPlaceholder'
```

Update the function signature and add the `claimDone` state:

```ts
export function JoinClient({ tasks, householdId, userId, members, hasName, placeholder }: Props) {
  const router = useRouter()
  const [named, setNamed] = useState(hasName)
  const [claimDone, setClaimDone] = useState(!placeholder)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentMembers, setCurrentMembers] = useState(members)
```

- [ ] **Step 2: Insert the ClaimPlaceholder step between name and UnassignedReview**

After the `if (!named) { ... }` block (the name entry form), add:

```ts
if (!claimDone && placeholder) {
  return (
    <ClaimPlaceholder
      placeholder={placeholder}
      householdId={householdId}
      onDone={() => setClaimDone(true)}
    />
  )
}
```

The existing `return <UnassignedReview ... />` (and its redirect logic for zero tasks) stays exactly as-is below this new block.

Also update the zero-tasks redirect inside `handleSetName` — it currently goes straight to balance. This is fine: if there are no unassigned tasks and the placeholder is already claimed or declined, the redirect is correct. No changes needed there.

- [ ] **Step 3: Manually verify the full join flow end-to-end**

1. Go through onboarding as Person A. Enter partner name "Jamie". Assign at least one seed task to Jamie.
2. Copy the invite link from step 3.
3. Open a private window, sign up as a new user, and follow the invite link.
4. You should see the name entry step (if new), then the "is that you?" screen for Jamie.
5. Click "Yes, I'm Jamie". Confirm you land on the balance/unassigned review.
6. Check Supabase: the task assigned to Jamie should now show `owner_id = <Person B's user id>` and `placeholder_owner_id = null`.
7. Check Supabase: the `placeholder_members` row for Jamie should be deleted.
8. Repeat the flow as a different user and click "No, I'm someone else". Confirm the placeholder is preserved and you proceed to the unassigned review.

- [ ] **Step 4: Commit**

```bash
git add src/app/join/[token]/JoinClient.tsx
git commit -m "feat: join flow shows ClaimPlaceholder step when a placeholder exists"
```
