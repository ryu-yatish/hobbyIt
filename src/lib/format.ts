export const minutesToHours = (minutes: number) => minutes / 60

export const formatHours = (minutes: number) => `${minutesToHours(minutes).toFixed(1)}h`

export const formatTimer = (seconds: number) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return [hours, minutes, secs].map((value) => value.toString().padStart(2, '0')).join(':')
}

export const formatDateHeader = (dateKey: string) => {
  const date = new Date(`${dateKey}T12:00:00`)
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
}
