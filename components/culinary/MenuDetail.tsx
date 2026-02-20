import React from 'react';

// Placeholder for menu detail props
type Dish = {
  id: string;
  courseNumber: number;
  courseName: string;
  description?: string;
};

type MenuDetailProps = {
  menuId: string;
  menuName: string;
  dishes: Dish[];
};

const MenuDetail: React.FC<MenuDetailProps> = ({ menuId, menuName, dishes }) => {
  return (
    <div>
      <h2>{menuName} - Details</h2>
      <ul>
        {dishes.map(dish => (
          <li key={dish.id}>
            <strong>Course {dish.courseNumber}: {dish.courseName}</strong>
            <div>{dish.description}</div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MenuDetail;
