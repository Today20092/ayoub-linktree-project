export const counters = ['entered', 'approached', 'delivered']
export const methods = [
  'Cash',
  'Zelle',
  'Venmo',
  'PayPal',
  'Cash App',
  'Other',
  'Stripe',
]
export const phases = ['travel', 'shop', 'break', 'finished']

export function moneyCents(value) {
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(String(value).trim()))
    throw new Error(
      'Enter a positive dollar amount with up to two decimal places.',
    )
  const cents = Math.round(Number(value) * 100)
  if (cents <= 0) throw new Error('The amount must be greater than zero.')
  return cents
}

export function localDate(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function selectDate(store, date = localDate()) {
  const now = new Date(`${date}T12:00:00`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || localDate(now) !== date)
    throw new Error('Choose a valid work date.')
  let selected = store.days.find((d) => d.date === date)
  if (!selected) {
    selected = newDay(now)
    store.days.push(selected)
  }
  store.selectedDayId = selected.id
  return selected
}

export function newDay(now = new Date()) {
  return {
    id: crypto.randomUUID(),
    date: localDate(now),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    suggestedPriceCents: 2000,
    notes: '',
    visits: [],
    timeline: [],
    payments: [],
  }
}

// Intervals use timestamps, so locking the phone or closing the tab does not stop time.
export function totals(day, now = Date.now()) {
  const result = {
    workMs: 0,
    travelMs: 0,
    shopMs: 0,
    breakMs: 0,
    customerCents: 0,
    shopCents: 0,
    expenseCents: 0,
    stripePurchases: 0,
    manualPurchases: 0,
    entered: 0,
    approached: 0,
    delivered: 0,
    visitMs: {},
  }
  day.timeline.forEach((event, index) => {
    const end = day.timeline[index + 1]?.at ?? now
    const duration = Math.max(0, end - event.at)
    if (event.phase === 'finished') return
    result[`${event.phase}Ms`] += duration
    if (event.phase !== 'break') result.workMs += duration
    if (event.phase === 'shop')
      result.visitMs[event.visitId] =
        (result.visitMs[event.visitId] ?? 0) + duration
  })
  for (const visit of day.visits)
    for (const key of counters) result[key] += visit.counts[key]
  for (const payment of day.payments) {
    if (payment.method === 'Stripe') result.stripePurchases++
    else {
      result[`${payment.kind}Cents`] += payment.cents
      if (payment.kind === 'customer') result.manualPurchases++
    }
  }
  result.knownNetCents =
    result.customerCents + result.shopCents - result.expenseCents
  result.purchases = result.stripePurchases + result.manualPurchases
  return result
}

export function validateStore(store) {
  const fail = () => {
    throw new Error(
      'This file is not a valid barber tracker backup. Existing records were kept.',
    )
  }
  const text = (x, max = 20000) => typeof x === 'string' && x.length <= max
  const at = (x) => Number.isSafeInteger(x) && x > 0 && x <= 8640000000000000
  const cents = (x) => Number.isSafeInteger(x) && x >= 0 && x <= 999999999
  const unique = (rows) =>
    rows.every((x) => x && text(x.id, 100) && x.id.length > 0) &&
    new Set(rows.map((x) => x.id)).size === rows.length
  if (
    !store ||
    store.schemaVersion !== 1 ||
    store.currency !== 'USD' ||
    !Array.isArray(store.days) ||
    store.days.length > 10000
  )
    fail()
  if (!unique(store.days) || !text(store.selectedDayId, 100)) fail()
  let activeDays = 0
  for (const day of store.days) {
    if (
      !day ||
      !text(day.id, 100) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(day.date) ||
      !text(day.timezone, 100) ||
      !text(day.notes) ||
      !cents(day.suggestedPriceCents)
    )
      fail()
    if (
      ![day.visits, day.timeline, day.payments].every(
        (x) => Array.isArray(x) && x.length <= 100000,
      )
    )
      fail()
    if (![day.visits, day.timeline, day.payments].every(unique)) fail()
    if (day.timeline.length && day.timeline.at(-1).phase !== 'finished')
      activeDays++
    if (activeDays > 1) fail()
    for (const visit of day.visits) {
      if (
        !visit ||
        !text(visit.id, 100) ||
        !text(visit.name, 200) ||
        !visit.name.trim() ||
        !text(visit.address, 1000) ||
        !text(visit.notes) ||
        !at(visit.createdAt) ||
        !visit.counts ||
        !counters.every(
          (key) =>
            Number.isSafeInteger(visit.counts[key]) &&
            visit.counts[key] >= 0 &&
            visit.counts[key] <= 1000000,
        )
      )
        fail()
      if (
        visit.location !== null &&
        (!visit.location ||
          !Number.isFinite(visit.location.latitude) ||
          Math.abs(visit.location.latitude) > 90 ||
          !Number.isFinite(visit.location.longitude) ||
          Math.abs(visit.location.longitude) > 180 ||
          !Number.isFinite(visit.location.accuracy) ||
          visit.location.accuracy < 0 ||
          !at(visit.location.at))
      )
        fail()
    }
    const visitExists = (id) => day.visits.some((v) => v.id === id)
    for (const [index, event] of day.timeline.entries()) {
      if (
        !event ||
        !text(event.id, 100) ||
        !phases.includes(event.phase) ||
        !at(event.at) ||
        !text(event.notes) ||
        (index > 0 && event.at < day.timeline[index - 1].at)
      )
        fail()
      if (event.visitId !== null && !visitExists(event.visitId)) fail()
      if (event.phase === 'shop' && event.visitId === null) fail()
      const previous = day.timeline[index - 1]
      if (
        (!previous && event.phase !== 'travel') ||
        previous?.phase === event.phase
      )
        fail()
      if (previous?.phase === 'finished' && event.phase !== 'travel') fail()
      if (previous?.phase === 'break' && event.phase !== 'finished') {
        const resumed = day.timeline[index - 2]
        if (
          !resumed ||
          resumed.phase !== event.phase ||
          resumed.visitId !== event.visitId
        )
          fail()
      }
    }
    for (const payment of day.payments) {
      if (
        !payment ||
        !text(payment.id, 100) ||
        !at(payment.at) ||
        !['customer', 'shop', 'expense'].includes(payment.kind) ||
        !methods.includes(payment.method) ||
        !text(payment.notes) ||
        (payment.visitId !== null && !visitExists(payment.visitId))
      )
        fail()
      if (payment.method === 'Stripe') {
        if (payment.kind !== 'customer' || payment.cents !== null) fail()
      } else if (!cents(payment.cents) || payment.cents === 0) fail()
    }
  }
  if (
    store.days.length &&
    !store.days.some((d) => d.id === store.selectedDayId)
  )
    fail()
  return store
}

export function exportCsv(store, now = Date.now()) {
  const columns = [
    'record_type',
    'day_id',
    'date',
    'timezone',
    'visit_id',
    'shop',
    'address',
    'timestamp_iso',
    'phase',
    'entered',
    'approached',
    'photos_delivered',
    'payment_kind',
    'payment_method',
    'amount_usd',
    'latitude',
    'longitude',
    'accuracy_m',
    'notes',
    'work_hours',
    'shop_hours',
    'travel_hours',
    'break_hours',
    'manual_customer_usd',
    'shop_usd',
    'expenses_usd',
    'stripe_purchase_count',
    'suggested_price_usd',
  ]
  const rows = [columns]
  for (const day of store.days) {
    const sum = totals(day, now)
    const base = { day_id: day.id, date: day.date, timezone: day.timezone }
    const push = (record) =>
      rows.push(columns.map((key) => ({ ...base, ...record })[key] ?? ''))
    push({
      record_type: 'day',
      notes: day.notes,
      work_hours: sum.workMs / 3600000,
      shop_hours: sum.shopMs / 3600000,
      travel_hours: sum.travelMs / 3600000,
      break_hours: sum.breakMs / 3600000,
      manual_customer_usd: sum.customerCents / 100,
      shop_usd: sum.shopCents / 100,
      expenses_usd: sum.expenseCents / 100,
      stripe_purchase_count: sum.stripePurchases,
      suggested_price_usd: day.suggestedPriceCents / 100,
    })
    for (const visit of day.visits)
      push({
        record_type: 'visit',
        visit_id: visit.id,
        shop: visit.name,
        address: visit.address,
        timestamp_iso: new Date(visit.createdAt).toISOString(),
        entered: visit.counts.entered,
        approached: visit.counts.approached,
        photos_delivered: visit.counts.delivered,
        latitude: visit.location?.latitude,
        longitude: visit.location?.longitude,
        accuracy_m: visit.location?.accuracy,
        notes: visit.notes,
      })
    for (const event of day.timeline)
      push({
        record_type: 'timer',
        visit_id: event.visitId,
        timestamp_iso: new Date(event.at).toISOString(),
        phase: event.phase,
        notes: event.notes,
      })
    for (const payment of day.payments)
      push({
        record_type: 'payment',
        visit_id: payment.visitId,
        timestamp_iso: new Date(payment.at).toISOString(),
        payment_kind: payment.kind,
        payment_method: payment.method,
        amount_usd: payment.cents === null ? '' : payment.cents / 100,
        notes: payment.notes,
      })
  }
  // Prevent notes and shop names from becoming spreadsheet formulas when opened.
  const quote = (value) =>
    `"${String(value)
      .replace(/^[=+@\-\t\r]/, "'$&")
      .replaceAll('"', '""')}"`
  return '\ufeff' + rows.map((row) => row.map(quote).join(',')).join('\r\n')
}
