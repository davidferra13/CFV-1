function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value)
  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hour: value('hour'),
    minute: value('minute'),
    second: value('second'),
  }
}

function zoneOffsetMs(date: Date, timeZone: string) {
  const part = zonedParts(date, timeZone)
  const representedAsUtc = Date.UTC(
    part.year,
    part.month - 1,
    part.day,
    part.hour,
    part.minute,
    part.second
  )
  return representedAsUtc - date.getTime()
}

function localMidnightUtc(year: number, month: number, day: number, timeZone: string) {
  const guess = new Date(Date.UTC(year, month - 1, day))
  let result = new Date(guess.getTime() - zoneOffsetMs(guess, timeZone))
  result = new Date(guess.getTime() - zoneOffsetMs(result, timeZone))
  return result
}

export function previousLocalDayRange(timeZone: string, now = new Date()) {
  const today = zonedParts(now, timeZone)
  const calendarToday = new Date(Date.UTC(today.year, today.month - 1, today.day))
  const previous = new Date(calendarToday.getTime() - 86_400_000)
  const year = previous.getUTCFullYear()
  const month = previous.getUTCMonth() + 1
  const day = previous.getUTCDate()
  const localDate = [year, String(month).padStart(2, '0'), String(day).padStart(2, '0')].join('-')

  return {
    localDate,
    startAt: localMidnightUtc(year, month, day, timeZone).toISOString(),
    endAt: localMidnightUtc(today.year, today.month, today.day, timeZone).toISOString(),
  }
}
