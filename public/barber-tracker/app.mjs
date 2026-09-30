import {
  counters,
  newDay,
  totals,
  moneyCents,
  validateStore,
  exportCsv,
} from './core.mjs'

const key = 'ayoub.barber-tracker.v1'
const $ = (id) => document.getElementById(id)
const dollars = (cents) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    cents / 100,
  )
const duration = (ms) =>
  `${Math.floor(ms / 3600000)}h ${String(Math.floor(ms / 60000) % 60).padStart(2, '0')}m`
const time = (at) =>
  new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
const phaseName = {
  travel: 'Working / travel',
  shop: 'At shop',
  break: 'Personal break',
  finished: 'Finished',
}
let savedRaw = null
let corruptRaw = null
let blocked = false
let undo = []
let visitId = null
let shopEditing = false
let location = null
let locationRequest = 0
let paymentKind = 'customer'
let paymentEditing = null
let eventEditing = null
let lastMethod = 'Cash'
let messageTimeout
let store

try {
  savedRaw = localStorage.getItem(key)
  store = savedRaw ? validateStore(JSON.parse(savedRaw)) : null
} catch {
  corruptRaw = savedRaw
  blocked = true
  $('storage-warning').hidden = false
  $('storage-warning').textContent =
    'Saved records could not be read. Export a recovery copy before restoring a valid JSON backup. Recording is paused to protect existing data.'
}
if (!store) {
  const first = newDay()
  store = {
    schemaVersion: 1,
    currency: 'USD',
    selectedDayId: first.id,
    days: [first],
  }
}

const day = () => store.days.find((d) => d.id === store.selectedDayId)
const current = () => day().timeline.at(-1)
const visit = () => day().visits.find((v) => v.id === visitId)
const activeDay = () =>
  store.days.find(
    (d) => d.timeline.length && d.timeline.at(-1).phase !== 'finished',
  )

function say(message) {
  clearTimeout(messageTimeout)
  $('message').textContent = message
  messageTimeout = setTimeout(() => {
    $('message').textContent = ''
  }, 6000)
}

function persist() {
  try {
    if (localStorage.getItem(key) !== savedRaw) {
      blocked = true
      throw new Error(
        'Another tab changed your records. Export this tab if needed, then reload before recording.',
      )
    }
    const next = JSON.stringify(store)
    localStorage.setItem(key, next)
    savedRaw = next
    $('storage-warning').hidden = true
    $('save-status').textContent = `Saved on this device · ${time(Date.now())}`
  } catch (error) {
    $('storage-warning').hidden = false
    $('storage-warning').textContent = blocked
      ? error.message
      : 'Device storage is unavailable or full. Changes are only in this open tab. Export JSON now to keep them.'
    $('save-status').textContent = 'Not saved on this device'
  }
}

function change(fn) {
  if (blocked) {
    say(
      'Recording is paused. Export your records and reload or restore a backup.',
    )
    return false
  }
  const previous = structuredClone(store)
  try {
    fn()
    validateStore(store)
  } catch (error) {
    store = previous
    say(error.message)
    return false
  }
  undo.push(previous)
  if (undo.length > 30) undo.shift()
  persist()
  render()
  return true
}

function options(select, rows, selected, emptyLabel) {
  select.replaceChildren()
  if (emptyLabel) select.add(new Option(emptyLabel, ''))
  for (const row of rows) select.add(new Option(row.label, row.id))
  select.value = selected ?? ''
}

function updateClock() {
  const sum = totals(day())
  $('work-time').textContent = duration(sum.workMs)
  $('time-breakdown').textContent =
    `Travel ${duration(sum.travelMs)} · Shop ${duration(sum.shopMs)} · Break ${duration(sum.breakMs)}`
  $('receipts').textContent = dollars(sum.customerCents + sum.shopCents)
  $('net').textContent = dollars(sum.knownNetCents)
  $('hourly').textContent = sum.workMs
    ? dollars(Math.round(sum.knownNetCents / (sum.workMs / 3600000)))
    : '—'
  $('purchases').textContent = sum.purchases
  $('payment-totals').textContent =
    `Customers ${dollars(sum.customerCents)} · Owners ${dollars(sum.shopCents)} · Costs ${dollars(sum.expenseCents)} · Stripe ${sum.stripePurchases} counted`
}

