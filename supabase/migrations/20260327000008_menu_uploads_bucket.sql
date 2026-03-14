-- Create the menu-uploads storage bucket for preserving original uploaded files.
-- Files are stored at: {tenant_id}/{job_id}/{filename}
-- Referenced by: app/api/menus/upload/route.ts

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'menu-uploads',
  'menu-uploads',
  false,
  52428800, -- 50 MB
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/heic',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/rtf',
    'application/octet-stream'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- RLS: chefs can upload to their own tenant folder
DO $$ BEGIN
  CREATE POLICY "Chefs can upload menu files"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'menu-uploads'
      AND (storage.foldername(name))[1] = (
        SELECT entity_id::text FROM user_roles
        WHERE auth_user_id = auth.uid()
        LIMIT 1
      )
    );
EXCEPTION WHEN duplicate_object OR insufficient_privilege THEN NULL;
END $$;

-- RLS: chefs can read their own uploads
DO $$ BEGIN
  CREATE POLICY "Chefs can read own menu files"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'menu-uploads'
      AND (storage.foldername(name))[1] = (
        SELECT entity_id::text FROM user_roles
        WHERE auth_user_id = auth.uid()
        LIMIT 1
      )
    );
EXCEPTION WHEN duplicate_object OR insufficient_privilege THEN NULL;
END $$;
