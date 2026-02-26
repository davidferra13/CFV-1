import React from 'react'

// Placeholder for menu list props
type Menu = {
  id: string
  name: string
  description?: string
  cuisine?: string
  status?: string
}

type MenuListProps = {
  menus: Menu[]
  onSelectMenu: (menuId: string) => void
}

const MenuList: React.FC<MenuListProps> = ({ menus, onSelectMenu }) => {
  return (
    <div>
      <h2>Menus</h2>
      <ul>
        {menus.map((menu) => (
          <li
            key={menu.id}
            onClick={() => onSelectMenu(menu.id)}
            style={{ cursor: 'pointer', marginBottom: '1rem' }}
          >
            <strong>{menu.name}</strong>
            <div>{menu.description}</div>
            <div>Cuisine: {menu.cuisine || '—'}</div>
            <div>Status: {menu.status || '—'}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default MenuList
