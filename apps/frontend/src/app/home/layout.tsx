'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Users, Home, User, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/home/users', label: 'Users', icon: Users },
  { href: '/home/books', label: 'Books', icon: BookOpen },
  { href: '/home/profile', label: 'Profile', icon: User },
];

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col fixed top-0 left-0 h-full z-20">
        {/* Logo */}
        <Link href="/">
          <div className="h-14 flex items-center gap-2 px-4 border-b border-gray-200">
            <BookOpen size={18} className="text-blue-600" />

            <span className="font-bold text-gray-900 text-sm">BookShelf</span>
          </div>
        </Link>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${isActive
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div className="p-3 border-t border-gray-200">
          <div className="px-3 py-2 mb-1">
            <p className="text-xs font-medium text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside >

      {/* Main content */}
      < main className="flex-1 ml-56 min-h-screen" >
        {children}
      </main >
    </div >
  );
}
