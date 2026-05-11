import { describe, it, expect, afterEach } from 'vitest'
import { testSupabase } from '@/test-utils/supabase'

const BASE = 'http://localhost:3000'
const createdIds: string[] = []

afterEach(async () => {
  for (const id of createdIds) {
    await testSupabase.from('invites').delete().eq('household_id', id)
    await testSupabase.from('households').delete().eq('id', id)
  }
  createdIds.length = 0
})

describe('POST /h/[householdId]/invite', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const res = await fetch(`${BASE}/h/fake-id/invite`, { method: 'POST' })
    expect(res.status).toBe(401)
  })

  it('returns a join URL with a 32-char hex token', async () => {
    const { data: hh } = await testSupabase.from('households').insert({ name: 'TDD Test' }).select().single()
    createdIds.push(hh!.id)
    // Note: requires a valid session cookie — run against dev server with a logged-in user
    const res = await fetch(`${BASE}/h/${hh!.id}/invite`, { method: 'POST', credentials: 'include' })
    expect(res.ok).toBe(true)
    const { url } = await res.json()
    expect(url).toMatch(/\/join\/[a-f0-9]{32}$/)
  })
})

describe('Invite token expiry (via Supabase direct)', () => {
  it('expired token returns no rows when filtered by expires_at', async () => {
    const { data: hh } = await testSupabase.from('households').insert({ name: 'Expiry Test' }).select().single()
    createdIds.push(hh!.id)
    await testSupabase.from('invites').insert({
      household_id: hh!.id,
      token: 'expired-test-token',
      created_by: null,
      expires_at: new Date(Date.now() - 1000).toISOString(),
    })
    const { data } = await testSupabase
      .from('invites').select().eq('token', 'expired-test-token').gt('expires_at', new Date().toISOString())
    expect(data).toHaveLength(0)
  })

  it('valid token returns a row', async () => {
    const { data: hh } = await testSupabase.from('households').insert({ name: 'Valid Test' }).select().single()
    createdIds.push(hh!.id)
    await testSupabase.from('invites').insert({
      household_id: hh!.id,
      token: 'valid-test-token',
      created_by: null,
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    })
    const { data } = await testSupabase
      .from('invites').select().eq('token', 'valid-test-token').gt('expires_at', new Date().toISOString())
    expect(data).toHaveLength(1)
  })
})