function render() {
  const d = day()
  if (!visit()) visitId = current()?.visitId ?? d.visits.at(-1)?.id ?? null
  const v = visit()
  options(
    $('day-select'),
    store.days
      .map((d) => ({
        id: d.id,
        label: `${d.date} · ${d.visits.length} shop visits`,
      }))
      .reverse(),
    d.id,
  )
  options(
    $('visit-select'),
    d.visits.map((v) => ({
      id: v.id,
      label: `${v.name} · ${time(v.createdAt)}`,
    })),
    visitId,
    d.visits.length ? null : 'No visits yet',
  )
  $('shop-address').textContent = v?.address ?? ''
  $('shop-map').hidden = !v?.location
  if (v?.location)
    $('shop-map').href =
      `https://www.google.com/maps?q=${v.location.latitude},${v.location.longitude}`
  $('visit-hint').textContent = v
    ? `Counters and notes belong to ${v.name}.`
    : 'Tap “Arrived at shop” to start your first visit.'
  for (const field of ['visit-notes', 'day-notes']) {
    const value = field === 'day-notes' ? d.notes : (v?.notes ?? '')
    if ($(field).value !== value) $(field).value = value
  }
  $('visit-notes').disabled = !v || blocked
  $('day-notes').disabled = blocked
  $('suggested-price').value = d.suggestedPriceCents / 100
  $('pricing-label').textContent = `Suggested ${dollars(d.suggestedPriceCents)}`
  $('suggested-price').disabled = blocked
  $('edit-shop').disabled = !v || blocked
  for (const c of counters) $('count-' + c).textContent = v?.counts[c] ?? 0
  document.querySelectorAll('[data-counter]').forEach((button) => {
    button.disabled =
      !v ||
      blocked ||
      (button.dataset.delta === '-1' && v.counts[button.dataset.counter] === 0)
  })
  const phase = current()?.phase
  const otherActive = activeDay()?.id && activeDay().id !== d.id
  $('phase').textContent = phaseName[phase] ?? 'Not started'
  $('start').textContent =
    phase === 'finished' ? 'More work / travel' : 'Start work / travel'
  $('start').disabled =
    blocked || otherActive || (phase && phase !== 'finished')
  $('arrive').disabled = blocked || phase !== 'travel'
  $('leave').disabled = blocked || phase !== 'shop'
  $('finish').disabled = blocked || !phase || phase === 'finished'
  $('pause').textContent =
    phase === 'break' ? 'Resume work' : 'Pause for a break'
  $('pause').disabled = blocked || !phase || phase === 'finished'
  $('new-day').disabled = blocked || Boolean(activeDay())
  $('undo').disabled = blocked || !undo.length
  document
    .querySelectorAll(
      '[data-price], #custom-payment, #stripe, #owner-payment, #expense',
    )
    .forEach((button) => {
      button.disabled = blocked
    })
  renderRecords()
  updateClock()
}

function recordText(container, text, note) {
  const line = document.createElement('p')
  line.textContent = text
  container.append(line)
  if (note) {
    const notes = document.createElement('p')
    notes.textContent = note
    notes.className = 'muted'
    container.append(notes)
  }
}

function renderRecords() {
  $('timeline').replaceChildren()
  for (const event of day().timeline) {
    const record = document.createElement('div')
    record.className = 'record'
    const button = document.createElement('button')
    button.type = 'button'
    const shop = day().visits.find((v) => v.id === event.visitId)?.name
    button.textContent = `${new Date(event.at).toLocaleString()} · ${phaseName[event.phase]}${shop ? ' · ' + shop : ''}`
    button.disabled = blocked
    button.addEventListener('click', () => openEvent(event))
    record.append(button)
    if (event.notes) recordText(record, event.notes)
    $('timeline').append(record)
  }
  if (!day().timeline.length)
    $('timeline').textContent = 'No timer records yet.'
  $('payment-records').replaceChildren()
  for (const payment of [...day().payments].reverse()) {
    const record = document.createElement('div')
    record.className = 'record'
    const shop =
      day().visits.find((v) => v.id === payment.visitId)?.name ?? 'Whole day'
    const label =
      payment.kind === 'shop'
        ? 'Owner'
        : payment.kind === 'expense'
          ? 'Expense'
          : 'Customer'
    recordText(
      record,
      `${time(payment.at)} · ${label} · ${payment.cents === null ? 'Amount in Stripe' : dollars(payment.cents)} · ${payment.method} · ${shop}`,
      payment.notes,
    )
    if (payment.method !== 'Stripe') {
      const edit = document.createElement('button')
      edit.type = 'button'
      edit.textContent = 'Edit payment'
      edit.disabled = blocked
      edit.addEventListener('click', () =>
        openPayment(payment.kind, payment.cents / 100, payment),
      )
      record.append(edit)
    }
    const remove = document.createElement('button')
    remove.type = 'button'
    remove.className = 'remove'
    remove.textContent = 'Remove mistaken entry'
    remove.disabled = blocked
    remove.addEventListener('click', () => {
      if (
        confirm(
          'Remove this mistaken entry? This does not refund a real payment.',
        )
      )
        change(() => {
          day().payments = day().payments.filter((p) => p.id !== payment.id)
        })
    })
    record.append(remove)
    $('payment-records').append(record)
  }
  if (!day().payments.length)
    $('payment-records').textContent = 'No payments recorded yet.'
}

