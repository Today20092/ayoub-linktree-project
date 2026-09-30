import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  moneyCents,
  newDay,
  totals,
  validateStore,
  exportCsv,
} from '../public/barber-tracker/core.mjs'

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
