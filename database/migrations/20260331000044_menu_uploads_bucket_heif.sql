
DO $cfguard$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    EXECUTE $cfstorage$-- Allow HEIF uploads in the menu-uploads bucket for iPhone-originated menu photos.

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/rtf',
  'application/octet-stream'
]
WHERE id = 'menu-uploads'$cfstorage$;
  END IF;
END
$cfguard$;