function addEvent(phase, id = null) {
  const now = Date.now()
  if (current()?.at > now)
    throw new Error(
      'The device clock is earlier than the last record. Correct that timer record first.',
    )
  day().timeline.push({
    id: crypto.randomUUID(),
    at: now,
    phase,
    visitId: id,
    notes: '',
  })
}

$('start').addEventListener('click', () => change(() => addEvent('travel')))
$('leave').addEventListener('click', () => change(() => addEvent('travel')))
$('finish').addEventListener('click', () => change(() => addEvent('finished')))
$('pause').addEventListener('click', () =>
  change(() => {
    if (current().phase === 'break') {
      const previous = day().timeline.at(-2)
      addEvent(previous.phase, previous.visitId)
    } else addEvent('break', current().visitId)
  }),
)
$('undo').addEventListener('click', () => {
  if (!undo.length || blocked) return
  store = undo.pop()
  persist()
  render()
  say('Last change undone.')
})
$('new-day').addEventListener('click', () => {
  change(() => {
    if (activeDay()) throw new Error('Finish the active work day first.')
    if (
      !day().timeline.length &&
      !day().visits.length &&
      !day().payments.length
    )
      throw new Error('This day has not started yet. Tap Start work / travel.')
    const next = newDay()
    store.days.push(next)
    store.selectedDayId = next.id
    visitId = null
  })
})
$('day-select').addEventListener('change', () => {
  change(() => {
    store.selectedDayId = $('day-select').value
    visitId = null
  })
})
$('visit-select').addEventListener('change', () => {
  visitId = $('visit-select').value
  render()
})
document.querySelectorAll('[data-counter]').forEach((button) =>
  button.addEventListener('click', () => {
    const c = button.dataset.counter
    const delta = Number(button.dataset.delta)
    change(() => {
      visit().counts[c] = Math.max(0, visit().counts[c] + delta)
    })
  }),
)
$('visit-notes').addEventListener('input', () =>
  change(() => {
    visit().notes = $('visit-notes').value
  }),
)
$('day-notes').addEventListener('input', () =>
  change(() => {
    day().notes = $('day-notes').value
  }),
)
$('suggested-price').addEventListener('change', () =>
  change(() => {
    day().suggestedPriceCents = moneyCents($('suggested-price').value)
  }),
)

function knownShops() {
  const shops = new Map()
  for (const d of store.days) for (const v of d.visits) shops.set(v.name, v)
  return shops
}

function openShop(editing) {
  shopEditing = editing
  const v = editing ? visit() : null
  $('shop-dialog-title').textContent = editing
    ? 'Edit shop details'
    : 'Arrived at shop'
  $('shop-name').value = v?.name ?? ''
  $('shop-street').value = v?.address ?? ''
  location = v?.location ? structuredClone(v.location) : null
  locationRequest++
  $('saved-shops').replaceChildren(
    ...[...knownShops().keys()].map((name) => new Option(name, name)),
  )
  showLocation()
  $('shop-dialog').showModal()
}

