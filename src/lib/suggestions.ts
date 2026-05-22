import type { HouseholdProfile, SuggestedTask, Category, Effort, Frequency } from './types'

function ageFromBirthday(birthday: string, today: Date): number {
  const birth = new Date(birthday)
  if (!birthday || isNaN(birth.getTime())) return -1
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

export function getSuggestionsForProfile(
  profile: HouseholdProfile,
  existingTaskTitles: string[],
  memberNames: Record<string, string>,
  today = new Date(),
  isDiff = false,
): SuggestedTask[] {
  const seen = new Set(existingTaskTitles.map(t => t.toLowerCase()))
  const out: SuggestedTask[] = []

  const push = (title: string, category: Category, effort: Effort, frequency: Frequency, personLabel?: string) => {
    if (seen.has(title.toLowerCase())) return
    seen.add(title.toLowerCase())
    out.push({ title, category, effort, frequency, personLabel })
  }

  // Universal
  push('Weekly food shop', 'errands', 'medium', 'weekly')
  push('Cooking meals', 'chores', 'medium', 'daily')
  push('Laundry', 'chores', 'low', 'weekly')
  push('Cleaning bathroom', 'chores', 'medium', 'weekly')
  push('Hoovering', 'chores', 'low', 'weekly')
  push('Pay monthly bills', 'admin', 'medium', 'monthly')
  push('Review household budget', 'admin', 'medium', 'monthly')

  // Home
  if (profile.home.owned) {
    push('Boiler annual service', 'admin', 'low', 'annual')
    push('Home insurance renewal', 'admin', 'low', 'annual')
    push('Gutters and roof check', 'chores', 'medium', 'annual')
  } else if (!isDiff) {
    push('Rent payment admin', 'admin', 'low', 'monthly')
    push('Landlord communications', 'admin', 'low', 'monthly')
  }

  if (profile.home.has_garden) {
    push('Lawn mowing', 'garden', 'medium', 'weekly')
    push('Seasonal planting', 'garden', 'medium', 'quarterly')
    push('Garden tidying', 'garden', 'medium', 'weekly')
  }

  // Vehicles
  for (const v of profile.vehicles) {
    const typeLabel = v.type === 'car' ? 'Car' : v.type === 'motorbike' ? 'Motorbike' : v.type === 'van' ? 'Van' : 'Vehicle'
    const vt = v.name?.trim() || typeLabel
    push(`MOT booking – ${vt}`, 'admin', 'low', 'annual')
    push(`${vt} service`, 'admin', 'low', 'annual')
    push(`${vt} insurance renewal`, 'admin', 'low', 'annual')
    push(`Road tax renewal – ${vt}`, 'admin', 'low', 'annual')
  }

  // Kids — per child
  for (const kid of profile.kids) {
    const name = kid.name?.trim() || null
    const label = name ?? 'your child'

    push(name ? `Birthday party for ${name}` : 'Birthday party planning', 'planning', 'high', 'annual', name ?? undefined)

    if (!kid.birthday) continue
    const age = ageFromBirthday(kid.birthday, today)
    if (age < 5) {
      push(name ? `Nursery admin for ${name}` : 'Nursery admin', 'admin', 'medium', 'weekly', name ?? undefined)
      push('Nappies and supplies ordering', 'errands', 'low', 'monthly')
      push(name ? `Doctor's appointments for ${name}` : "Doctor's appointments", 'admin', 'low', 'annual', name ?? undefined)
    } else if (age <= 12) {
      push(name ? `School admin for ${name}` : 'School admin', 'admin', 'medium', 'weekly', name ?? undefined)
      push(name ? `Packed lunches for ${name}` : 'Packed lunches', 'chores', 'low', 'weekly', name ?? undefined)
      push(name ? `School trip forms for ${name}` : 'School trip forms', 'admin', 'low', 'one-off', name ?? undefined)
      push(name ? `Extracurricular activities for ${name}` : 'Extracurricular activities', 'admin', 'medium', 'weekly', name ?? undefined)
    } else {
      push(name ? `School admin for ${name}` : 'School admin', 'admin', 'medium', 'weekly', name ?? undefined)
      push(name ? `Exam prep support for ${name}` : 'Exam prep support', 'planning', 'medium', 'weekly', name ?? undefined)
      push(name ? `Extracurricular activities for ${name}` : 'Extracurricular activities', 'admin', 'medium', 'weekly', name ?? undefined)
    }
    if (kid.has_health_needs) {
      push(`Order prescription for ${label}`, 'errands', 'low', 'monthly', label)
      push(`Book repeat appointment for ${label}`, 'admin', 'low', 'quarterly', label)
    }
  }

  // Pets
  for (const pet of profile.pets) {
    const name = pet.name?.trim() || null
    const suffix = name ? ` (${name})` : ''
    if (pet.type === 'dog') {
      push(`Walking${suffix}`, 'chores', 'medium', 'daily', name ?? undefined)
      push(`Feeding${suffix}`, 'chores', 'low', 'daily', name ?? undefined)
      push(`Vet check-up${suffix}`, 'admin', 'low', 'annual', name ?? undefined)
      push(`Vaccinations${suffix}`, 'admin', 'low', 'annual', name ?? undefined)
      push(`Flea and worming treatment${suffix}`, 'admin', 'low', 'quarterly', name ?? undefined)
      push(`Grooming${suffix}`, 'chores', 'medium', 'monthly', name ?? undefined)
      push(`Pet insurance renewal${suffix}`, 'admin', 'low', 'annual', name ?? undefined)
    } else if (pet.type === 'cat') {
      push(`Feeding${suffix}`, 'chores', 'low', 'daily', name ?? undefined)
      push(`Litter box cleaning${suffix}`, 'chores', 'low', 'weekly', name ?? undefined)
      push(`Vet check-up${suffix}`, 'admin', 'low', 'annual', name ?? undefined)
      push(`Vaccinations${suffix}`, 'admin', 'low', 'annual', name ?? undefined)
      push(`Flea and worming treatment${suffix}`, 'admin', 'low', 'quarterly', name ?? undefined)
      push(`Pet insurance renewal${suffix}`, 'admin', 'low', 'annual', name ?? undefined)
    } else {
      push(`Feeding${suffix}`, 'chores', 'low', 'daily', name ?? undefined)
      push(`Vet check-up${suffix}`, 'admin', 'low', 'annual', name ?? undefined)
    }
  }

  // Family
  for (const fm of profile.family) {
    const label = fm.name ?? `your ${fm.role}`
    switch (fm.role) {
      case 'parent':
        push(`Weekly call or visit to ${label}`, 'planning', 'medium', 'weekly', label)
        push(`GP appointment admin for ${label}`, 'admin', 'low', 'annual', label)
        push(`Birthday planning for ${label}`, 'planning', 'medium', 'annual', label)
        break
      case 'sibling':
        push(`Birthday planning for ${label}`, 'planning', 'medium', 'annual', label)
        push(`Coordinating visits with ${label}`, 'planning', 'low', 'monthly', label)
        break
      case 'nibling':
        push(`Birthday planning for ${label}`, 'planning', 'medium', 'annual', label)
        push(`Childcare coordination for ${label}`, 'planning', 'medium', 'monthly', label)
        break
      case 'aunt':
      case 'uncle':
        push(`Birthday planning for ${label}`, 'planning', 'medium', 'annual', label)
        push(`Coordinating visits with ${label}`, 'planning', 'low', 'monthly', label)
        break
      case 'grandparent':
        push(`Regular visit to ${label}`, 'planning', 'medium', 'weekly', label)
        push(`Birthday planning for ${label}`, 'planning', 'medium', 'annual', label)
        break
      default:
        push(`Birthday planning for ${label}`, 'planning', 'medium', 'annual', label)
    }
    if (fm.has_health_needs) {
      push(`Order prescription for ${label}`, 'errands', 'low', 'monthly', label)
      push(`Book repeat appointment for ${label}`, 'admin', 'low', 'quarterly', label)
    }
  }

  // Team member health needs
  for (const userId of profile.member_health_needs) {
    const name = memberNames[userId] ?? 'team member'
    push(`Order prescription for ${name}`, 'errands', 'low', 'monthly', name)
    push(`Book repeat appointment for ${name}`, 'admin', 'low', 'quarterly', name)
  }

  return out
}

// Assumes items are only ever appended to arrays — reordering or replacing mid-array
// items will not surface suggestions for the replacement. This matches the UI's
// append-only form behaviour.
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
