import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { checkDishAgainstAllergens, ALLERGEN_INGREDIENT_MAP } from '../../lib/menus/allergen-check'

describe('checkDishAgainstAllergens', () => {
  const baseAllergyRecords = [
    { allergen: 'dairy', severity: 'intolerance', confirmed_by_chef: true },
    { allergen: 'shellfish', severity: 'life_threatening', confirmed_by_chef: true },
  ]

  it('detects dairy allergen in cream-based dishes', () => {
    const conflicts = checkDishAgainstAllergens(
      'Pasta Alfredo',
      'dish-1',
      [{ name: 'heavy cream' }, { name: 'parmesan cheese' }, { name: 'pasta' }],
      baseAllergyRecords
    )

    assert.ok(conflicts.length >= 1)
    assert.strictEqual(
      conflicts.some((c) => c.allergen === 'dairy'),
      true
    )
  })

  it('detects shellfish allergen in seafood dishes', () => {
    const conflicts = checkDishAgainstAllergens(
      'Seared Scallops',
      'dish-2',
      [{ name: 'scallops' }, { name: 'butter' }, { name: 'lemon' }],
      baseAllergyRecords
    )

    assert.strictEqual(
      conflicts.some((c) => c.allergen === 'shellfish'),
      true
    )
    assert.strictEqual(
      conflicts.some((c) => c.allergen === 'dairy'),
      true
    ) // butter = dairy
  })

  it('returns empty array for safe dishes', () => {
    const conflicts = checkDishAgainstAllergens(
      'Grilled Chicken',
      'dish-3',
      [{ name: 'chicken breast' }, { name: 'olive oil' }, { name: 'salt' }],
      baseAllergyRecords
    )

    assert.deepStrictEqual(conflicts, [])
  })

  it('handles tree nut allergy', () => {
    const nutAllergy = [
      { allergen: 'tree_nuts', severity: 'life_threatening', confirmed_by_chef: true },
    ]
    const conflicts = checkDishAgainstAllergens(
      'Waldorf Salad',
      'dish-4',
      [{ name: 'walnut pieces' }, { name: 'apple' }, { name: 'celery' }],
      nutAllergy
    )

    assert.strictEqual(conflicts.length, 1)
    assert.strictEqual(conflicts[0].allergen, 'tree_nuts')
    assert.strictEqual(conflicts[0].severity, 'life_threatening')
  })

  it('handles peanut allergy with pad thai', () => {
    const peanutAllergy = [
      { allergen: 'peanuts', severity: 'life_threatening', confirmed_by_chef: true },
    ]
    const conflicts = checkDishAgainstAllergens(
      'Pad Thai',
      'dish-5',
      [{ name: 'rice noodles' }, { name: 'peanuts' }, { name: 'tofu' }],
      peanutAllergy
    )

    assert.strictEqual(conflicts.length, 1)
    assert.strictEqual(conflicts[0].allergen, 'peanuts')
  })

  it('handles gluten allergy in pasta', () => {
    const glutenAllergy = [
      { allergen: 'gluten', severity: 'intolerance', confirmed_by_chef: false },
    ]
    const conflicts = checkDishAgainstAllergens(
      'Spaghetti Bolognese',
      'dish-6',
      [{ name: 'spaghetti pasta' }, { name: 'ground beef' }, { name: 'tomato sauce' }],
      glutenAllergy
    )

    assert.strictEqual(
      conflicts.some((c) => c.allergen === 'gluten'),
      true
    )
  })

  it('does not duplicate conflicts for same dish + allergen', () => {
    const dairyAllergy = [{ allergen: 'dairy', severity: 'intolerance', confirmed_by_chef: true }]
    const conflicts = checkDishAgainstAllergens(
      'Mac and Cheese',
      'dish-7',
      [
        { name: 'cheddar cheese' },
        { name: 'parmesan cheese' },
        { name: 'cream' },
        { name: 'butter' },
      ],
      dairyAllergy
    )

    // Should only have one dairy conflict, not 4
    const dairyConflicts = conflicts.filter((c) => c.allergen === 'dairy')
    assert.strictEqual(dairyConflicts.length, 1)
  })

  it('handles custom allergens via direct string matching', () => {
    const customAllergy = [
      { allergen: 'cilantro', severity: 'preference', confirmed_by_chef: true },
    ]
    const conflicts = checkDishAgainstAllergens(
      'Guacamole',
      'dish-8',
      [{ name: 'avocado' }, { name: 'fresh cilantro' }, { name: 'lime' }],
      customAllergy
    )

    assert.strictEqual(conflicts.length, 1)
    assert.strictEqual(conflicts[0].allergen, 'cilantro')
  })

  it('handles empty ingredients list', () => {
    const conflicts = checkDishAgainstAllergens('Mystery Dish', 'dish-9', [], baseAllergyRecords)
    assert.deepStrictEqual(conflicts, [])
  })

  it('handles empty allergy records', () => {
    const conflicts = checkDishAgainstAllergens(
      'Anything',
      'dish-10',
      [{ name: 'peanuts' }, { name: 'shellfish' }],
      []
    )
    assert.deepStrictEqual(conflicts, [])
  })

  it('handles soy allergy with tofu and soy sauce', () => {
    const soyAllergy = [{ allergen: 'soy', severity: 'intolerance', confirmed_by_chef: true }]
    const conflicts = checkDishAgainstAllergens(
      'Stir Fry',
      'dish-11',
      [{ name: 'tofu' }, { name: 'soy sauce' }, { name: 'broccoli' }],
      soyAllergy
    )
    // tofu and soy sauce should trigger, but only one conflict per allergen
    assert.strictEqual(conflicts.length, 1)
    assert.strictEqual(conflicts[0].allergen, 'soy')
  })

  it('handles sesame allergy with tahini', () => {
    const sesameAllergy = [
      { allergen: 'sesame', severity: 'life_threatening', confirmed_by_chef: true },
    ]
    const conflicts = checkDishAgainstAllergens(
      'Hummus',
      'dish-12',
      [{ name: 'chickpeas' }, { name: 'tahini' }, { name: 'olive oil' }],
      sesameAllergy
    )
    assert.strictEqual(conflicts.length, 1)
    assert.strictEqual(conflicts[0].allergen, 'sesame')
  })

  it('detects egg allergy in aioli', () => {
    const eggAllergy = [{ allergen: 'eggs', severity: 'intolerance', confirmed_by_chef: true }]
    const conflicts = checkDishAgainstAllergens(
      'Fries with Aioli',
      'dish-13',
      [{ name: 'potatoes' }, { name: 'garlic aioli' }, { name: 'salt' }],
      eggAllergy
    )
    assert.strictEqual(conflicts.length, 1)
    assert.strictEqual(conflicts[0].allergen, 'eggs')
  })

  it('preserves severity and confirmation status in conflicts', () => {
    const conflicts = checkDishAgainstAllergens(
      'Lobster Bisque',
      'dish-14',
      [{ name: 'lobster' }, { name: 'cream' }],
      baseAllergyRecords
    )

    const shellfishConflict = conflicts.find((c) => c.allergen === 'shellfish')
    assert.strictEqual(shellfishConflict?.severity, 'life_threatening')
    assert.strictEqual(shellfishConflict?.confirmedByChef, true)
  })
})

