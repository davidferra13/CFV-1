import assert from 'node:assert/strict'
import test from 'node:test'

import { createCloudinaryFetchLoader } from '../../lib/images/cloudinary'

function withCloudName<T>(cloudName: string | undefined, run: () => T): T {
  const previous = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

  if (cloudName === undefined) {
    delete process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  } else {
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = cloudName
  }

  try {
    return run()
  } finally {
    if (previous === undefined) {
      delete process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    } else {
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = previous
    }
  }
}

test('createCloudinaryFetchLoader builds responsive Cloudinary fetch URLs', () => {
  const url = withCloudName('demo-cloud', () => {
    const loader = createCloudinaryFetchLoader({
      aspectRatio: 4 / 3,
      fit: 'fill',
      gravity: 'auto',
      defaultQuality: 90,
      maxWidth: 1600,
    })

    return loader({
      src: 'https://images.example.com/chef.jpg',
      width: 828,
      quality: 95,
    })
  })

  assert.equal(
    url,
    'https://res.cloudinary.com/demo-cloud/image/fetch/f_auto,q_95,w_828,h_621,c_fill,g_auto/https://images.example.com/chef.jpg'
  )
})

test('createCloudinaryFetchLoader clamps oversized requests and falls back to default quality', () => {
  const url = withCloudName('demo-cloud', () => {
    const loader = createCloudinaryFetchLoader({
      aspectRatio: 4 / 3,
      fit: 'fill',
      gravity: 'auto',
      defaultQuality: 90,
      maxWidth: 1600,
    })

    return loader({
      src: 'https://images.example.com/chef.jpg',
      width: 2400,
    })
  })

  assert.equal(
    url,
    'https://res.cloudinary.com/demo-cloud/image/fetch/f_auto,q_90,w_1600,h_1200,c_fill,g_auto/https://images.example.com/chef.jpg'
  )
})

test('createCloudinaryFetchLoader falls back to the original URL when Cloudinary is not configured', () => {
  const url = withCloudName(undefined, () => {
    const loader = createCloudinaryFetchLoader({
      aspectRatio: 4 / 3,
      fit: 'fill',
      gravity: 'auto',
      defaultQuality: 90,
      maxWidth: 1600,
    })

    return loader({
      src: 'https://images.example.com/chef.jpg',
      width: 828,
    })
  })

  assert.equal(url, 'https://images.example.com/chef.jpg')
})
