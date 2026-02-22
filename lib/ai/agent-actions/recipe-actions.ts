// Remy Agent — Recipe Actions
// Create and update recipes on the chef's behalf.

import type { AgentActionDefinition } from '@/lib/ai/agent-registry'
import type { AgentActionPreview } from '@/lib/ai/command-types'
import {
  createRecipe,
  updateRecipe,
  searchRecipes,
  addIngredientToRecipe,
  getRecipeById,
} from '@/lib/recipes/actions'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { z } from 'zod'

const ParsedRecipeSchema = z.object({
  name: z.string(),
  category: z
    .enum([
      'sauce',
      'protein',
      'starch',
      'vegetable',
      'fruit',
      'dessert',
      'bread',
      'pasta',
      'soup',
      'salad',
      'appetizer',
      'condiment',
      'beverage',
      'other',
    ])
    .optional(),
  method: z.string().optional(),
  prep_time_minutes: z.number().optional(),
  cook_time_minutes: z.number().optional(),
  total_time_minutes: z.number().optional(),
  yield_amount: z.string().optional(),
  dietary_tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
})

async function parseRecipeFromNL(description: string) {
  const systemPrompt = `You extract structured recipe data from natural language.
Extract: name, category (sauce/protein/starch/vegetable/fruit/dessert/bread/pasta/soup/salad/appetizer/condiment/beverage/other), method (cooking instructions), prep_time_minutes, cook_time_minutes, total_time_minutes, yield_amount (e.g. "4 servings"), dietary_tags (array like ["vegan", "gluten-free"]), notes.
Return ONLY valid JSON. Omit unmentioned fields.`

  return parseWithOllama(systemPrompt, description, ParsedRecipeSchema, { modelTier: 'standard' })
}

const ParsedIngredientSchema = z.object({
  recipeName: z.string(),
  ingredientName: z.string(),
  quantity: z.number().optional(),
  unit: z.string().optional(),
  notes: z.string().optional(),
})

async function parseIngredientFromNL(description: string) {
  const systemPrompt = `You extract a recipe name and ingredient info from natural language.
Return JSON with: recipeName (which recipe), ingredientName, quantity (number), unit (string like "cups", "oz", "lbs", "each"), notes.
Return ONLY valid JSON.`

  return parseWithOllama(systemPrompt, description, ParsedIngredientSchema, {
    modelTier: 'standard',
  })
}

