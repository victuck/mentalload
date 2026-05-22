import type { Profile } from '@/lib/types'

interface Props {
  profile: Pick<Profile, 'name' | 'avatar_colour' | 'avatar_url'>
  size?: 'xs' | 'sm' | 'md'
  className?: string
}

const SIZE_CLASSES = {
  xs: 'w-4 h-4 text-[9px]',
  sm: 'w-6 h-6 text-[11px]',
  md: 'w-8 h-8 text-sm',
}

export function Avatar({ profile, size = 'sm', className = '' }: Props) {
  const sizeClass = SIZE_CLASSES[size]
  if (profile.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={profile.avatar_url}
        alt={profile.name}
        className={`${sizeClass} rounded-full object-cover shrink-0 ${className}`}
      />
    )
  }
  return (
    <span
      className={`${sizeClass} rounded-full flex items-center justify-center text-white font-bold shrink-0 ${className}`}
      style={{ backgroundColor: profile.avatar_colour }}
    >
      {profile.name[0]}
    </span>
  )
}
