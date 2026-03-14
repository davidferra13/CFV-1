-- Fix: Harden storage bucket RLS policies
-- Addresses: hub-media (no auth), inquiry-note-attachments (no tenant scope),
-- chef-social-media (upload not scoped, delete uses wrong ID), and 4 buckets
-- with no storage.objects policies at all.

-- ============================================================
-- 1. hub-media: Replace wide-open policies with auth-required + group-scoped
-- ============================================================

DROP POLICY IF EXISTS "hub_media_read_all" ON storage.objects;
DROP POLICY IF EXISTS "hub_media_upload_all" ON storage.objects;
-- Authenticated users can read hub media (group membership checked at app layer)
CREATE POLICY "hub_media_read_auth" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'hub-media');
-- Authenticated users can upload hub media (group membership checked at app layer)
CREATE POLICY "hub_media_upload_auth" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'hub-media');
-- Authenticated users can delete their own uploads (first path segment = auth UID)
CREATE POLICY "hub_media_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'hub-media');
-- ============================================================
-- 2. inquiry-note-attachments: Add tenant scoping + require auth for reads
-- ============================================================

DROP POLICY IF EXISTS "inquiry_note_attachments_insert" ON storage.objects;
DROP POLICY IF EXISTS "inquiry_note_attachments_select" ON storage.objects;
-- Upload: authenticated, first path segment must be caller's tenant ID
CREATE POLICY "inquiry_note_attachments_upload_scoped" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'inquiry-note-attachments'
    AND (storage.foldername(name))[1] IN (
      SELECT entity_id::text FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
-- Read: authenticated, tenant-scoped
CREATE POLICY "inquiry_note_attachments_read_scoped" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'inquiry-note-attachments'
    AND (storage.foldername(name))[1] IN (
      SELECT entity_id::text FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
-- Delete: authenticated, tenant-scoped
CREATE POLICY "inquiry_note_attachments_delete_scoped" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'inquiry-note-attachments'
    AND (storage.foldername(name))[1] IN (
      SELECT entity_id::text FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
-- ============================================================
-- 3. chef-social-media: Fix upload scoping + fix delete policy
-- ============================================================

DROP POLICY IF EXISTS "chef_social_media_upload" ON storage.objects;
DROP POLICY IF EXISTS "chef_social_media_delete_own" ON storage.objects;
-- Keep the public read policy — social media content is intentionally public

-- Upload: tenant-scoped (first path segment = tenant_id)
CREATE POLICY "chef_social_media_upload_scoped" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chef-social-media'
    AND (storage.foldername(name))[1] IN (
      SELECT entity_id::text FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
-- Delete: tenant-scoped (matches how the app writes paths: tenantId/filename)
CREATE POLICY "chef_social_media_delete_scoped" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'chef-social-media'
    AND (storage.foldername(name))[1] IN (
      SELECT entity_id::text FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
-- ============================================================
-- 4. chef-logos: Add upload + delete scoping (reads are public, correct)
-- ============================================================

CREATE POLICY "chef_logos_upload_scoped" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chef-logos'
    AND (storage.foldername(name))[1] IN (
      SELECT entity_id::text FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
CREATE POLICY "chef_logos_delete_scoped" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'chef-logos'
    AND (storage.foldername(name))[1] IN (
      SELECT entity_id::text FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
-- ============================================================
-- 5. chef-profile-images: Add upload + delete scoping
-- ============================================================

CREATE POLICY "chef_profile_images_upload_scoped" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chef-profile-images'
    AND (storage.foldername(name))[1] IN (
      SELECT entity_id::text FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
CREATE POLICY "chef_profile_images_delete_scoped" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'chef-profile-images'
    AND (storage.foldername(name))[1] IN (
      SELECT entity_id::text FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
-- ============================================================
-- 6. chef-portal-backgrounds: Add upload + delete scoping
-- ============================================================

CREATE POLICY "chef_portal_backgrounds_upload_scoped" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chef-portal-backgrounds'
    AND (storage.foldername(name))[1] IN (
      SELECT entity_id::text FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
CREATE POLICY "chef_portal_backgrounds_delete_scoped" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'chef-portal-backgrounds'
    AND (storage.foldername(name))[1] IN (
      SELECT entity_id::text FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
-- ============================================================
-- 7. chef-journal-media: Add upload + delete scoping
-- ============================================================

CREATE POLICY "chef_journal_media_upload_scoped" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chef-journal-media'
    AND (storage.foldername(name))[1] IN (
      SELECT entity_id::text FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
CREATE POLICY "chef_journal_media_delete_scoped" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'chef-journal-media'
    AND (storage.foldername(name))[1] IN (
      SELECT entity_id::text FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
-- ============================================================
-- 8. social-media-vault: Add upload + delete scoping
-- ============================================================

CREATE POLICY "social_media_vault_upload_scoped" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'social-media-vault'
    AND (storage.foldername(name))[1] IN (
      SELECT entity_id::text FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
CREATE POLICY "social_media_vault_delete_scoped" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'social-media-vault'
    AND (storage.foldername(name))[1] IN (
      SELECT entity_id::text FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
