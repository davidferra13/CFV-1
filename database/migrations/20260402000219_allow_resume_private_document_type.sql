-- Allow private resume documents in chef_documents.
-- This supports the credentials showcase feature, which stores a non-public
-- resume record while exposing only an optional "available upon request" note.

ALTER TABLE chef_documents
  DROP CONSTRAINT IF EXISTS chef_documents_document_type_check;

ALTER TABLE chef_documents
  ADD CONSTRAINT chef_documents_document_type_check
  CHECK (
    document_type = ANY (
      ARRAY[
        'contract'::text,
        'template'::text,
        'policy'::text,
        'checklist'::text,
        'note'::text,
        'general'::text,
        'resume_private'::text
      ]
    )
  );
