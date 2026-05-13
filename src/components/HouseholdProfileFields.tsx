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
