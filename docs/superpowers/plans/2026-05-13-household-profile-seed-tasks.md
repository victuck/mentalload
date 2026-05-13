# Household Profile & Seed Tasks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend onboarding to collect household context (kids, pets, family, home, vehicles, health needs) and use it to surface personalised task suggestions during onboarding and whenever the settings profile is updated.

**Architecture:** Profile stored as JSONB in `households.profile`. Suggestion logic is a pure TypeScript function with no server dependency. `SuggestionsModal` is a shared client component used in both onboarding step 3 and settings post-save. Task creation goes through the existing `POST /h/[householdId]/tasks` route.

**Tech Stack:** Next.js App Router (async params pattern), Supabase (Postgres JSONB), Tailwind CSS, Vitest.

> ⚠️ AGENTS.md requires reading `node_modules/next/dist/docs/` before writing any Next.js code. The version in this project has breaking changes from common training data.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `supabase/migrations/20260513000001_household_profile.sql` | Create | Add `profile` JSONB column + UPDATE RLS policy |
| `src/lib/types.ts` | Modify | Add `HouseholdProfile`, `EMPTY_PROFILE`, `SuggestedTask`, `coerceProfile` |
| `src/lib/suggestions.ts` | Create | `getSuggestionsForProfile()` + `profileDiff()` |
| `src/lib/suggestions.test.ts` | Create | Unit tests for suggestion logic |
| `src/components/SuggestionsModal.tsx` | Create | Shared tap-to-add suggestions UI |
| `src/components/HouseholdProfileFields.tsx` | Create | Shared form sections (home, vehicles, kids, pets, family, health needs) |
| `src/app/onboarding/ProfileStep.tsx` | Create | Onboarding step 2 — household profile form |
| `src/app/onboarding/SeedTasks.tsx` | Create | Onboarding step 3 — wraps SuggestionsModal |
| `src/app/onboarding/page.tsx` | Modify | 4-step onboarding flow |
| `src/app/h/[householdId]/settings/HouseholdProfileForm.tsx` | Create | Settings profile editor card |
| `src/app/h/[householdId]/settings/page.tsx` | Modify | Fetch profile + members, render HouseholdProfileForm |

---

## Task 1: Add profile column and UPDATE policy

**Files:**
- Create: `supabase/migrations/20260513000001_household_profile.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Add profile JSONB column to households (idempotent)
ALTER TABLE households
  ADD COLUMN IF NOT EXISTS profile JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Allow household members to update the profile
CREATE POLICY "households_update" ON households
  FOR UPDATE TO authenticated
  USING (is_household_member(id))
  WITH CHECK (is_household_member(id));
```

- [ ] **Step 2: Apply locally**

```bash
npx supabase migration up
```

Expected: `Applying migration 20260513000001_household_profile.sql... done`

- [ ] **Step 3: Verify column and policy exist**

```bash
npx supabase db query "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'households' AND column_name = 'profile';"
```

Expected: one row: `profile | jsonb`

```bash
npx supabase db query "SELECT policyname, cmd FROM pg_policies WHERE tablename = 'households';"
```

Expected: rows including `households_select`, `households_insert`, `households_update`

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260513000001_household_profile.sql
git commit -m "feat: add households.profile JSONB column with UPDATE RLS policy"
```

---

## Task 2: Add TypeScript types

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Add types to the end of `src/lib/types.ts`**

Append after the existing `BalanceScore` interface:

```typescript
export interface HouseholdProfile {
  home: {
    owned: boolean
    has_garden: boolean
  }
  vehicles: Array<{ type: 'car' | 'motorbike' | 'van' | 'other' }>
  member_health_needs: string[]
  kids: Array<{
    birthday: string
    has_health_needs?: boolean
  }>
  pets: Array<{
    type: 'dog' | 'cat' | 'other'
    name?: string
  }>
  family: Array<{
    role: 'parent' | 'sibling' | 'nibling' | 'grandparent' | 'other'
    name?: string
    birthday?: string
    notes?: string
    has_health_needs?: boolean
  }>
}

export const EMPTY_PROFILE: HouseholdProfile = {
  home: { owned: false, has_garden: false },
  vehicles: [],
  member_health_needs: [],
  kids: [],
  pets: [],
  family: [],
}

export interface SuggestedTask {
  title: string
  category: Category
  effort: Effort
  is_invisible_work: boolean
  personLabel?: string
}

