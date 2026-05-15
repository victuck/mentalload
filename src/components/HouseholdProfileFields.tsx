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

const SECTION = 'border border-slate-200 rounded-xl overflow-hidden'
const SUMMARY = 'flex items-center justify-between w-full px-4 py-3 text-sm font-semibold text-slate-800 cursor-pointer select-none hover:bg-slate-50 transition-colors list-none [&::-webkit-details-marker]:hidden'
const BODY = 'px-4 pb-4 pt-2 space-y-3 border-t border-slate-100'
const INPUT = 'border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
const SEL = INPUT
const ADD_BTN = 'text-indigo-600 text-sm font-medium hover:text-indigo-700 transition-colors'
const REM_BTN = 'text-rose-500 text-xs font-medium hover:text-rose-700 transition-colors'
const CHECK_LABEL = 'flex items-center gap-2 text-sm text-slate-700 cursor-pointer'

export function HouseholdProfileFields({ profile, members, onChange }: Props) {
  return (
    <div className="space-y-2">
      {/* Home */}
      <details className={SECTION} open>
        <summary className={SUMMARY}>
          Home
          <span className="text-slate-400 text-xs font-normal">▾</span>
        </summary>
        <div className={BODY}>
          <label className={CHECK_LABEL}>
            <input
              type="checkbox"
              checked={profile.home.owned}
              onChange={e => onChange({ ...profile, home: { ...profile.home, owned: e.target.checked } })}
              className="w-4 h-4 accent-indigo-600 rounded"
            />
            We own our home
          </label>
          <label className={CHECK_LABEL}>
            <input
              type="checkbox"
              checked={profile.home.has_garden}
              onChange={e => onChange({ ...profile, home: { ...profile.home, has_garden: e.target.checked } })}
              className="w-4 h-4 accent-indigo-600 rounded"
            />
            We have a garden
          </label>
        </div>
      </details>

      {/* Vehicles */}
      <details className={SECTION}>
        <summary className={SUMMARY}>
          Vehicles{profile.vehicles.length > 0 ? <span className="text-indigo-600 text-xs ml-1">{profile.vehicles.length}</span> : ''}
          <span className="text-slate-400 text-xs font-normal">▾</span>
        </summary>
        <div className={BODY}>
          {profile.vehicles.map((v, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                value={v.type}
                onChange={e => onChange({
                  ...profile,
                  vehicles: profile.vehicles.map((vv, j) => j === i ? { type: e.target.value as typeof v.type } : vv),
                })}
                className={SEL}
              >
                <option value="car">Car</option>
                <option value="motorbike">Motorbike</option>
                <option value="van">Van</option>
                <option value="other">Other</option>
              </select>
              <button type="button" onClick={() => onChange({ ...profile, vehicles: profile.vehicles.filter((_, j) => j !== i) })} className={REM_BTN}>
                Remove
              </button>
            </div>
          ))}
          <button type="button" onClick={() => onChange({ ...profile, vehicles: [...profile.vehicles, { type: 'car' }] })} className={ADD_BTN}>
            + Add vehicle
          </button>
        </div>
      </details>

      {/* Kids */}
      <details className={SECTION}>
        <summary className={SUMMARY}>
          Kids{profile.kids.length > 0 ? <span className="text-indigo-600 text-xs ml-1">{profile.kids.length}</span> : ''}
          <span className="text-slate-400 text-xs font-normal">▾</span>
        </summary>
        <div className={BODY}>
          {profile.kids.map((kid, i) => (
            <div key={i} className="space-y-2 pl-3 border-l-2 border-indigo-100">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Name (optional)"
                  value={kid.name ?? ''}
                  onChange={e => onChange({
                    ...profile,
                    kids: profile.kids.map((k, j) => j === i ? { ...k, name: e.target.value || undefined } : k),
                  })}
                  className={`${INPUT} flex-1`}
                />
                <button type="button" onClick={() => onChange({ ...profile, kids: profile.kids.filter((_, j) => j !== i) })} className={REM_BTN}>
                  Remove
                </button>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500 shrink-0">Birthday</label>
                <input
                  type="date"
                  value={kid.birthday}
                  onChange={e => onChange({
                    ...profile,
                    kids: profile.kids.map((k, j) => j === i ? { ...k, birthday: e.target.value } : k),
                  })}
                  className={INPUT}
                />
              </div>
              <label className={CHECK_LABEL}>
                <input
                  type="checkbox"
                  checked={kid.has_health_needs ?? false}
                  onChange={e => onChange({
                    ...profile,
                    kids: profile.kids.map((k, j) => j === i ? { ...k, has_health_needs: e.target.checked } : k),
                  })}
                  className="w-4 h-4 accent-indigo-600 rounded"
                />
                <span className="text-xs text-slate-600">Has ongoing health needs</span>
              </label>
            </div>
          ))}
          <button type="button" onClick={() => onChange({ ...profile, kids: [...profile.kids, { birthday: '' }] })} className={ADD_BTN}>
            + Add child
          </button>
        </div>
      </details>

      {/* Pets */}
      <details className={SECTION}>
        <summary className={SUMMARY}>
          Pets{profile.pets.length > 0 ? <span className="text-indigo-600 text-xs ml-1">{profile.pets.length}</span> : ''}
          <span className="text-slate-400 text-xs font-normal">▾</span>
        </summary>
        <div className={BODY}>
          {profile.pets.map((pet, i) => (
            <div key={i} className="flex items-center gap-2 pl-3 border-l-2 border-indigo-100">
              <select
                value={pet.type}
                onChange={e => onChange({
                  ...profile,
                  pets: profile.pets.map((p, j) => j === i ? { ...p, type: e.target.value as typeof pet.type } : p),
                })}
                className={SEL}
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
                className={`${INPUT} flex-1`}
              />
              <button type="button" onClick={() => onChange({ ...profile, pets: profile.pets.filter((_, j) => j !== i) })} className={REM_BTN}>
                Remove
              </button>
            </div>
          ))}
          <button type="button" onClick={() => onChange({ ...profile, pets: [...profile.pets, { type: 'dog' }] })} className={ADD_BTN}>
            + Add pet
          </button>
        </div>
      </details>

      {/* Family */}
      <details className={SECTION}>
        <summary className={SUMMARY}>
          Family{profile.family.length > 0 ? <span className="text-indigo-600 text-xs ml-1">{profile.family.length}</span> : ''}
          <span className="text-slate-400 text-xs font-normal">▾</span>
        </summary>
        <div className={BODY}>
          {profile.family.map((fm, i) => (
            <div key={i} className="space-y-2 pl-3 border-l-2 border-indigo-100">
              <div className="flex items-center gap-2">
                <select
                  value={fm.role}
                  onChange={e => onChange({
                    ...profile,
                    family: profile.family.map((f, j) => j === i ? { ...f, role: e.target.value as typeof fm.role } : f),
                  })}
                  className={SEL}
                >
                  <option value="parent">Parent</option>
                  <option value="sibling">Sibling</option>
                  <option value="aunt">Aunt</option>
                  <option value="uncle">Uncle</option>
                  <option value="nibling">Nibling (nephew/niece)</option>
                  <option value="grandparent">Grandparent</option>
                  <option value="other">Other</option>
                </select>
                <button type="button" onClick={() => onChange({ ...profile, family: profile.family.filter((_, j) => j !== i) })} className={`${REM_BTN} ml-auto`}>
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
                className={`${INPUT} w-full`}
              />
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500 shrink-0">Birthday</label>
                <input
                  type="date"
                  value={fm.birthday ?? ''}
                  onChange={e => onChange({
                    ...profile,
                    family: profile.family.map((f, j) => j === i ? { ...f, birthday: e.target.value || undefined } : f),
                  })}
                  className={INPUT}
                />
              </div>
              <textarea
                placeholder="Notes (optional)"
                value={fm.notes ?? ''}
                onChange={e => onChange({
                  ...profile,
                  family: profile.family.map((f, j) => j === i ? { ...f, notes: e.target.value || undefined } : f),
                })}
                className={`${INPUT} w-full`}
                rows={2}
              />
              <label className={CHECK_LABEL}>
                <input
                  type="checkbox"
                  checked={fm.has_health_needs ?? false}
                  onChange={e => onChange({
                    ...profile,
                    family: profile.family.map((f, j) => j === i ? { ...f, has_health_needs: e.target.checked } : f),
                  })}
                  className="w-4 h-4 accent-indigo-600 rounded"
                />
                <span className="text-xs text-slate-600">Has ongoing health needs</span>
              </label>
            </div>
          ))}
          <button type="button" onClick={() => onChange({ ...profile, family: [...profile.family, { role: 'parent' }] })} className={ADD_BTN}>
            + Add family member
          </button>
        </div>
      </details>

      {/* Team health needs */}
      {members.length > 0 && (
        <details className={SECTION}>
          <summary className={SUMMARY}>
            Health needs
            <span className="text-slate-400 text-xs font-normal">▾</span>
          </summary>
          <div className={BODY}>
            <p className="text-xs text-slate-400 mb-2">Which members of your team have ongoing health or care needs?</p>
            {members.map(m => (
              <label key={m.user_id} className={CHECK_LABEL}>
                <input
                  type="checkbox"
                  checked={profile.member_health_needs.includes(m.user_id)}
                  onChange={e => onChange({
                    ...profile,
                    member_health_needs: e.target.checked
                      ? [...profile.member_health_needs, m.user_id]
                      : profile.member_health_needs.filter(id => id !== m.user_id),
                  })}
                  className="w-4 h-4 accent-indigo-600 rounded"
                />
                {m.name}
              </label>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
