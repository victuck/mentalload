# Household Profile & Seed Tasks Design

## Goal

Extend onboarding to collect household context (kids, pets, family, home, vehicles, health needs) and use it to surface personalised task suggestions — both at onboarding and whenever the profile is updated in Settings.

## Architecture

No new API routes. Profile updates go directly via the Supabase browser client. Task creation reuses the existing `POST /h/[householdId]/tasks` route. Suggestion logic is a pure TypeScript function with no server dependency.

**Tech stack:** Next.js App Router, Supabase (Postgres JSONB), Tailwind CSS.

---

## Data Model

Add a `profile JSONB` column to the `households` table, defaulting to an empty profile object.

### TypeScript shape

```typescript
interface HouseholdProfile {
  home: {
    owned: boolean
    has_garden: boolean
  }
  vehicles: Array<{ type: 'car' | 'motorbike' | 'van' | 'other' }>
  member_health_needs: string[]           // user_ids of adult household members
  kids: Array<{
    birthday: string                      // YYYY-MM-DD; age computed from this
    has_health_needs?: boolean
  }>
  pets: Array<{
    type: 'dog' | 'cat' | 'other'
    name?: string
  }>
  family: Array<{
    role: 'parent' | 'sibling' | 'nibling' | 'grandparent' | 'other'
    name?: string
    birthday?: string                     // YYYY-MM-DD
    notes?: string
    has_health_needs?: boolean
  }>
}
```

An empty default is stored via the column default in the migration (`DEFAULT '{}'::jsonb`). The `create_household` RPC does not need to explicitly set it. On first read, the app coerces a missing or empty profile to the full empty shape in TypeScript:

```typescript
const EMPTY_PROFILE: HouseholdProfile = {
  home: { owned: false, has_garden: false },
  vehicles: [],
  member_health_needs: [],
  kids: [],
  pets: [],
  family: [],
}
```

### RLS

Add an UPDATE policy to `households` so members can save profile changes:
```sql
CREATE POLICY "households_update" ON households FOR UPDATE TO authenticated
  USING (is_household_member(id))
  WITH CHECK (is_household_member(id));
```

---

## Suggestion Logic

A pure function in `src/lib/suggestions.ts`:

```typescript
function getSuggestionsForProfile(
  profile: HouseholdProfile,
  existingTaskTitles: string[],
  memberNames: Record<string, string>   // userId → display name
): SuggestedTask[]
```

`SuggestedTask` extends the task template shape with an optional `personLabel` for person-specific tasks (used in the title, e.g. "Order prescription for Mum").

Returns a deduplicated list filtered against `existingTaskTitles`. Universal tasks appear first, then profile-specific ones.

### Task templates by condition

| Condition | Suggested tasks |
|---|---|
| Everyone | Weekly food shop, cooking meals, laundry, cleaning bathroom, hoovering, managing finances/bills, booking appointments |
| Owned home | Boiler annual service, home insurance renewal, gutters/roof check |
| Rented home | Rent payment admin, landlord communications |
| Garden | Lawn mowing, seasonal planting, garden tidying |
| Per vehicle | MOT booking, car service, car insurance renewal, road tax renewal |
| Any kids | School admin, packed lunches, extracurricular activities admin, birthday party planning |
| Kids under 5 | Nursery admin, nappies/supplies ordering, paediatrician appointments |
| Kids 5–12 | School trip forms |
| Kids 13+ | Exam prep support |
| Dog | Dog walking, dog feeding, vet check-up, flea/worming treatment, grooming, pet insurance renewal |
| Cat | Cat feeding, litter box cleaning, vet check-up, flea/worming treatment |
| Other pet | Pet feeding, vet check-up |
| Parent (family) | Weekly call/visit to [name], GP appointment admin for [name], birthday planning for [name] |
| Sibling | Birthday planning for [name], coordinating visits |
| Nibling | Birthday planning for [name], childcare coordination |
| Grandparent | Regular visit to [name], birthday planning for [name] |
| Health needs (kid/family) | Order prescription for [name], book repeat appointment for [name] |
| Health needs (household member) | Order prescription for [name], book repeat appointment for [name] |

Age is computed from `birthday` at the time suggestions are generated to determine which kid templates apply.

Person-specific task titles use `name` if provided, otherwise the role label (e.g. "your parent").

---

## Onboarding Flow

Four steps, replacing the current two-step flow:

1. **Name + household name** — unchanged from current implementation.
2. **Household profile** — collects home, vehicles, kids, pets, family, health needs. Each section is collapsible with an "Add" affordance. Entire step can be skipped. Saves to `households.profile` before advancing so progress isn't lost if the user closes the app.
3. **Seed tasks** — personalised suggestions based on the profile. Tap to add (highlighted), tap again to remove. "Done, see my balance" button proceeds. Can skip.
4. → **Balance view**

---

## Settings

A new "Household" card in the settings page, alongside the existing invite and default tab cards. Any household member can view and edit the full profile.

On save:
- Profile is written to `households.profile`.
- The new profile is diffed against the old one.
- If anything was **added** (new pet, new family member, new vehicle, new health need), a **Suggestions modal** appears immediately showing tasks relevant to what's new.
- Removed items do not trigger suggestions.

---

## Shared Components

### `SuggestionsModal`

Used in both the onboarding seed tasks step and the settings post-update flow. Props:

```typescript
interface Props {
  suggestions: SuggestedTask[]
  householdId: string
  onDone: () => void
}
```

Tap to add (shows visual confirmation), tap again to undo. "Done" button dismisses. Each added task is created via `POST /h/[householdId]/tasks` with `owner_id: null`, `frequency: 'weekly'`, `next_due_date: today`.

---

## Files

| File | Change |
|---|---|
| `supabase/migrations/YYYYMMDD_household_profile.sql` | Add `profile JSONB DEFAULT '{}'` to households + UPDATE RLS policy |
| `src/lib/types.ts` | Add `HouseholdProfile`, `SuggestedTask` types |
| `src/lib/suggestions.ts` | `getSuggestionsForProfile()` + all task templates |
| `src/app/onboarding/ProfileStep.tsx` | Step 2 — household profile form |
| `src/app/onboarding/SeedTasks.tsx` | Step 3 — wraps SuggestionsModal |
| `src/app/onboarding/page.tsx` | Wire up 4-step flow, pass profile to SeedTasks |
| `src/components/SuggestionsModal.tsx` | Shared tap-to-add suggestions UI |
| `src/app/h/[householdId]/settings/HouseholdProfileForm.tsx` | Profile editor card |
| `src/app/h/[householdId]/settings/page.tsx` | Add HouseholdProfileForm, pass current profile + members |

---

## Out of scope (post-MVP)

- Recurring birthday reminders or notifications
- Suggesting task reassignment based on load imbalance
- Filtering suggestions by frequency/effort preference
