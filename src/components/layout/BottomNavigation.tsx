import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
              `flex flex-col items-center justify-center text-xs font-medium transition-colors min-w-0 flex-1 py-2 px-1 rounded-lg mx-0.5 ${
                isActive
                  ? 'text-primary-600 bg-primary-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`
            }
            end={item.href === '/dashboard'}
          >
            <div className="mb-1 flex-shrink-0">
              {IconMap[item.icon]}
            </div>
            <span className="truncate text-center leading-none text-xs font-medium max-w-full">{item.title}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default BottomNavigation;
