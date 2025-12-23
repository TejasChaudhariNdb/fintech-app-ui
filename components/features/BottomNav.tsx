'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const tabs = [
    { id: '/', label: 'Home', icon: '🏠' },
    { id: '/holdings', label: 'Holdings', icon: '📊' },
    { id: '/activity', label: 'Activity', icon: '📝' },
    { id: '/goals', label: 'Goals', icon: '🎯' },
    { id: '/profile', label: 'Profile', icon: '👤' }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 z-50 safe-area-bottom">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
        {tabs.map(tab => {
          const isActive = pathname === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => router.push(tab.id)}
              className={`flex flex-col items-center gap-1 px-3 py-2 transition-colors min-w-[60px] ${
                isActive ? 'text-primary-600' : 'text-neutral-600'
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}