import assert from 'node:assert/strict'
import { test } from 'node:test'
import { estimatePodcastPrice } from './podcast-offer'

const base = {
  addOns: [],
  extraHours: 0,
  extraPlatforms: 0,
  mistakeCuts: false,
}

test('package starting prices', () => {
  assert.equal(estimatePodcastPrice({ ...base, packageId: 'record' }), 450)
  assert.equal(estimatePodcastPrice({ ...base, packageId: 'growth' }), 750)
  assert.equal(estimatePodcastPrice({ ...base, packageId: 'full' }), 1000)
})

test('shorts pack only charges on Record & Polish', () => {
  assert.equal(
    estimatePodcastPrice({ ...base, packageId: 'record', addOns: ['shorts'] }),
    600,
  )
  assert.equal(
    estimatePodcastPrice({ ...base, packageId: 'growth', addOns: ['shorts'] }),
    750,
  )
})

test('extra platforms need the livestream', () => {
  assert.equal(
    estimatePodcastPrice({ ...base, packageId: 'growth', extraPlatforms: 2 }),
    750,
  )
  assert.equal(
    estimatePodcastPrice({
      ...base,
      packageId: 'growth',
      addOns: ['livestream'],
      extraPlatforms: 2,
    }),
    1200,
  )
})

test('extra hours and mistake cuts scale with recording length', () => {
  assert.equal(
    estimatePodcastPrice({
      ...base,
      packageId: 'record',
      extraHours: 1,
      mistakeCuts: true,
    }),
    450 + 100 + 300,
  )
})
