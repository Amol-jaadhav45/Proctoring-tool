import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    LayoutDashboard,
    Calendar,
    BarChart3,
    ShieldCheck
} from 'lucide-react';

export const Sidebar: React.FC = () => {
    const location = useLocation();
    const { user } = useAuth();

    const navItems = [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'My Exams', path: '/upcoming', icon: Calendar },
        { name: 'Results', path: '/analytics', icon: BarChart3 },
        { name: 'System Check', path: '/system-check', icon: ShieldCheck },
    ];

    return (
        <aside className="w-20 lg:w-72 flex-shrink-0 flex flex-col justify-between border-r border-[#e6e6dd] bg-surface-light h-screen sticky top-0 z-20 transition-all duration-300 font-display">
            <div className="p-6 flex flex-col gap-8">
                {/* Logo */}
                <div className="flex items-center gap-3">
                    <div className="bg-primary/20 p-2 rounded-xl flex items-center justify-center text-primary-content">
                        <ShieldCheck className="w-8 h-8" strokeWidth={2} />
                    </div>
                    <div className="hidden lg:flex flex-col">
                        <h1 className="text-lg font-bold leading-tight text-text-main">ProctorTool</h1>
                        <p className="text-text-muted text-xs font-medium">Student Portal</p>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex flex-col gap-2">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-4 px-4 py-3 rounded-full transition-colors group ${isActive
                                    ? 'bg-primary text-primary-content'
                                    : 'hover:bg-[#f4f4e6] text-text-muted hover:text-text-main'
                                    }`}
                            >
                                <Icon className={`w-6 h-6 ${isActive ? 'fill-current' : ''}`} />
                                <span className={`hidden lg:block text-sm font-medium ${isActive ? 'font-semibold' : ''}`}>
                                    {item.name}
                                </span>
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* User Profile (Bottom Sidebar) */}
            <div className="p-6 border-t border-[#e6e6dd]">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border border-gray-300">
                            {/* Placeholder or User Initials */}
                            <span className="font-bold text-text-muted">{(user?.name || user?.email)?.[0]?.toUpperCase() || 'S'}</span>
                        </div>
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    </div>
                    <Link to="/profile" className="hidden lg:flex flex-col overflow-hidden hover:opacity-80 transition-opacity flex-1">
                        <p className="text-sm font-bold text-text-main truncate w-full">{user?.name || user?.email?.split('@')[0] || 'Student'}</p>
                        <p className="text-xs text-text-muted font-medium">View Profile</p>
                    </Link>
                </div>
            </div>
        </aside>
    );
};
