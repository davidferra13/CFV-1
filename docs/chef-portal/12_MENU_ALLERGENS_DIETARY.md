# Menu Allergens & Dietary Tags (V1)

## Allergens Array

Common allergens stored as text array:

```typescript
const COMMON_ALLERGENS = [
  'Dairy',
  'Eggs',
  'Fish',
  'Shellfish',
  'Tree Nuts',
  'Peanuts',
  'Wheat',
  'Soy',
  'Sesame',
] as const;
```

---

## Dietary Tags

```typescript
const DIETARY_TAGS = [
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Dairy-Free',
  'Nut-Free',
  'Keto',
  'Paleo',
  'Low-Carb',
] as const;
```

---

## Adding to Menu Item

```typescript
async function updateItemAllergens(itemId: string, allergens: string[]) {
  await db.menu_items.update({
    where: { id: itemId },
    data: { allergens },
  });
}

async function updateItemDietaryTags(itemId: string, tags: string[]) {
  await db.menu_items.update({
    where: { id: itemId },
    data: { dietary_tags: tags },
  });
}
```

---

## UI Display

```tsx
<div className="menu-item">
  <h3>{item.name}</h3>
  <p>{item.description}</p>

  {item.allergens.length > 0 && (
    <div className="allergens">
      <strong>Contains:</strong> {item.allergens.join(', ')}
    </div>
  )}

  {item.dietary_tags.length > 0 && (
    <div className="dietary-tags">
      {item.dietary_tags.map((tag) => (
        <span key={tag} className="tag tag-dietary">
          {tag}
        </span>
      ))}
    </div>
  )}
</div>
```

---

**End of Menu Allergens & Dietary Tags**
