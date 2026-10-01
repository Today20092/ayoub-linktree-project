import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  moneyCents,
  newDay,
  localDate,
  selectDate,
  totals,
  validateStore,
  exportCsv,
} from '../public/barber-tracker/core.mjs'

test('date selection uses device-local today, skips empty days, and keeps saved work', () => {
  const local = new Date(2026, 9, 1, 0, 15)
  assert.equal(localDate(local), '2026-10-01')
  const store = {
    schemaVersion: 1,
    currency: 'USD',
    selectedDayId: '',
    days: [],
  }
  const previous = selectDate(store, '2026-09-28')
  previous.notes = 'Keep this day'
  previous.timeline.push({
    id: 'start',
    at: local.getTime() - 3600000,
    phase: 'travel',
    visitId: null,
    notes: '',
  })
  const today = selectDate(store)
  assert.equal(today.date, localDate())
  const restored = validateStore(JSON.parse(JSON.stringify(store)))
  selectDate(restored)
  assert.equal(restored.selectedDayId, today.id)
  assert.equal(restored.days.length, 2)
  const running = restored.days.find((d) => d.id === previous.id)
  assert.equal(running.notes, 'Keep this day')
  assert.equal(totals(running, local.getTime()).workMs, 3600000)
  assert.equal(totals(running, local.getTime() + 600000).workMs, 4200000)
  const future = selectDate(restored, '2027-01-03')
  assert.equal(future.date, '2027-01-03')
  assert.equal(restored.days.length, 3)
  assert.equal(selectDate(restored, '2026-09-28').id, previous.id)
  assert.equal(restored.days.length, 3)
  const duplicate = newDay(new Date('2026-09-28T12:00:00'))
  restored.days.push(duplicate)
  selectDate(restored, '2026-09-28')
  assert.ok(restored.days.includes(duplicate))
  for (const invalid of ['', '2026-02-30', '2026-13-01', 'not-a-date'])
    assert.throws(() => selectDate(restored, invalid))
  validateStore(restored)
})

test('a two-shop day survives export, keeps Stripe unknown, and excludes breaks', () => {
  const day = newDay(new Date('2026-09-30T14:00:00Z'))
  const begin = Date.parse('2026-09-30T14:00:00Z')
  const visit = (id) => ({
    id,
    name: 'Shop ' + id,
    address: 'Tampa',
    notes: 'Fast delivery',
    createdAt: begin,
    location: null,
    counts: { entered: 12, approached: 10, delivered: 4 },
  })
  day.visits = [visit('a'), visit('b')]
  day.timeline = [
    [0, 'travel', null],
    [30, 'shop', 'a'],
    [90, 'break', 'a'],
    [100, 'shop', 'a'],
    [130, 'travel', null],
    [150, 'shop', 'b'],
    [210, 'finished', null],
  ].map(([minutes, phase, visitId], index) => ({
    id: String(index),
    at: begin + minutes * 60000,
    phase,
    visitId,
    notes: '',
  }))
  const payment = (id, kind, method, cents) => ({
    id,
    kind,
    method,
    cents,
    at: begin,
    visitId: 'a',
    notes: '',
  })
  day.payments = [
    payment('1', 'customer', 'Cash', 2000),
    payment('2', 'customer', 'Stripe', null),
    payment('3', 'shop', 'Zelle', 5000),
    payment('4', 'expense', 'Other', 1000),
  ]
  const store = {
    schemaVersion: 1,
    currency: 'USD',
    selectedDayId: day.id,
    days: [day],
  }
  const restored = validateStore(JSON.parse(JSON.stringify(store)))
  const sum = totals(restored.days[0], begin + 24 * 3600000)
  assert.equal(sum.workMs, 200 * 60000)
  assert.equal(sum.shopMs, 150 * 60000)
  assert.equal(sum.travelMs, 50 * 60000)
  assert.equal(sum.breakMs, 10 * 60000)
  assert.equal(sum.visitMs.a, 90 * 60000)
  assert.equal(sum.entered, 24)
  assert.equal(sum.knownNetCents, 6000)
  assert.equal(sum.purchases, 2)
  assert.equal(sum.stripePurchases, 1)
  const corrected = structuredClone(restored)
  corrected.days[0].timeline[0].at -= 15 * 60000
  corrected.days[0].timeline[1].at += 5 * 60000
  const reloaded = validateStore(JSON.parse(JSON.stringify(corrected)))
  const adjusted = totals(reloaded.days[0], begin + 24 * 3600000)
  assert.equal(adjusted.workMs, 215 * 60000)
  assert.equal(adjusted.travelMs, 70 * 60000)
  assert.equal(adjusted.shopMs, 145 * 60000)
  day.notes = '=SUM(1,2)\n"quoted"'
  assert.ok(exportCsv(store).includes("'=SUM(1,2)"))
  assert.ok(exportCsv(store).includes('""quoted""'))
  assert.equal(moneyCents('20.10'), 2010)
  for (const invalid of ['-1', '0', '1e3', 'NaN', '10.001', ''])
    assert.throws(() => moneyCents(invalid))
  const invalid = structuredClone(store)
  invalid.days[0].payments[1].cents = 2000
  assert.throws(() => validateStore(invalid))
  invalid.days[0].payments[1].cents = null
  invalid.days[0].timeline[2].at = begin - 1
  assert.throws(() => validateStore(invalid))
  assert.throws(() => validateStore({ schemaVersion: 2 }))
})