describe('ALLERGEN_INGREDIENT_MAP coverage', () => {
  it('has entries for all major allergen groups', () => {
    const expectedGroups = [
      'dairy',
      'eggs',
      'fish',
      'shellfish',
      'tree_nuts',
      'peanuts',
      'wheat',
      'soy',
      'sesame',
      'gluten',
      'nightshade',
    ]
    for (const group of expectedGroups) {
      assert.notStrictEqual(ALLERGEN_INGREDIENT_MAP[group], undefined)
      assert.ok(ALLERGEN_INGREDIENT_MAP[group].length > 0)
    }
  })

  it('dairy group includes common dairy items', () => {
    const dairy = ALLERGEN_INGREDIENT_MAP.dairy
    assert.ok(dairy.includes('milk'))
    assert.ok(dairy.includes('cream'))
    assert.ok(dairy.includes('butter'))
    assert.ok(dairy.includes('cheese'))
    assert.ok(dairy.includes('yogurt'))
  })

  it('shellfish group includes common shellfish', () => {
    const shellfish = ALLERGEN_INGREDIENT_MAP.shellfish
    assert.ok(shellfish.includes('shrimp'))
    assert.ok(shellfish.includes('crab'))
    assert.ok(shellfish.includes('lobster'))
    assert.ok(shellfish.includes('scallops'))
  })
})