function showLocation() {
  $('location-status').textContent = location
    ? `GPS saved · ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)} · accuracy about ${Math.round(location.accuracy)}m`
    : 'Optional. Saves GPS coordinates, not the shop name.'
}
$('arrive').addEventListener('click', () => openShop(false))
$('edit-shop').addEventListener('click', () => openShop(true))
$('shop-name').addEventListener('change', () => {
  if (shopEditing) return
  const previous = knownShops().get($('shop-name').value)
  if (previous) {
    $('shop-street').value = previous.address
    location = previous.location ? structuredClone(previous.location) : null
    showLocation()
  }
})
$('locate').addEventListener('click', () => {
  if (!navigator.geolocation) {
    $('location-status').textContent =
      'Location is unavailable. You can type the address.'
    return
  }
  const request = ++locationRequest
  $('location-status').textContent = 'Finding your location…'
  navigator.geolocation.getCurrentPosition(
    (position) => {
      if (request !== locationRequest || !$('shop-dialog').open) return
      location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        at: position.timestamp,
      }
      showLocation()
    },
    (error) => {
      if (request !== locationRequest || !$('shop-dialog').open) return
      $('location-status').textContent =
        error.code === 1
          ? 'Location permission was denied. You can type the address.'
          : 'Could not get location. Try again or type the address.'
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
  )
})
$('shop-form').addEventListener('submit', (event) => {
  event.preventDefault()
  const name = $('shop-name').value.trim()
  if (!name) {
    $('shop-name').setCustomValidity('Enter the shop name.')
    $('shop-name').reportValidity()
    return
  }
  if (
    change(() => {
      const address = $('shop-street').value.trim()
      if (shopEditing) Object.assign(visit(), { name, address, location })
      else {
        if (current()?.phase !== 'travel')
          throw new Error('Start work / travel before arriving at a shop.')
        const v = {
          id: crypto.randomUUID(),
          name,
          address,
          location,
          createdAt: Date.now(),
          counts: { entered: 0, approached: 0, delivered: 0 },
          notes: '',
        }
        day().visits.push(v)
        visitId = v.id
        addEvent('shop', v.id)
      }
    })
  )
    $('shop-dialog').close()
})
$('shop-name').addEventListener('input', () =>
  $('shop-name').setCustomValidity(''),
)

function openPayment(kind, amount = '', existing = null) {
  paymentKind = kind
  paymentEditing = existing?.id ?? null
  $('payment-dialog-title').textContent =
    kind === 'expense'
      ? 'Record expense'
      : kind === 'shop'
        ? 'Shop owner payment'
        : 'Customer payment'
  $('amount-label').textContent =
    kind === 'expense' ? 'Amount spent ($)' : 'Amount received ($)'
  $('payment-amount').value = amount
  $('payment-method').value =
    existing?.method ?? (kind === 'expense' ? 'Other' : lastMethod)
  $('payment-note').value = existing?.notes ?? ''
  $('payment-error').textContent = ''
  options(
    $('payment-visit'),
    day().visits.map((v) => ({
      id: v.id,
      label: `${v.name} · ${time(v.createdAt)}`,
    })),
    existing?.visitId ?? visitId,
    'Whole day / not assigned',
  )
  $('payment-dialog').showModal()
}
document
  .querySelectorAll('[data-price]')
  .forEach((button) =>
    button.addEventListener('click', () =>
      openPayment('customer', button.dataset.price),
    ),
  )
$('custom-payment').addEventListener('click', () => openPayment('customer'))
$('owner-payment').addEventListener('click', () => openPayment('shop'))
$('expense').addEventListener('click', () => openPayment('expense'))
$('stripe').addEventListener('click', () => {
  if (
    change(() =>
      day().payments.push({
        id: crypto.randomUUID(),
        kind: 'customer',
        method: 'Stripe',
        cents: null,
        at: Date.now(),
        visitId,
        notes: '',
      }),
    )
  )
    say('Stripe purchase counted. Amount stays in Stripe.')
})
$('payment-form').addEventListener('submit', (event) => {
  event.preventDefault()
  try {
    const cents = moneyCents($('payment-amount').value)
    const method = $('payment-method').value
    const changed = change(() => {
      const fields = {
        kind: paymentKind,
        method,
        cents,
        visitId: $('payment-visit').value || null,
        notes: $('payment-note').value,
      }
      if (paymentEditing)
        Object.assign(
          day().payments.find((p) => p.id === paymentEditing),
          fields,
        )
      else
        day().payments.push({
          id: crypto.randomUUID(),
          at: Date.now(),
          ...fields,
        })
    })
    if (changed) {
      lastMethod = method
      $('payment-dialog').close()
      say(
        `${dollars(cents)} ${paymentKind === 'expense' ? 'expense' : 'payment'} saved.`,
      )
    }
  } catch (error) {
    $('payment-error').textContent = error.message
  }
})

