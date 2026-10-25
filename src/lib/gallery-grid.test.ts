import assert from 'node:assert/strict'
import test from 'node:test'
import { galleryColumns, masonryRowSpan } from './gallery-grid'

test('grid density keeps phone thumbnails tappable at every supported size', () => {
  assert.deepEqual(galleryColumns(288), [2, 3, 5])
  assert.deepEqual(galleryColumns(358), [2, 3, 5, 7])
  assert.deepEqual(galleryColumns(1280), [2, 3, 5, 7])
  for (const width of [288, 343, 358, 736, 1280]) {
    for (const columns of galleryColumns(width)) {
      assert.ok((width - (columns - 1) * 2) / columns >= 44)
    }
  }
})

test('masonry reserves natural photo heights with less than one grid step of rounding', () => {
  for (const tileWidth of [47, 113, 240]) {
    for (const [width, height] of [
      [1600, 2400],
      [2400, 1600],
      [1600, 1600],
    ]) {
      const span = masonryRowSpan(width, height, tileWidth)
      const reservedHeight = span * 3 - 2
      const photoHeight = (tileWidth * height) / width
      assert.ok(reservedHeight >= photoHeight)
      assert.ok(reservedHeight - photoHeight < 3)
    }
  }
})
