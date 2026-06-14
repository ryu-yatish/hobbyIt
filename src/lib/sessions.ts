import type { AppData, Hobby, Session } from './types'

export const sessionMinutes = (startedAt: string, endedAt: string) =>
  Math.max(1, Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000))

export const normalizeSession = (session: Session): Session => ({
  ...session,
  durationMinutes: sessionMinutes(session.startedAt, session.endedAt),
})

const earliestSessionForHobby = (sessions: Session[], hobbyId: string) => {
  const hobbySessions = sessions
    .filter((session) => session.hobbyId === hobbyId)
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())
  return hobbySessions[0]?.startedAt ?? null
}

const blockMinutesForHobby = (hobby: Hobby, sessions: Session[]) => {
  if (!hobby.blockStartedAt) {
    return sessions
      .filter((session) => session.hobbyId === hobby.id)
      .reduce((total, session) => total + session.durationMinutes, 0)
  }
  const blockStart = new Date(hobby.blockStartedAt).getTime()
  return sessions
    .filter(
      (session) =>
        session.hobbyId === hobby.id && new Date(session.startedAt).getTime() >= blockStart,
    )
    .reduce((total, session) => total + session.durationMinutes, 0)
}

const rotateHobbyInTrack = (data: AppData, hobbyId: string, rotationTime: string): AppData => ({
  ...data,
  tracks: data.tracks.map((track) => {
    if (!track.rotateOnCompletion || !track.hobbyIds.includes(hobbyId)) {
      return track
    }
    return {
      ...track,
      hobbyIds: [...track.hobbyIds.filter((id) => id !== hobbyId), hobbyId],
    }
  }),
  hobbies: data.hobbies.map((hobby) =>
    hobby.id === hobbyId
      ? {
          ...hobby,
          blockStartedAt: rotationTime,
          checklist: [],
          rotations: hobby.rotations + 1,
        }
      : hobby,
  ),
})

const ensureBlockStartedAt = (data: AppData): AppData => ({
  ...data,
  hobbies: data.hobbies.map((hobby) => {
    if (hobby.blockStartedAt) {
      return hobby
    }
    const earliest = earliestSessionForHobby(data.sessions, hobby.id)
    return earliest ? { ...hobby, blockStartedAt: earliest } : hobby
  }),
})

export const reconcileAfterSessionChange = (data: AppData): AppData => {
  let next = ensureBlockStartedAt(data)

  for (const track of next.tracks) {
    if (!track.rotateOnCompletion) {
      continue
    }

    const firstActiveId = track.hobbyIds.find((id) => {
      const hobby = next.hobbies.find((item) => item.id === id)
      return hobby?.status === 'active'
    })

    if (!firstActiveId) {
      continue
    }

    const hobby = next.hobbies.find((item) => item.id === firstActiveId)
    if (!hobby || hobby.targetHours <= 0) {
      continue
    }

    const blockMinutes = blockMinutesForHobby(hobby, next.sessions)
    if (blockMinutes >= hobby.targetHours * 60) {
      next = rotateHobbyInTrack(next, firstActiveId, new Date().toISOString())
    }
  }

  return next
}

export const upsertSession = (data: AppData, session: Session): AppData => {
  const normalized = normalizeSession(session)
  const existingIndex = data.sessions.findIndex((item) => item.id === normalized.id)
  const sessions =
    existingIndex >= 0
      ? data.sessions.map((item, index) => (index === existingIndex ? normalized : item))
      : [normalized, ...data.sessions]

  return reconcileAfterSessionChange({ ...data, sessions })
}

export const deleteSession = (data: AppData, sessionId: string): AppData => {
  const sessions = data.sessions.filter((session) => session.id !== sessionId)
  return reconcileAfterSessionChange({ ...data, sessions })
}
