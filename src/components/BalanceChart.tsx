'use client'

import type { BalanceScore, Profile } from '@/lib/types'
import { Avatar } from './Avatar'

interface Props {
  scores: BalanceScore[]
  members: Profile[]
}

const R = 40
const CX = 50
const CY = 50
const STROKE = 18
const CIRCUMFERENCE = 2 * Math.PI * R

export function BalanceChart({ scores, members }: Props) {
  if (scores.every(s => s.total_score === 0)) {
    return (
      <p className="text-sm text-slate-500 text-center py-8">
        No tasks added yet. Add tasks to see the load distribution.
      </p>
    )
  }

  let accumulated = 0

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative w-48 h-48">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          {/* Track */}
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#f1f5f9" strokeWidth={STROKE} />
          {scores.map(score => {
            const member = members.find(m => m.id === score.member_id)
            if (!member || score.percentage === 0) return null
            const arcLen = (score.percentage / 100) * CIRCUMFERENCE
            const offset = -accumulated
            accumulated += arcLen
            return (
              <circle
                key={score.member_id}
                cx={CX}
                cy={CY}
                r={R}
                fill="none"
                stroke={member.avatar_colour}
                strokeWidth={STROKE}
                strokeDasharray={`${arcLen} ${CIRCUMFERENCE}`}
                strokeDashoffset={offset}
                strokeLinecap="butt"
              />
            )
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="w-full space-y-2.5">
        {scores.map(score => {
          const member = members.find(m => m.id === score.member_id)
          if (!member) return null
          return (
            <div key={score.member_id} className="flex items-center gap-3">
              <Avatar profile={member} size="xs" />
              <span className="text-sm font-medium text-slate-800 flex-1">{member.name}</span>
              <span className="text-sm font-semibold text-slate-900">{score.percentage}%</span>
              <span className="text-xs text-slate-400 w-32 text-right">
                {score.owned_score} owned · {score.pickup_score} pickups
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
