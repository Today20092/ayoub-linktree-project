import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import EventLightbox from './EventLightbox'

const image = {
  src: '/api/gallery-media/events/test/photos/photo.jpg/',
  filename: 'photo.jpg',
  alt: 'Event photograph',
  width: 1600,
  height: 2400,
}

function renderGallery(images = [image], downloadAllUrl?: string) {
  return renderToStaticMarkup(
    <EventLightbox
      galleryId="test-gallery"
      heading="Event photos"
      projectSlug="test"
      projectTitle="Test event"
      images={images}
      downloadAllUrl={downloadAllUrl}
    >
      <div />
    </EventLightbox>,
  )
}

test('download all is offered with and without a prebuilt archive', () => {
  assert.match(renderGallery(), />Download ZIP<\/button>/)
  assert.match(
    renderGallery([image], 'https://photos.ayoubabed.xyz/events/test.zip'),
    />Download ZIP<\/button>/,
  )
  assert.doesNotMatch(renderGallery([]), /Download ZIP/)
})
