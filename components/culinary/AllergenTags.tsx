import React from 'react';

export type AllergenTagsProps = {
  allergens: string[];
};

const AllergenTags: React.FC<AllergenTagsProps> = ({ allergens }) => {
  return (
    <div>
      <h3>Allergens</h3>
      <ul>
        {allergens.length === 0 ? (
          <li>None</li>
        ) : (
          allergens.map((allergen, idx) => <li key={idx}>{allergen}</li>)
        )}
      </ul>
    </div>
  );
};

export default AllergenTags;
