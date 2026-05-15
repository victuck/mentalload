import type { HouseholdProfile, SuggestedTask, Category, Effort } from './types'

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
  push('Pay monthly bills', 'admin', 'medium', true)
  push('Review household budget', 'admin', 'medium', true)

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

  // Vehicles — include type in title so each vehicle gets distinct tasks
  for (const v of profile.vehicles) {
    const vt = v.type === 'car' ? 'Car' : v.type === 'motorbike' ? 'Motorbike' : v.type === 'van' ? 'Van' : 'Vehicle'
    push(`MOT booking – ${vt}`, 'admin', 'low', true)
    push(`${vt} service`, 'admin', 'low', true)
    push(`${vt} insurance renewal`, 'admin', 'low', true)
    push(`Road tax renewal – ${vt}`, 'admin', 'low', true)
  }

  // Kids — per child, using name where available
  for (const kid of profile.kids) {
    const name = kid.name?.trim() || null
    const label = name ?? 'your child'

    push(name ? `School admin for ${name}` : 'School admin', 'admin', 'medium', true, name ?? undefined)
    push(name ? `Packed lunches for ${name}` : 'Packed lunches', 'chores', 'low', false, name ?? undefined)
    push(name ? `Extracurricular activities for ${name}` : 'Extracurricular activities', 'admin', 'medium', true, name ?? undefined)
    push(name ? `Birthday party for ${name}` : 'Birthday party planning', 'planning', 'high', false, name ?? undefined)

    if (!kid.birthday) continue
    const age = ageFromBirthday(kid.birthday, today)
    if (age < 5) {
      push(name ? `Nursery admin for ${name}` : 'Nursery admin', 'admin', 'medium', true, name ?? undefined)
      push('Nappies and supplies ordering', 'errands', 'low', false)
      push(name ? `Paediatrician appointments for ${name}` : 'Paediatrician appointments', 'admin', 'low', true, name ?? undefined)
    } else if (age <= 12) {
      push(name ? `School trip forms for ${name}` : 'School trip forms', 'admin', 'low', true, name ?? undefined)
    } else {
      push(name ? `Exam prep support for ${name}` : 'Exam prep support', 'planning', 'medium', true, name ?? undefined)
    }
    if (kid.has_health_needs) {
      push(`Order prescription for ${label}`, 'errands', 'low', true, label)
      push(`Book repeat appointment for ${label}`, 'admin', 'low', true, label)
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
      case 'aunt':
      case 'uncle':
        push(`Birthday planning for ${label}`, 'planning', 'medium', false, label)
        push(`Coordinating visits with ${label}`, 'planning', 'low', false, label)
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

  // Team member health needs
  for (const userId of profile.member_health_needs) {
    const name = memberNames[userId] ?? 'team member'
    push(`Order prescription for ${name}`, 'errands', 'low', true, name)
    push(`Book repeat appointment for ${name}`, 'admin', 'low', true, name)
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
