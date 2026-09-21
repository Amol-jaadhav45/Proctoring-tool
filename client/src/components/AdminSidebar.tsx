import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Users, Settings, Shield,
    Menu, X, type LucideIcon
} from 'lucide-react';


interface NavItem {
    name: string;
    path: string;
    icon: LucideIcon;
}

const navItems: NavItem[] = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Members', path: '/admin/users', icon: Users },
    { name: 'System Settings', path: '/admin/settings', icon: Settings },
];

export const AdminSidebar: React.FC = () => {
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed top-4 left-4 z-[60] p-2.5 rounded-xl shadow-lg backdrop-blur-md transition-all duration-300 border border-white/20 ${isOpen
                    ? 'translate-x-[15rem] bg-white/10 text-white'
                    : 'bg-white/80 dark:bg-gray-900/80 text-gray-700 dark:text-gray-200 hover:scale-105'
                    }`}
                aria-label="Toggle Menu"
            >
                {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={() => setIsOpen(false)}
            />

            {/* Sidebar Drawer */}
            <div
                className={`fixed top-0 left-0 h-screen w-72 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white shadow-2xl z-[60] transform transition-transform duration-300 cubic-bezier(0.4, 0, 0.2, 1) border-r border-white/10 ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="flex flex-col h-full relative overflow-hidden">
                    {/* Decorative background glow */}
                    <div className="absolute top-0 left-0 w-full h-64 bg-blue-500/10 blur-3xl rounded-full -translate-y-1/2 pointer-events-none" />

                    {/* Header */}
                    <div className="pt-8 px-6 pb-8">
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg ring-1 ring-white/20">
                                <Shield className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white tracking-tight">ProctAI</h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="inline-block w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                                        Admin Workspace
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto px-4 space-y-1.5 custom-scrollbar pb-6 relative z-10">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname.startsWith(item.path);

                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setIsOpen(false)}
                                    className={`flex items-center gap-3.5 px-4 py-3.5 rounded-xl transition-all duration-200 group relative overflow-hidden ${isActive
                                        ? 'bg-blue-600/90 text-white shadow-lg shadow-blue-500/20'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    {isActive && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-500 opacity-100" />
                                    )}
                                    <Icon className={`w-5 h-5 relative z-10 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
                                    <span className={`text-sm font-medium relative z-10 ${isActive ? 'translate-x-1' : ''} transition-transform`}>
                                        {item.name}
                                    </span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Footer */}
                    <div className="p-6 border-t border-white/5 bg-slate-900/50 backdrop-blur-lg relative z-10">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer group flex-1">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold ring-2 ring-slate-900">
                                    AD
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate group-hover:text-blue-200 transition-colors">Admin</p>
                                    <p className="text-xs text-slate-500 truncate">View Profile</p>
                                </div>
                            </div>
                            <div className="ml-3">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
