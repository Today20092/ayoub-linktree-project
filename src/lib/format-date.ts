/** Formats a calendar date in UTC so event dates never shift with the server zone. */
export const formatUtcDate = (date: Date, month: 'long' | 'short' = 'long') =>
  new Intl.DateTimeFormat('en-US', {
    month,
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
