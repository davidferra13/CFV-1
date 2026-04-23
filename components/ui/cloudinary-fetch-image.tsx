'use client'

import Image, { type ImageProps } from 'next/image'
import { createCloudinaryFetchLoader } from '@/lib/images/cloudinary'

type CloudinaryImageFormat = 'auto' | 'webp' | 'avif' | 'jpg' | 'png'
type CloudinaryImageFit = 'fill' | 'fit' | 'scale' | 'crop' | 'thumb'
type CloudinaryImageGravity = 'face' | 'center' | 'auto'

type CloudinaryFetchImageProps = Omit<ImageProps, 'loader'> & {
  aspectRatio?: number
  defaultQuality?: number | 'auto'
  fit?: CloudinaryImageFit
  format?: CloudinaryImageFormat
  gravity?: CloudinaryImageGravity
  maxWidth?: number
}

export function CloudinaryFetchImage({
  alt,
  aspectRatio,
  defaultQuality,
  fit,
  format,
  gravity,
  maxWidth,
  src,
  ...props
}: CloudinaryFetchImageProps) {
  const loader = createCloudinaryFetchLoader({
    aspectRatio,
    defaultQuality,
    fit,
    format,
    gravity,
    maxWidth,
  })

  return <Image {...props} src={src} alt={alt} loader={loader} />
}
