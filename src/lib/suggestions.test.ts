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
    expect(titles).toContain('Pay monthly bills')
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
    expect(titles).toContain('MOT booking – Car')
    expect(titles).toContain('Car service')
    expect(titles).toContain('Car insurance renewal')
    expect(titles).toContain('Road tax renewal – Car')
  })

  it('deduplicates vehicle tasks for two vehicles of the same type', () => {
    const profile: HouseholdProfile = { ...EMPTY_PROFILE, vehicles: [{ type: 'car' }, { type: 'car' }] }
    const result = getSuggestionsForProfile(profile, [], {}, TODAY)
    const motCount = result.filter(s => s.title === 'MOT booking – Car').length
    expect(motCount).toBe(1)
  })

  it('adds under-5 tasks for kids born after 2021-05-13', () => {
    const profile: HouseholdProfile = { ...EMPTY_PROFILE, kids: [{ birthday: '2023-03-01' }] }
    const result = getSuggestionsForProfile(profile, [], {}, TODAY)
    const titles = result.map(s => s.title)
    expect(titles).toContain('Nursery admin')
    expect(titles).toContain('Nappies and supplies ordering')
    expect(titles).toContain("Doctor's appointments")
    expect(titles).not.toContain('School admin')
    expect(titles).not.toContain('School trip forms')
    expect(titles).not.toContain('Exam prep support')
  })

  it('adds school trip forms for kids aged 5–12', () => {
    const profile: HouseholdProfile = { ...EMPTY_PROFILE, kids: [{ birthday: '2018-01-01' }] }
    const result = getSuggestionsForProfile(profile, [], {}, TODAY)
    const titles = result.map(s => s.title)
    expect(titles).toContain('School admin')
    expect(titles).toContain('School trip forms')
    expect(titles).not.toContain('Nursery admin')
    expect(titles).not.toContain('Exam prep support')
  })

  it('adds exam prep for kids aged 13+', () => {
    const profile: HouseholdProfile = { ...EMPTY_PROFILE, kids: [{ birthday: '2010-01-01' }] }
    const result = getSuggestionsForProfile(profile, [], {}, TODAY)
    const titles = result.map(s => s.title)
    expect(titles).toContain('School admin')
    expect(titles).toContain('Exam prep support')
    expect(titles).not.toContain('Nursery admin')
    expect(titles).not.toContain('School trip forms')
  })

  it('adds dog-specific tasks including grooming and pet insurance', () => {
    const profile: HouseholdProfile = { ...EMPTY_PROFILE, pets: [{ type: 'dog', name: 'Rex' }] }
    const result = getSuggestionsForProfile(profile, [], {}, TODAY)
    const titles = result.map(s => s.title)
    expect(titles).toContain('Walking (Rex)')
    expect(titles).toContain('Grooming (Rex)')
    expect(titles).toContain('Pet insurance renewal (Rex)')
    expect(titles).not.toContain('Litter box cleaning (Rex)')
  })

  it('adds cat tasks and omits dog-specific tasks', () => {
    const profile: HouseholdProfile = { ...EMPTY_PROFILE, pets: [{ type: 'cat', name: 'Luna' }] }
    const result = getSuggestionsForProfile(profile, [], {}, TODAY)
    const titles = result.map(s => s.title)
    expect(titles).toContain('Feeding (Luna)')
    expect(titles).toContain('Litter box cleaning (Luna)')
    expect(titles).not.toContain('Walking (Luna)')
    expect(titles).not.toContain('Grooming (Luna)')
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

  it('does not surface suggestions when an item is replaced mid-array', () => {
    const before: HouseholdProfile = { ...EMPTY_PROFILE, pets: [{ type: 'cat' }] }
    const after: HouseholdProfile = { ...before, pets: [{ type: 'dog', name: 'Rex' }] }
    // cat replaced by dog — positional slice returns empty (known limitation)
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
