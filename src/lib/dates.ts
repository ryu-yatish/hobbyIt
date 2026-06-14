export const localDateKey = (date: Date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const weekStart = (date: Date = new Date()) => {
  const start = new Date(date)
  const day = start.getDay() || 7
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - day + 1)
  return start
}

export const daysAgo = (count: number) => {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - count)
  return date
}

export const parseLocalDateTime = (dateKey: string, time: string) => {
  const [hours, minutes] = time.split(':').map(Number)
  const date = new Date(`${dateKey}T00:00:00`)
  date.setHours(hours || 0, minutes || 0, 0, 0)
  return date
}

export const toTimeInput = (iso: string) => {
  const date = new Date(iso)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export const toDateInput = (iso: string) => localDateKey(new Date(iso))
