# Storage & File Handling (V1)

## V1 Scope

**File uploads NOT included in V1.**

Future use cases:
- Menu photos
- Event photos
- Client profile images
- Contracts/documents

---

## Future Implementation (V2)

### Supabase Storage

```typescript
async function uploadMenuPhoto(menuId: string, file: File) {
  const { data, error } = await supabase.storage
    .from('menu-photos')
    .upload(`${tenantId}/${menuId}/${file.name}`, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw error;

  return data.path;
}
```

---

### Tenant Isolation

File paths must include `tenant_id`:
```
menu-photos/
  └── chef-123/
      └── menu-456/
          └── photo.jpg
```

RLS policies on storage buckets.

---

## V1 Workaround

Store external URLs (e.g., uploaded to Cloudinary):

```sql
ALTER TABLE menu_items ADD COLUMN image_url TEXT;
```

---

**End of Storage & File Handling**
