'use client'

import type { BalanceScore, Profile } from '@/lib/types'

interface Props {
  scores: BalanceScore[]
  members: Profile[]
}

export function BalanceChart({ scores, members }: Props) {
  if (scores.every(s => s.total_score === 0)) {
    return (
      <p className="text-sm text-gray-500 text-center py-8">
        No tasks added yet. Add tasks to see the load distribution.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {scores.map(score => {
        const member = members.find(m => m.id === score.member_id)
        if (!member) return null
        return (
          <div key={score.member_id}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">{member.name}</span>
              <span className="text-sm text-gray-500">{score.percentage}%</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${score.percentage}%`, backgroundColor: member.avatar_colour }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Score: {score.owned_score} owned + {score.pickup_score} pickups
            </p>
          </div>
        )
      })}
    </div>
  )
}
