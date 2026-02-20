import React from 'react';

// Placeholder types
export type Recipe = {
  id: string;
  name: string;
  category: string;
  description?: string;
  method?: string;
  yieldDescription?: string;
  dietaryTags?: string[];
};

export type RecipeBibleProps = {
  recipes: Recipe[];
  onSelectRecipe: (recipeId: string) => void;
};

const RecipeBible: React.FC<RecipeBibleProps> = ({ recipes, onSelectRecipe }) => {
  return (
    <div>
      <h2>Recipe Bible</h2>
      <ul>
        {recipes.map(recipe => (
          <li key={recipe.id} onClick={() => onSelectRecipe(recipe.id)} style={{ cursor: 'pointer', marginBottom: '1rem' }}>
            <strong>{recipe.name}</strong> ({recipe.category})
            <div>{recipe.description}</div>
            <div>Yield: {recipe.yieldDescription || '—'}</div>
            <div>Dietary: {recipe.dietaryTags?.join(', ') || '—'}</div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RecipeBible;
