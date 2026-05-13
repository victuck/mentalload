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