function openEvent(event) {
  eventEditing = event.id
  const date = new Date(event.at)
  $('event-time').value = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000,
  )
    .toISOString()
    .slice(0, 19)
  $('event-note').value = event.notes
  $('event-error').textContent = ''
  $('event-dialog').showModal()
}
$('event-form').addEventListener('submit', (event) => {
  event.preventDefault()
  const at = new Date($('event-time').value).getTime()
  const index = day().timeline.findIndex((e) => e.id === eventEditing)
  if (
    !Number.isFinite(at) ||
    at > Date.now() ||
    (index > 0 && at < day().timeline[index - 1].at) ||
    (index < day().timeline.length - 1 && at > day().timeline[index + 1].at)
  ) {
    $('event-error').textContent =
      'Use a time between the surrounding records, no later than now.'
    return
  }
  if (
    change(() =>
      Object.assign(day().timeline[index], {
        at,
        notes: $('event-note').value,
      }),
    )
  )
    $('event-dialog').close()
})
document
  .querySelectorAll('[data-close]')
  .forEach((button) =>
    button.addEventListener('click', () => $(button.dataset.close).close()),
  )

function download(text, filename, type) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60000)
  $('export-status').textContent =
    'Download requested. Check Downloads and move the file into your Syncthing folder.'
}
const filename = (suffix) =>
  `barber-tracker-${newDay().date}-${new Date().toISOString().slice(11, 19).replaceAll(':', '')}.${suffix}`
$('export-json').addEventListener('click', () => {
  if (corruptRaw !== null) {
    download(corruptRaw, filename('recovery.json'), 'application/json')
    return
  }
  download(
    JSON.stringify(
      {
        ...store,
        exportedAt: new Date().toISOString(),
        analysisNotes:
          'Stripe amounts are excluded. Merge Stripe records separately and avoid double-counting optional Stripe purchase tallies. Timer states are work/travel, shop, personal break, finished. Counters count people; payments count purchasing transactions. Monetary values are integer USD cents.',
      },
      null,
      2,
    ),
    filename('json'),
    'application/json',
  )
})
$('export-csv').addEventListener('click', () => {
  if (corruptRaw !== null) {
    say('Export the recovery JSON first. CSV requires valid records.')
    return
  }
  download(exportCsv(store), filename('csv'), 'text/csv;charset=utf-8')
})
$('restore').addEventListener('click', () => $('restore-file').click())
$('restore-file').addEventListener('change', async () => {
  const file = $('restore-file').files[0]
  if (!file) return
  try {
    if (file.size > 20 * 1024 * 1024)
      throw new Error('Choose a JSON backup smaller than 20 MB.')
    const restored = validateStore(JSON.parse(await file.text()))
    if (!restored.days.length) throw new Error('This backup has no work days.')
    if (
      !confirm(
        `Restore ${restored.days.length} work days? This replaces records on this browser. Export your current records first if you need to keep them.`,
      )
    )
      return
    // Saving must succeed before the current in-memory records are replaced.
    const raw = JSON.stringify(restored)
    localStorage.setItem(key, raw)
    savedRaw = raw
    store = restored
    corruptRaw = null
    blocked = false
    undo = []
    visitId = null
    $('storage-warning').hidden = true
    $('save-status').textContent = 'Backup restored and saved on this device'
    render()
    say('Backup restored.')
  } catch (error) {
    say(
      error.message ||
        'Could not restore that file. Existing records were kept.',
    )
  } finally {
    $('restore-file').value = ''
  }
})
window.addEventListener('storage', (event) => {
  if (event.key !== key && event.key !== null) return
  blocked = true
  $('storage-warning').hidden = false
  $('storage-warning').textContent =
    'Another tab changed your records. Export this tab if needed, then reload before recording.'
  render()
})

async function setupOffline() {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) {
    $('offline-status').textContent =
      'Offline reopening needs the hosted HTTPS page.'
    return
  }
  try {
    const registration = await navigator.serviceWorker.register('./sw.js', {
      scope: './',
    })
    if (!registration.active)
      await new Promise((resolve, reject) => {
        const worker = registration.installing ?? registration.waiting
        if (!worker) {
          reject(new Error('No offline worker'))
          return
        }
        worker.addEventListener('statechange', () => {
          if (worker.state === 'activated') resolve()
          if (worker.state === 'redundant')
            reject(new Error('Offline setup failed'))
        })
      })
    $('offline-status').textContent = 'Ready to reopen offline'
  } catch {
    $('offline-status').textContent =
      'Offline setup failed. Keep this tab open and retry online.'
  }
}

if (!blocked) persist()
render()
setInterval(updateClock, 10000)
setupOffline()