export const recipeAgentActions: AgentActionDefinition[] = [
  {
    taskType: 'agent.create_recipe',
    name: 'Create Recipe',
    tier: 2,
    safety: 'reversible',
    description: 'Create a new recipe from a natural language description.',
    inputSchema:
      '{ "description": "string — recipe details, e.g. Pan-seared salmon with lemon butter, protein, 10 min prep, 15 min cook, serves 4, gluten-free" }',
    tierNote: 'ALWAYS tier 2 — chef reviews before saving.',

    async executor(inputs) {
      const description = String(inputs.description ?? '')
      const parsed = await parseRecipeFromNL(description)

      const fields: AgentActionPreview['fields'] = [
        { label: 'Name', value: parsed.name, editable: true },
      ]
      if (parsed.category)
        fields.push({ label: 'Category', value: parsed.category, editable: true })
      if (parsed.method)
        fields.push({
          label: 'Method',
          value: parsed.method.slice(0, 100) + (parsed.method.length > 100 ? '...' : ''),
          editable: true,
        })
      if (parsed.prep_time_minutes)
        fields.push({ label: 'Prep Time', value: `${parsed.prep_time_minutes} min` })
      if (parsed.cook_time_minutes)
        fields.push({ label: 'Cook Time', value: `${parsed.cook_time_minutes} min` })
      if (parsed.yield_amount) fields.push({ label: 'Yield', value: parsed.yield_amount })
      if (parsed.dietary_tags?.length)
        fields.push({ label: 'Dietary Tags', value: parsed.dietary_tags.join(', ') })

      return {
        preview: {
          actionType: 'agent.create_recipe',
          summary: `Create recipe: ${parsed.name}`,
          fields,
          safety: 'reversible',
        },
        commitPayload: { ...parsed, _rawDescription: description },
      }
    },

    async commitAction(payload) {
      const result = await createRecipe({
        name: String(payload.name),
        category: payload.category as string | undefined,
        method: payload.method as string | undefined,
        prep_time_minutes: payload.prep_time_minutes as number | undefined,
        cook_time_minutes: payload.cook_time_minutes as number | undefined,
        total_time_minutes: payload.total_time_minutes as number | undefined,
        yield_amount: payload.yield_amount as string | undefined,
        dietary_tags: payload.dietary_tags as string[] | undefined,
      })
      if ('error' in result) return { success: false, message: `Failed: ${result.error}` }
      const recipeId = (result as { recipe: { id: string } }).recipe?.id
      return {
        success: true,
        message: `Recipe "${payload.name}" created!`,
        redirectUrl: recipeId ? `/recipes/${recipeId}` : '/recipes',
      }
    },
  },

  {
    taskType: 'agent.update_recipe',
    name: 'Update Recipe',
    tier: 2,
    safety: 'reversible',
    description: 'Update an existing recipe by name.',
    inputSchema:
      '{ "description": "string — what to change, e.g. Update the salmon recipe prep time to 15 minutes and add dairy-free tag" }',
    tierNote: 'ALWAYS tier 2.',

    async executor(inputs) {
      const description = String(inputs.description ?? '')
      const parsed = await parseWithOllama(
        'Extract recipeName (to find) and updates (fields to change: name, category, method, prep_time_minutes, cook_time_minutes, total_time_minutes, yield_amount, dietary_tags). Return ONLY JSON.',
        description,
        z.object({
          recipeName: z.string(),
          updates: z.record(z.unknown()),
        }),
        { modelTier: 'standard' }
      )

      const recipes = await searchRecipes(parsed.recipeName)
      if (!recipes || recipes.length === 0) {
        return {
          preview: {
            actionType: 'agent.update_recipe',
            summary: `Recipe "${parsed.recipeName}" not found`,
            fields: [{ label: 'Error', value: 'No matching recipe found.' }],
            safety: 'reversible' as const,
          },
          commitPayload: { _error: true },
        }
      }

      const recipe = recipes[0]
      const fields: AgentActionPreview['fields'] = [
        { label: 'Recipe', value: recipe.name ?? parsed.recipeName },
      ]
      for (const [key, val] of Object.entries(parsed.updates)) {
        if (val !== undefined) {
          fields.push({
            label: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            value: String(val),
            editable: true,
          })
        }
      }

      return {
        preview: {
          actionType: 'agent.update_recipe',
          summary: `Update recipe: ${recipe.name}`,
          fields,
          safety: 'reversible',
        },
        commitPayload: { recipeId: recipe.id, updates: parsed.updates },
      }
    },

    async commitAction(payload) {
      if (payload._error) return { success: false, message: 'Recipe not found.' }
      await updateRecipe(String(payload.recipeId), payload.updates as Record<string, unknown>)
      return {
        success: true,
        message: 'Recipe updated!',
        redirectUrl: `/recipes/${payload.recipeId}`,
      }
    },
  },

  {
    taskType: 'agent.add_ingredient',
    name: 'Add Ingredient to Recipe',
    tier: 2,
    safety: 'reversible',
    description: 'Add an ingredient to an existing recipe.',
    inputSchema:
      '{ "description": "string — e.g. Add 2 cups heavy cream to the mushroom risotto" }',
    tierNote: 'ALWAYS tier 2.',

    async executor(inputs) {
      const description = String(inputs.description ?? '')
      const parsed = await parseIngredientFromNL(description)

      const recipes = await searchRecipes(parsed.recipeName)
      if (!recipes || recipes.length === 0) {
        return {
          preview: {
            actionType: 'agent.add_ingredient',
            summary: `Recipe "${parsed.recipeName}" not found`,
            fields: [{ label: 'Error', value: 'No matching recipe found.' }],
            safety: 'reversible' as const,
          },
          commitPayload: { _error: true },
        }
      }

      const recipe = recipes[0]
      const fields: AgentActionPreview['fields'] = [
        { label: 'Recipe', value: recipe.name ?? parsed.recipeName },
        { label: 'Ingredient', value: parsed.ingredientName, editable: true },
      ]
      if (parsed.quantity)
        fields.push({ label: 'Quantity', value: String(parsed.quantity), editable: true })
      if (parsed.unit) fields.push({ label: 'Unit', value: parsed.unit, editable: true })
      if (parsed.notes) fields.push({ label: 'Notes', value: parsed.notes })

      return {
        preview: {
          actionType: 'agent.add_ingredient',
          summary: `Add ${parsed.ingredientName} to ${recipe.name}`,
          fields,
          safety: 'reversible',
        },
        commitPayload: {
          recipeId: recipe.id,
          name: parsed.ingredientName,
          quantity: parsed.quantity,
          unit: parsed.unit,
          notes: parsed.notes,
        },
      }
    },

    async commitAction(payload) {
      if (payload._error) return { success: false, message: 'Recipe not found.' }
      const result = await addIngredientToRecipe(String(payload.recipeId), {
        name: String(payload.name),
        quantity: payload.quantity as number | undefined,
        unit: payload.unit as string | undefined,
        notes: payload.notes as string | undefined,
      })
      if ('error' in result) return { success: false, message: `Failed: ${result.error}` }
      return {
        success: true,
        message: `${payload.name} added to recipe!`,
        redirectUrl: `/recipes/${payload.recipeId}`,
      }
    },
  },
]
