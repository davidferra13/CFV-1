import React from 'react';

export type PackingTrackerProps = {
  components: { id: string; name: string; isMakeAhead: boolean; storageNotes?: string }[];
};

const PackingTracker: React.FC<PackingTrackerProps> = ({ components }) => {
  return (
    <div>
      <h3>Packing & Make-Ahead Tracker</h3>
      <ul>
        {components.map(component => (
          <li key={component.id}>
            <strong>{component.name}</strong>
            {component.isMakeAhead && <span> (Make-Ahead)</span>}
            {component.storageNotes && <div>Storage: {component.storageNotes}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PackingTracker;