export function coerceProfile(raw: unknown): HouseholdProfile {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_PROFILE, home: { ...EMPTY_PROFILE.home }, vehicles: [], member_health_needs: [], kids: [], pets: [], family: [] }
  const p = raw as Partial<HouseholdProfile>
  return {
    home: { owned: false, has_garden: false, ...p.home },
    vehicles: p.vehicles ?? [],
    member_health_needs: p.member_health_needs ?? [],
    kids: p.kids ?? [],
    pets: p.pets ?? [],
    family: p.family ?? [],
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add HouseholdProfile, SuggestedTask types and coerceProfile util"
```

---

## Task 3: Implement suggestion logic (TDD)

**Files:**
- Create: `src/lib/suggestions.test.ts`
- Create: `src/lib/suggestions.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/suggestions.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { getSuggestionsForProfile, profileDiff } from './suggestions'
import { EMPTY_PROFILE } from './types'
import type { HouseholdProfile } from './types'

const TODAY = new Date('2026-05-13')

describe('getSuggestionsForProfile', () => {
  it('returns universal tasks for an empty profile', () => {
    const result = getSuggestionsForProfile(EMPTY_PROFILE, [], {}, TODAY)
    const titles = result.map(s => s.title)
    expect(titles).toContain('Weekly food shop')
    expect(titles).toContain('Laundry')
    expect(titles).toContain('Managing finances and bills')
    expect(titles).toContain('Rent payment admin')
  })

  it('adds owned home tasks and omits rented tasks when owned', () => {
    const profile: HouseholdProfile = { ...EMPTY_PROFILE, home: { owned: true, has_garden: false } }
    const result = getSuggestionsForProfile(profile, [], {}, TODAY)
    const titles = result.map(s => s.title)
    expect(titles).toContain('Boiler annual service')
    expect(titles).toContain('Home insurance renewal')
    expect(titles).not.toContain('Rent payment admin')
    expect(titles).not.toContain('Landlord communications')
  })

  it('adds garden tasks when has_garden is true', () => {
    const profile: HouseholdProfile = { ...EMPTY_PROFILE, home: { owned: false, has_garden: true } }
    const result = getSuggestionsForProfile(profile, [], {}, TODAY)
    const titles = result.map(s => s.title)
    expect(titles).toContain('Lawn mowing')
    expect(titles).toContain('Seasonal planting')
    expect(titles).toContain('Garden tidying')
  })

  it('adds vehicle tasks when vehicles present', () => {
    const profile: HouseholdProfile = { ...EMPTY_PROFILE, vehicles: [{ type: 'car' }] }
    const result = getSuggestionsForProfile(profile, [], {}, TODAY)
    const titles = result.map(s => s.title)
    expect(titles).toContain('MOT booking')
    expect(titles).toContain('Car service')
    expect(titles).toContain('Car insurance renewal')
    expect(titles).toContain('Road tax renewal')
  })

  it('deduplicates vehicle tasks for multiple vehicles', () => {
    const profile: HouseholdProfile = { ...EMPTY_PROFILE, vehicles: [{ type: 'car' }, { type: 'van' }] }
    const result = getSuggestionsForProfile(profile, [], {}, TODAY)
    const motCount = result.filter(s => s.title === 'MOT booking').length
    expect(motCount).toBe(1)
  })

  it('adds under-5 tasks for kids born after 2021-05-13', () => {
    const profile: HouseholdProfile = { ...EMPTY_PROFILE, kids: [{ birthday: '2023-03-01' }] }
    const result = getSuggestionsForProfile(profile, [], {}, TODAY)
    const titles = result.map(s => s.title)
    expect(titles).toContain('Nursery admin')
    expect(titles).toContain('Nappies and supplies ordering')
    expect(titles).toContain('Paediatrician appointments')
    expect(titles).not.toContain('School trip forms')
    expect(titles).not.toContain('Exam prep support')
  })

  it('adds school trip forms for kids aged 5–12', () => {
    const profile: HouseholdProfile = { ...EMPTY_PROFILE, kids: [{ birthday: '2018-01-01' }] }
    const result = getSuggestionsForProfile(profile, [], {}, TODAY)
    const titles = result.map(s => s.title)
    expect(titles).toContain('School trip forms')
    expect(titles).not.toContain('Nursery admin')
    expect(titles).not.toContain('Exam prep support')
  })

  it('adds exam prep for kids aged 13+', () => {
    const profile: HouseholdProfile = { ...EMPTY_PROFILE, kids: [{ birthday: '2010-01-01' }] }
    const result = getSuggestionsForProfile(profile, [], {}, TODAY)
    const titles = result.map(s => s.title)
    expect(titles).toContain('Exam prep support')
    expect(titles).not.toContain('Nursery admin')
    expect(titles).not.toContain('School trip forms')
  })

  it('adds dog-specific tasks including grooming and pet insurance', () => {
    const profile: HouseholdProfile = { ...EMPTY_PROFILE, pets: [{ type: 'dog', name: 'Rex' }] }
    const result = getSuggestionsForProfile(profile, [], {}, TODAY)
    const titles = result.map(s => s.title)
    expect(titles).toContain('Dog walking (Rex)')
    expect(titles).toContain('Dog grooming (Rex)')
    expect(titles).toContain('Pet insurance renewal (Rex)')
    expect(titles).not.toContain('Litter box cleaning (Rex)')
  })

  it('adds cat tasks and omits dog-specific tasks', () => {
    const profile: HouseholdProfile = { ...EMPTY_PROFILE, pets: [{ type: 'cat' }] }
    const result = getSuggestionsForProfile(profile, [], {}, TODAY)
    const titles = result.map(s => s.title)
    expect(titles).toContain('Cat feeding')
    expect(titles).toContain('Litter box cleaning')
    expect(titles).not.toContain('Dog walking')
    expect(titles).not.toContain('Dog grooming')
  })

  it('adds parent-specific tasks using the provided name', () => {
    const profile: HouseholdProfile = { ...EMPTY_PROFILE, family: [{ role: 'parent', name: 'Mum' }] }
    const result = getSuggestionsForProfile(profile, [], {}, TODAY)
    const titles = result.map(s => s.title)
    expect(titles).toContain('Weekly call or visit to Mum')
    expect(titles).toContain('GP appointment admin for Mum')
    expect(titles).toContain('Birthday planning for Mum')
  })

  it('falls back to role label when family member has no name', () => {
    const profile: HouseholdProfile = { ...EMPTY_PROFILE, family: [{ role: 'grandparent' }] }
    const result = getSuggestionsForProfile(profile, [], {}, TODAY)
    const titles = result.map(s => s.title)
    expect(titles).toContain('Regular visit to your grandparent')
    expect(titles).toContain('Birthday planning for your grandparent')
  })

  it('adds prescription tasks for family members with health needs', () => {
    const profile: HouseholdProfile = { ...EMPTY_PROFILE, family: [{ role: 'parent', name: 'Dad', has_health_needs: true }] }
    const result = getSuggestionsForProfile(profile, [], {}, TODAY)
    const titles = result.map(s => s.title)
    expect(titles).toContain('Order prescription for Dad')
    expect(titles).toContain('Book repeat appointment for Dad')
  })

  it('adds prescription tasks for household members with health needs using memberNames', () => {
    const userId = 'user-abc'
    const profile: HouseholdProfile = { ...EMPTY_PROFILE, member_health_needs: [userId] }
    const result = getSuggestionsForProfile(profile, [], { [userId]: 'Alex' }, TODAY)
    const titles = result.map(s => s.title)
    expect(titles).toContain('Order prescription for Alex')
    expect(titles).toContain('Book repeat appointment for Alex')
  })

  it('filters out tasks whose titles already exist', () => {
    const result = getSuggestionsForProfile(EMPTY_PROFILE, ['Weekly food shop', 'Laundry'], {}, TODAY)
    const titles = result.map(s => s.title)
    expect(titles).not.toContain('Weekly food shop')
    expect(titles).not.toContain('Laundry')
    expect(titles).toContain('Cooking meals')
  })

  it('returns universal tasks before profile-specific tasks', () => {
    const profile: HouseholdProfile = { ...EMPTY_PROFILE, home: { owned: true, has_garden: false } }
    const result = getSuggestionsForProfile(profile, [], {}, TODAY)
    const universalIdx = result.findIndex(s => s.title === 'Weekly food shop')
    const ownedIdx = result.findIndex(s => s.title === 'Boiler annual service')
    expect(universalIdx).toBeGreaterThanOrEqual(0)
    expect(ownedIdx).toBeGreaterThan(universalIdx)
  })
})

describe('profileDiff', () => {
  it('returns only newly added pets', () => {
    const before: HouseholdProfile = { ...EMPTY_PROFILE, pets: [{ type: 'cat' }] }
    const after: HouseholdProfile = { ...before, pets: [...before.pets, { type: 'dog', name: 'Rex' }] }
    const diff = profileDiff(before, after)
    expect(diff.pets).toHaveLength(1)
    expect(diff.pets[0].type).toBe('dog')
    expect(diff.pets[0].name).toBe('Rex')
  })

  it('detects home ownership change as an addition', () => {
    const before: HouseholdProfile = { ...EMPTY_PROFILE, home: { owned: false, has_garden: false } }
    const after: HouseholdProfile = { ...before, home: { owned: true, has_garden: false } }
    const diff = profileDiff(before, after)
    expect(diff.home.owned).toBe(true)
    expect(diff.home.has_garden).toBe(false)
  })

  it('does not include removed items', () => {
    const before: HouseholdProfile = { ...EMPTY_PROFILE, pets: [{ type: 'cat' }, { type: 'dog' }] }
    const after: HouseholdProfile = { ...before, pets: [{ type: 'cat' }] }
    const diff = profileDiff(before, after)
    expect(diff.pets).toHaveLength(0)
  })

  it('detects newly added member health needs', () => {
    const before: HouseholdProfile = { ...EMPTY_PROFILE, member_health_needs: [] }
    const after: HouseholdProfile = { ...before, member_health_needs: ['user-1'] }
    const diff = profileDiff(before, after)
    expect(diff.member_health_needs).toEqual(['user-1'])
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run src/lib/suggestions.test.ts
```

Expected: FAIL with `Cannot find module './suggestions'`

- [ ] **Step 3: Implement `src/lib/suggestions.ts`**

```typescript
import type { HouseholdProfile, SuggestedTask, Category, Effort } from './types'

function ageFromBirthday(birthday: string, today: Date): number {
  const birth = new Date(birthday)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

export function getSuggestionsForProfile(
  profile: HouseholdProfile,
  existingTaskTitles: string[],
  memberNames: Record<string, string>,
  today = new Date()
): SuggestedTask[] {
  const seen = new Set(existingTaskTitles.map(t => t.toLowerCase()))
  const out: SuggestedTask[] = []

  const push = (title: string, category: Category, effort: Effort, invisible: boolean, personLabel?: string) => {
    if (seen.has(title.toLowerCase())) return
    seen.add(title.toLowerCase())
    out.push({ title, category, effort, is_invisible_work: invisible, personLabel })
  }

  // Universal
  push('Weekly food shop', 'errands', 'medium', false)
  push('Cooking meals', 'chores', 'medium', false)
  push('Laundry', 'chores', 'low', false)
  push('Cleaning bathroom', 'chores', 'medium', false)
  push('Hoovering', 'chores', 'low', false)
  push('Managing finances and bills', 'admin', 'medium', true)
  push('Booking appointments', 'admin', 'low', true)

  // Home
  if (profile.home.owned) {
    push('Boiler annual service', 'admin', 'low', true)
    push('Home insurance renewal', 'admin', 'low', true)
    push('Gutters and roof check', 'chores', 'medium', false)
  } else {
    push('Rent payment admin', 'admin', 'low', true)
    push('Landlord communications', 'admin', 'low', true)
  }

  if (profile.home.has_garden) {
    push('Lawn mowing', 'chores', 'medium', false)
    push('Seasonal planting', 'chores', 'medium', false)
    push('Garden tidying', 'chores', 'medium', false)
  }

  // Vehicles (seen set deduplicates if multiple vehicles)
  for (const _v of profile.vehicles) {
    push('MOT booking', 'admin', 'low', true)
    push('Car service', 'admin', 'low', true)
    push('Car insurance renewal', 'admin', 'low', true)
    push('Road tax renewal', 'admin', 'low', true)
  }

  // Kids — shared tasks
  if (profile.kids.length > 0) {
    push('School admin', 'admin', 'medium', true)
    push('Packed lunches', 'chores', 'low', false)
    push('Extracurricular activities admin', 'admin', 'medium', true)
    push('Birthday party planning', 'planning', 'high', false)
  }

  // Kids — age-specific and health needs
  for (const kid of profile.kids) {
    const age = ageFromBirthday(kid.birthday, today)
    if (age < 5) {
      push('Nursery admin', 'admin', 'medium', true)
      push('Nappies and supplies ordering', 'errands', 'low', false)
      push('Paediatrician appointments', 'admin', 'low', true)
    } else if (age <= 12) {
      push('School trip forms', 'admin', 'low', true)
    } else {
      push('Exam prep support', 'planning', 'medium', true)
    }
    if (kid.has_health_needs) {
      push('Order prescription for child', 'errands', 'low', true)
      push('Book repeat appointment for child', 'admin', 'low', true)
    }
  }

  // Pets
  for (const pet of profile.pets) {
    const suffix = pet.name ? ` (${pet.name})` : ''
    if (pet.type === 'dog') {
      push(`Dog walking${suffix}`, 'chores', 'medium', false, pet.name)
      push(`Dog feeding${suffix}`, 'chores', 'low', false, pet.name)
      push(`Dog vet check-up${suffix}`, 'admin', 'low', true, pet.name)
      push(`Dog flea and worming treatment${suffix}`, 'admin', 'low', true, pet.name)
      push(`Dog grooming${suffix}`, 'chores', 'medium', false, pet.name)
      push(`Pet insurance renewal${suffix}`, 'admin', 'low', true, pet.name)
    } else if (pet.type === 'cat') {
      push(`Cat feeding${suffix}`, 'chores', 'low', false, pet.name)
      push(`Litter box cleaning${suffix}`, 'chores', 'low', false, pet.name)
      push(`Cat vet check-up${suffix}`, 'admin', 'low', true, pet.name)
      push(`Cat flea and worming treatment${suffix}`, 'admin', 'low', true, pet.name)
    } else {
      push(`Pet feeding${suffix}`, 'chores', 'low', false, pet.name)
      push(`Pet vet check-up${suffix}`, 'admin', 'low', true, pet.name)
    }
  }

  // Family
  for (const fm of profile.family) {
    const label = fm.name ?? `your ${fm.role}`
    switch (fm.role) {
      case 'parent':
        push(`Weekly call or visit to ${label}`, 'planning', 'medium', false, label)
        push(`GP appointment admin for ${label}`, 'admin', 'low', true, label)
        push(`Birthday planning for ${label}`, 'planning', 'medium', false, label)
        break
      case 'sibling':
        push(`Birthday planning for ${label}`, 'planning', 'medium', false, label)
        push(`Coordinating visits with ${label}`, 'planning', 'low', false, label)
        break
      case 'nibling':
        push(`Birthday planning for ${label}`, 'planning', 'medium', false, label)
        push(`Childcare coordination for ${label}`, 'planning', 'medium', true, label)
        break
      case 'grandparent':
        push(`Regular visit to ${label}`, 'planning', 'medium', false, label)
        push(`Birthday planning for ${label}`, 'planning', 'medium', false, label)
        break
      default:
        push(`Birthday planning for ${label}`, 'planning', 'medium', false, label)
    }
    if (fm.has_health_needs) {
      push(`Order prescription for ${label}`, 'errands', 'low', true, label)
      push(`Book repeat appointment for ${label}`, 'admin', 'low', true, label)
    }
  }

  // Household member health needs
  for (const userId of profile.member_health_needs) {
    const name = memberNames[userId] ?? 'household member'
    push(`Order prescription for ${name}`, 'errands', 'low', true, name)
    push(`Book repeat appointment for ${name}`, 'admin', 'low', true, name)
  }

  return out
}

export function profileDiff(before: HouseholdProfile, after: HouseholdProfile): HouseholdProfile {
  return {
    home: {
      owned: !before.home.owned && after.home.owned,
      has_garden: !before.home.has_garden && after.home.has_garden,
    },
    vehicles: after.vehicles.slice(before.vehicles.length),
    member_health_needs: after.member_health_needs.filter(id => !before.member_health_needs.includes(id)),
    kids: after.kids.slice(before.kids.length),
    pets: after.pets.slice(before.pets.length),
    family: after.family.slice(before.family.length),
  }
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npx vitest run src/lib/suggestions.test.ts
```

Expected: all tests pass

- [ ] **Step 5: Commit**

```bash
git add src/lib/suggestions.ts src/lib/suggestions.test.ts
git commit -m "feat: add getSuggestionsForProfile and profileDiff (TDD)"
```

---

## Task 4: SuggestionsModal component

**Files:**
- Create: `src/components/SuggestionsModal.tsx`

- [ ] **Step 1: Create `src/components/SuggestionsModal.tsx`**

```typescript
'use client'
import { useState } from 'react'
import type { SuggestedTask } from '@/lib/types'

interface Props {
  suggestions: SuggestedTask[]
  householdId: string
  onDone: () => void
}

export function SuggestionsModal({ suggestions, householdId, onDone }: Props) {
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggle(i: number) {
    setSelected(s => {
      const next = new Set(s)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  async function handleDone() {
    setCreating(true)
    setError(null)
    const today = new Date().toISOString().slice(0, 10)
    const toCreate = suggestions.filter((_, i) => selected.has(i))

    try {
      await Promise.all(toCreate.map(task =>
        fetch(`/h/${householdId}/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: task.title,
            owner_id: null,
            category: task.category,
            frequency: 'weekly',
            effort: task.effort,
            is_invisible_work: task.is_invisible_work,
            next_due_date: today,
          }),
        }).then(async r => {
          if (!r.ok) throw new Error(await r.text())
        })
      ))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create tasks')
      setCreating(false)
      return
    }

    onDone()
  }

  const doneLabel = creating
    ? 'Creating...'
    : selected.size > 0
      ? `Add ${selected.size} task${selected.size === 1 ? '' : 's'} and continue`
      : 'Done'

  return (
    <div className="max-w-sm w-full space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Suggested tasks</h2>
        <p className="text-sm text-gray-600 mt-1">Tap to select tasks that apply to your household.</p>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <ul className="space-y-2">
        {suggestions.map((s, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => toggle(i)}
              className={`w-full text-left rounded border px-3 py-2 text-sm transition-colors ${
                selected.has(i)
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-900 border-gray-200 hover:border-indigo-300'
              }`}
            >
              {s.title}
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={handleDone}
        disabled={creating}
        className="w-full bg-indigo-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
      >
        {doneLabel}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/SuggestionsModal.tsx
git commit -m "feat: add SuggestionsModal tap-to-add component"
```

---

## Task 5: HouseholdProfileFields shared form

**Files:**
- Create: `src/components/HouseholdProfileFields.tsx`

- [ ] **Step 1: Create `src/components/HouseholdProfileFields.tsx`**

```typescript
'use client'
import type { HouseholdProfile } from '@/lib/types'

interface Member {
  user_id: string
  name: string
}

interface Props {
  profile: HouseholdProfile
  members: Member[]
  onChange: (profile: HouseholdProfile) => void
}

export function HouseholdProfileFields({ profile, members, onChange }: Props) {
  return (
    <div className="space-y-3">
      {/* Home */}
      <details className="border rounded p-3" open>
        <summary className="font-medium cursor-pointer text-sm">Home</summary>
        <div className="mt-3 space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={profile.home.owned}
              onChange={e => onChange({ ...profile, home: { ...profile.home, owned: e.target.checked } })}
            />
            <span className="text-sm">We own our home</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={profile.home.has_garden}
              onChange={e => onChange({ ...profile, home: { ...profile.home, has_garden: e.target.checked } })}
            />
            <span className="text-sm">We have a garden</span>
          </label>
        </div>
      </details>

      {/* Vehicles */}
      <details className="border rounded p-3">
        <summary className="font-medium cursor-pointer text-sm">
          Vehicles{profile.vehicles.length > 0 ? ` (${profile.vehicles.length})` : ''}
        </summary>
        <div className="mt-3 space-y-2">
          {profile.vehicles.map((v, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                value={v.type}
                onChange={e => onChange({
                  ...profile,
                  vehicles: profile.vehicles.map((vv, j) => j === i ? { type: e.target.value as typeof v.type } : vv),
                })}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="car">Car</option>
                <option value="motorbike">Motorbike</option>
                <option value="van">Van</option>
                <option value="other">Other</option>
              </select>
              <button
                type="button"
                onClick={() => onChange({ ...profile, vehicles: profile.vehicles.filter((_, j) => j !== i) })}
                className="text-red-500 text-xs"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onChange({ ...profile, vehicles: [...profile.vehicles, { type: 'car' }] })}
            className="text-indigo-600 text-sm"
          >
            + Add vehicle
          </button>
        </div>
      </details>

      {/* Kids */}
      <details className="border rounded p-3">
        <summary className="font-medium cursor-pointer text-sm">
          Kids{profile.kids.length > 0 ? ` (${profile.kids.length})` : ''}
        </summary>
        <div className="mt-3 space-y-3">
          {profile.kids.map((kid, i) => (
            <div key={i} className="space-y-1 pl-3 border-l-2 border-indigo-100">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600">Birthday</label>
                <input
                  type="date"
                  value={kid.birthday}
                  onChange={e => onChange({
                    ...profile,
                    kids: profile.kids.map((k, j) => j === i ? { ...k, birthday: e.target.value } : k),
                  })}
                  className="border rounded px-2 py-1 text-sm"
                />
                <button
                  type="button"
                  onClick={() => onChange({ ...profile, kids: profile.kids.filter((_, j) => j !== i) })}
                  className="text-red-500 text-xs ml-auto"
                >
                  Remove
                </button>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={kid.has_health_needs ?? false}
                  onChange={e => onChange({
                    ...profile,
                    kids: profile.kids.map((k, j) => j === i ? { ...k, has_health_needs: e.target.checked } : k),
                  })}
                />
                <span className="text-xs">Has ongoing health needs</span>
              </label>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onChange({ ...profile, kids: [...profile.kids, { birthday: '' }] })}
            className="text-indigo-600 text-sm"
          >
            + Add child
          </button>
        </div>
      </details>

      {/* Pets */}
      <details className="border rounded p-3">
        <summary className="font-medium cursor-pointer text-sm">
          Pets{profile.pets.length > 0 ? ` (${profile.pets.length})` : ''}
        </summary>
        <div className="mt-3 space-y-3">
          {profile.pets.map((pet, i) => (
            <div key={i} className="flex items-start gap-2 pl-3 border-l-2 border-indigo-100">
              <select
                value={pet.type}
                onChange={e => onChange({
                  ...profile,
                  pets: profile.pets.map((p, j) => j === i ? { ...p, type: e.target.value as typeof pet.type } : p),
                })}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="dog">Dog</option>
                <option value="cat">Cat</option>
                <option value="other">Other</option>
              </select>
              <input
                type="text"
                placeholder="Name (optional)"
                value={pet.name ?? ''}
                onChange={e => onChange({
                  ...profile,
                  pets: profile.pets.map((p, j) => j === i ? { ...p, name: e.target.value || undefined } : p),
                })}
                className="border rounded px-2 py-1 text-sm flex-1"
              />
              <button
                type="button"
                onClick={() => onChange({ ...profile, pets: profile.pets.filter((_, j) => j !== i) })}
                className="text-red-500 text-xs"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onChange({ ...profile, pets: [...profile.pets, { type: 'dog' }] })}
            className="text-indigo-600 text-sm"
          >
            + Add pet
          </button>
        </div>
      </details>

      {/* Family */}
      <details className="border rounded p-3">
        <summary className="font-medium cursor-pointer text-sm">
          Family{profile.family.length > 0 ? ` (${profile.family.length})` : ''}
        </summary>
        <div className="mt-3 space-y-4">
          {profile.family.map((fm, i) => (
            <div key={i} className="space-y-2 pl-3 border-l-2 border-indigo-100">
              <div className="flex items-center gap-2">
                <select
                  value={fm.role}
                  onChange={e => onChange({
                    ...profile,
                    family: profile.family.map((f, j) => j === i ? { ...f, role: e.target.value as typeof fm.role } : f),
                  })}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value="parent">Parent</option>
                  <option value="sibling">Sibling</option>
                  <option value="nibling">Nibling</option>
                  <option value="grandparent">Grandparent</option>
                  <option value="other">Other</option>
                </select>
                <button
                  type="button"
                  onClick={() => onChange({ ...profile, family: profile.family.filter((_, j) => j !== i) })}
                  className="text-red-500 text-xs ml-auto"
                >
                  Remove
                </button>
              </div>
              <input
                type="text"
                placeholder="Name (optional)"
                value={fm.name ?? ''}
                onChange={e => onChange({
                  ...profile,
                  family: profile.family.map((f, j) => j === i ? { ...f, name: e.target.value || undefined } : f),
                })}
                className="w-full border rounded px-2 py-1 text-sm"
              />
              <input
                type="date"
                value={fm.birthday ?? ''}
                onChange={e => onChange({
                  ...profile,
                  family: profile.family.map((f, j) => j === i ? { ...f, birthday: e.target.value || undefined } : f),
                })}
                className="w-full border rounded px-2 py-1 text-sm"
              />
              <textarea
                placeholder="Notes (optional)"
                value={fm.notes ?? ''}
                onChange={e => onChange({
                  ...profile,
                  family: profile.family.map((f, j) => j === i ? { ...f, notes: e.target.value || undefined } : f),
                })}
                className="w-full border rounded px-2 py-1 text-sm"
                rows={2}
              />
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={fm.has_health_needs ?? false}
                  onChange={e => onChange({
                    ...profile,
                    family: profile.family.map((f, j) => j === i ? { ...f, has_health_needs: e.target.checked } : f),
                  })}
                />
                <span className="text-xs">Has ongoing health needs</span>
              </label>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onChange({ ...profile, family: [...profile.family, { role: 'parent' }] })}
            className="text-indigo-600 text-sm"
          >
            + Add family member
          </button>
        </div>
      </details>

      {/* Household member health needs */}
      {members.length > 0 && (
        <details className="border rounded p-3">
          <summary className="font-medium cursor-pointer text-sm">Adult member health needs</summary>
          <div className="mt-3 space-y-2">
            {members.map(m => (
              <label key={m.user_id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={profile.member_health_needs.includes(m.user_id)}
                  onChange={e => onChange({
                    ...profile,
                    member_health_needs: e.target.checked
                      ? [...profile.member_health_needs, m.user_id]
                      : profile.member_health_needs.filter(id => id !== m.user_id),
                  })}
                />
                <span className="text-sm">{m.name} has ongoing health needs</span>
              </label>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/HouseholdProfileFields.tsx
git commit -m "feat: add HouseholdProfileFields shared form component"
```

---

## Task 6: ProfileStep onboarding component

**Files:**
- Create: `src/app/onboarding/ProfileStep.tsx`

- [ ] **Step 1: Create `src/app/onboarding/ProfileStep.tsx`**

```typescript
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { HouseholdProfileFields } from '@/components/HouseholdProfileFields'
import type { HouseholdProfile } from '@/lib/types'
import { EMPTY_PROFILE } from '@/lib/types'

const supabase = createClient()

interface Props {
  householdId: string
  userId: string
  userName: string
  onNext: (profile: HouseholdProfile) => void
  onSkip: () => void
}

export function ProfileStep({ householdId, userId, userName, onNext, onSkip }: Props) {
  const [profile, setProfile] = useState<HouseholdProfile>(EMPTY_PROFILE)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleNext() {
    setSaving(true)
    setError(null)
    const { error } = await supabase.from('households').update({ profile }).eq('id', householdId)
    setSaving(false)
    if (error) { setError(error.message); return }
    onNext(profile)
  }

  return (
    <div className="max-w-sm w-full space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Tell us about your household</h1>
        <p className="text-sm text-gray-600 mt-1">We use this to suggest relevant tasks. You can update it any time in settings.</p>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <HouseholdProfileFields
        profile={profile}
        members={[{ user_id: userId, name: userName }]}
        onChange={setProfile}
      />
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleNext}
          disabled={saving}
          className="flex-1 bg-indigo-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Next'}
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
        >
          Skip
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/app/onboarding/ProfileStep.tsx
git commit -m "feat: add ProfileStep component for onboarding step 2"
```

---

## Task 7: SeedTasks component and 4-step onboarding

**Files:**
- Create: `src/app/onboarding/SeedTasks.tsx`
- Modify: `src/app/onboarding/page.tsx`

- [ ] **Step 1: Create `src/app/onboarding/SeedTasks.tsx`**

```typescript
'use client'
import { SuggestionsModal } from '@/components/SuggestionsModal'
import { getSuggestionsForProfile } from '@/lib/suggestions'
import type { HouseholdProfile } from '@/lib/types'

interface Props {
  profile: HouseholdProfile
  householdId: string
  memberNames: Record<string, string>
  onDone: () => void
}

export function SeedTasks({ profile, householdId, memberNames, onDone }: Props) {
  const suggestions = getSuggestionsForProfile(profile, [], memberNames)

  if (suggestions.length === 0) {
    return (
      <div className="max-w-sm w-full space-y-4">
        <h2 className="text-xl font-semibold">You're all set</h2>
        <p className="text-sm text-gray-600">No suggestions for your profile. You can add tasks manually.</p>
        <button
          type="button"
          onClick={onDone}
          className="w-full bg-indigo-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-indigo-700"
        >
          Done, see my balance
        </button>
      </div>
    )
  }

  return <SuggestionsModal suggestions={suggestions} householdId={householdId} onDone={onDone} />
}
```

- [ ] **Step 2: Rewrite `src/app/onboarding/page.tsx` with 4-step flow**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ProfileStep } from './ProfileStep'
import { SeedTasks } from './SeedTasks'
import type { HouseholdProfile } from '@/lib/types'
import { EMPTY_PROFILE } from '@/lib/types'

const supabase = createClient()

export default function OnboardingPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [name, setName] = useState('')
  const [householdName, setHouseholdName] = useState('')
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<HouseholdProfile>(EMPTY_PROFILE)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleStep1(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not signed in'); setLoading(false); return }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ name })
      .eq('id', user.id)
    if (profileError) { setError(profileError.message); setLoading(false); return }

    const { data: id, error: householdError } = await supabase
      .rpc('create_household', { household_name: householdName, member_default_tab: 'balance' })
    if (householdError || !id) { setError(householdError?.message ?? 'Failed to create household'); setLoading(false); return }

    setHouseholdId(id)
    setUserId(user.id)
    setLoading(false)
    setStep(2)
  }

  function handleProfileNext(p: HouseholdProfile) {
    setProfile(p)
    setStep(3)
  }

  function handleDone() {
    router.push(`/h/${householdId}/balance`)
  }

  if (step === 2 && householdId && userId) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <ProfileStep
          householdId={householdId}
          userId={userId}
          userName={name}
          onNext={handleProfileNext}
          onSkip={() => setStep(3)}
        />
      </main>
    )
  }

  if (step === 3 && householdId) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <SeedTasks
          profile={profile}
          householdId={householdId}
          memberNames={{ [userId!]: name }}
          onDone={handleDone}
        />
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <form onSubmit={handleStep1} className="max-w-sm w-full space-y-4">
        <h1 className="text-2xl font-semibold">Set up your household</h1>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="space-y-1">
          <label htmlFor="name" className="text-sm font-medium">Your name</label>
          <input
            id="name"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Alex"
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="householdName" className="text-sm font-medium">Household name</label>
          <input
            id="householdName"
            required
            value={householdName}
            onChange={e => setHouseholdName(e.target.value)}
            placeholder="The Smiths"
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create household'}
        </button>
      </form>
    </main>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/app/onboarding/SeedTasks.tsx src/app/onboarding/page.tsx
git commit -m "feat: add SeedTasks and wire 4-step onboarding flow"
```

---

## Task 8: HouseholdProfileForm settings component

**Files:**
- Create: `src/app/h/[householdId]/settings/HouseholdProfileForm.tsx`

- [ ] **Step 1: Create `src/app/h/[householdId]/settings/HouseholdProfileForm.tsx`**

```typescript
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { HouseholdProfileFields } from '@/components/HouseholdProfileFields'
import { SuggestionsModal } from '@/components/SuggestionsModal'
import { getSuggestionsForProfile, profileDiff } from '@/lib/suggestions'
import type { HouseholdProfile, HouseholdMember, SuggestedTask } from '@/lib/types'

const supabase = createClient()

interface Props {
  householdId: string
  initialProfile: HouseholdProfile
  members: HouseholdMember[]
}

export function HouseholdProfileForm({ householdId, initialProfile, members }: Props) {
  const [profile, setProfile] = useState<HouseholdProfile>(initialProfile)
  const [savedProfile, setSavedProfile] = useState<HouseholdProfile>(initialProfile)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<SuggestedTask[] | null>(null)

  const memberNames = Object.fromEntries(members.map(m => [m.user_id, m.profile.name]))
  const memberList = members.map(m => ({ user_id: m.user_id, name: m.profile.name }))

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setError(null)

    const { error: updateError } = await supabase
      .from('households')
      .update({ profile })
      .eq('id', householdId)

    if (updateError) { setError(updateError.message); setSaving(false); return }

    const additions = profileDiff(savedProfile, profile)
    setSavedProfile(profile)

    const { data: tasks } = await supabase
      .from('tasks')
      .select('title')
      .eq('household_id', householdId)
    const existingTitles = tasks?.map(t => t.title) ?? []
    const newSuggestions = getSuggestionsForProfile(additions, existingTitles, memberNames)

    setSaving(false)
    if (newSuggestions.length > 0) {
      setSuggestions(newSuggestions)
    } else {
      setSaved(true)
    }
  }

  if (suggestions) {
    return (
      <div className="border rounded p-4">
        <SuggestionsModal
          suggestions={suggestions}
          householdId={householdId}
          onDone={() => { setSuggestions(null); setSaved(true) }}
        />
      </div>
    )
  }

  return (
    <div className="border rounded p-4 space-y-4">
      <h3 className="font-semibold">Household profile</h3>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {saved && <p className="text-green-600 text-sm">Saved.</p>}
      <HouseholdProfileFields
        profile={profile}
        members={memberList}
        onChange={p => { setProfile(p); setSaved(false) }}
      />
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="bg-indigo-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/app/h/[householdId]/settings/HouseholdProfileForm.tsx
git commit -m "feat: add HouseholdProfileForm with post-save suggestions diff"
```

---

## Task 9: Wire settings page

**Files:**
- Modify: `src/app/h/[householdId]/settings/page.tsx`

- [ ] **Step 1: Update settings page to fetch profile and members**

Replace the full contents of `src/app/h/[householdId]/settings/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DefaultTabForm } from './DefaultTabForm'
import { InviteSection } from './InviteSection'
import { HouseholdProfileForm } from './HouseholdProfileForm'
import type { HouseholdMember } from '@/lib/types'
import { coerceProfile } from '@/lib/types'

export default async function SettingsPage({ params }: { params: Promise<{ householdId: string }> }) {
  const { householdId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: member }, { data: household }, { data: members }] = await Promise.all([
    supabase
      .from('household_members')
      .select('default_tab')
      .eq('household_id', householdId)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('households')
      .select('profile')
      .eq('id', householdId)
      .single(),
    supabase
      .from('household_members')
      .select('user_id, default_tab, joined_at, profile:profiles!user_id(id, name, avatar_colour, created_at)')
      .eq('household_id', householdId),
  ])

  const profile = coerceProfile(household?.profile)
  const householdMembers = (members ?? []) as HouseholdMember[]

  return (
    <div className="space-y-6">
      <h2 className="font-semibold">Settings</h2>
      <DefaultTabForm
        householdId={householdId}
        currentDefault={member?.default_tab ?? 'balance'}
      />
      <HouseholdProfileForm
        householdId={householdId}
        initialProfile={profile}
        members={householdMembers}
      />
      <InviteSection householdId={householdId} />
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors. If the `profiles!user_id` join syntax causes a type error, try `profiles(id, name, avatar_colour, created_at)` (without the foreign key hint) — Supabase will infer it via the FK.

- [ ] **Step 3: Run the dev server and test the full flow manually**

```bash
npm run dev
```

Test checklist:
1. Navigate to `/onboarding` — step 1 still works (name + household name)
2. After step 1 completes → step 2 shows profile form with all sections (Home, Vehicles, Kids, Pets, Family, Health needs)
3. Add a dog named "Buddy" → click Next → step 3 shows suggestions including "Dog walking (Buddy)"
4. Tap a few suggestions to toggle highlight → click "Add N tasks and continue" → navigates to balance
5. Open the balance page → confirm newly created tasks appear
6. Navigate to `/h/[householdId]/settings` → "Household profile" card appears below "Default tab"
7. Add a new pet (cat) → Save → suggestions modal appears with cat-specific suggestions
8. Skip suggestions → "Saved." confirmation shows

- [ ] **Step 4: Commit**

```bash
git add src/app/h/[householdId]/settings/page.tsx
git commit -m "feat: wire HouseholdProfileForm into settings page"
```
