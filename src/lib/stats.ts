import { localDateKey, weekStart } from './dates'
import type { AppData, Hobby, Session } from './types'

export const sumSessions = (sessions: Session[], predicate: (session: Session) => boolean) =>
  sessions.filter(predicate).reduce((total, session) => total + session.durationMinutes, 0)

export const getHobby = (data: AppData, id: string) => data.hobbies.find((hobby) => hobby.id === id)

export const todayMinutes = (sessions: Session[]) => {
  const key = localDateKey()
  return sumSessions(sessions, (session) => localDateKey(new Date(session.startedAt)) === key)
}

export const weekMinutes = (sessions: Session[]) => {
  const week = weekStart()
  return sumSessions(sessions, (session) => new Date(session.startedAt) >= week)
}

export const blockProgressMinutes = (hobby: Hobby, sessions: Session[]) => {
  if (!hobby.blockStartedAt) {
    return sumSessions(sessions, (session) => session.hobbyId === hobby.id)
  }
  const blockStart = new Date(hobby.blockStartedAt).getTime()
  return sumSessions(
    sessions,
    (session) => session.hobbyId === hobby.id && new Date(session.startedAt).getTime() >= blockStart,
  )
}

export type StatsRange = 7 | 14 | 30 | 'all'

export const rangeStart = (range: StatsRange) => {
  if (range === 'all') {
    return null
  }
  return daysAgo(range - 1)
}

const daysAgo = (count: number) => {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - count)
  return date
}

export const sessionsInRange = (sessions: Session[], range: StatsRange) => {
  const start = rangeStart(range)
  if (!start) {
    return sessions
  }
  return sessions.filter((session) => new Date(session.startedAt) >= start)
}

export const dailyMinutes = (sessions: Session[], range: StatsRange) => {
  const filtered = sessionsInRange(sessions, range)
  const map = new Map<string, number>()
  for (const session of filtered) {
    const key = localDateKey(new Date(session.startedAt))
    map.set(key, (map.get(key) ?? 0) + session.durationMinutes)
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, minutes]) => ({ date, minutes, hours: minutes / 60 }))
}

export const hobbyBreakdown = (data: AppData, sessions: Session[], range: StatsRange) => {
  const filtered = sessionsInRange(sessions, range)
  const map = new Map<string, number>()
  for (const session of filtered) {
    map.set(session.hobbyId, (map.get(session.hobbyId) ?? 0) + session.durationMinutes)
  }
  return [...map.entries()]
    .map(([hobbyId, minutes]) => ({
      hobbyId,
      name: getHobby(data, hobbyId)?.name ?? 'Deleted hobby',
      color: getHobby(data, hobbyId)?.color ?? '#888',
      minutes,
      hours: minutes / 60,
    }))
    .sort((a, b) => b.minutes - a.minutes)
}

export const categoryBreakdown = (data: AppData, sessions: Session[], range: StatsRange) => {
  const filtered = sessionsInRange(sessions, range)
  const map = new Map<string, number>()
  for (const session of filtered) {
    const hobby = getHobby(data, session.hobbyId)
    const category = hobby?.category ?? 'Unknown'
    map.set(category, (map.get(category) ?? 0) + session.durationMinutes)
  }
  return [...map.entries()]
    .map(([category, minutes]) => ({
      category,
      minutes,
      hours: minutes / 60,
      budget: data.allocations.find((item) => item.category === category)?.weeklyHours ?? 0,
    }))
    .sort((a, b) => b.minutes - a.minutes)
}

export const energyTrend = (sessions: Session[], range: StatsRange) => {
  const filtered = sessionsInRange(sessions, range)
  const map = new Map<string, { total: number; count: number }>()
  for (const session of filtered) {
    const key = localDateKey(new Date(session.startedAt))
    const avg = (session.energyBefore + session.energyAfter) / 2
    const current = map.get(key) ?? { total: 0, count: 0 }
    map.set(key, { total: current.total + avg, count: current.count + 1 })
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { total, count }]) => ({ date, energy: total / count }))
}

export const summaryStats = (data: AppData, sessions: Session[], range: StatsRange) => {
  const filtered = sessionsInRange(sessions, range)
  const totalMinutes = filtered.reduce((sum, session) => sum + session.durationMinutes, 0)
  const breakdown = hobbyBreakdown(data, sessions, range)
  return {
    totalMinutes,
    sessionCount: filtered.length,
    avgMinutes: filtered.length ? totalMinutes / filtered.length : 0,
    topHobby: breakdown[0]?.name ?? '—',
  }
}
