-- ============================================================
-- Chef Social Media Storage Bucket
-- Stores photos and videos uploaded to social posts and stories.
-- Max 50MB per file. Images and common video formats.
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chef-social-media',
  'chef-social-media',
  TRUE,
  52428800, -- 50MB
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'image/gif',
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/mov'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- RLS for storage: authenticated users can upload; public read
CREATE POLICY "chef_social_media_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chef-social-media');

CREATE POLICY "chef_social_media_read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'chef-social-media');

CREATE POLICY "chef_social_media_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'chef-social-media' AND auth.uid()::text = (storage.foldername(name))[1]);
