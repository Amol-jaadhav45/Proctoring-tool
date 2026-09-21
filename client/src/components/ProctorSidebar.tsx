import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, FileText, Calendar, Eye,
    AlertTriangle, Menu, X, type LucideIcon, Settings, Users
} from 'lucide-react';


interface NavItem {
    name: string;
    path: string;
    icon: LucideIcon;
}

const navItems: NavItem[] = [
    { name: 'Dashboard', path: '/proctor/dashboard', icon: LayoutDashboard },
    { name: 'Exam Management', path: '/proctor/exams', icon: FileText },
    { name: 'Scheduling', path: '/proctor/scheduling', icon: Calendar },
    { name: 'Students', path: '/proctor/users', icon: Users },
    { name: 'Flagged Incidents', path: '/proctor/violations', icon: AlertTriangle },
    { name: 'Settings', path: '/proctor/settings', icon: Settings },
];

interface ProctorSidebarProps {
    isOpen: boolean;
    onToggle: () => void;
    onClose: () => void;
}

export const ProctorSidebar: React.FC<ProctorSidebarProps> = ({ isOpen, onToggle, onClose }) => {
    const location = useLocation();

    return (
        <>
            {/* Toggle Button - Only visible when closed */}
            <button
                onClick={onToggle}
                className={`fixed top-4 left-4 z-[60] p-2.5 rounded-xl shadow-lg backdrop-blur-md transition-all duration-300 border border-white/20 bg-white/80 dark:bg-gray-900/80 text-gray-700 dark:text-gray-200 hover:scale-105 ${isOpen
                    ? 'hidden'
                    : 'block'
                    }`}
                aria-label="Toggle Menu"
            >
                <Menu className="w-5 h-5" />
            </button>

            {/* Backdrop - Visible only on mobile when open */}
            <div
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] transition-opacity duration-300 lg:hidden ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={onClose}
            />

            {/* Sidebar Drawer */}
            <div
                onMouseLeave={onClose}
                className={`fixed top-0 left-0 h-screen w-72 bg-gradient-to-br from-indigo-900 via-indigo-900 to-slate-900 text-white shadow-2xl z-[60] transform transition-transform duration-300 cubic-bezier(0.4, 0, 0.2, 1) border-r border-white/10 ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                    }`}
            >
                <div className="flex flex-col h-full relative overflow-hidden">
                    {/* Decorative background glow */}
                    <div className="absolute top-0 left-0 w-full h-64 bg-purple-500/10 blur-3xl rounded-full -translate-y-1/2 pointer-events-none" />

                    {/* Header */}
                    <div className="pt-6 px-6 pb-6 relative z-10">
                        <div className="flex items-center justify-between mb-6">
                            {/* Close Button (Visible when open) */}
                            <button
                                onClick={onClose}
                                className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
                                aria-label="Close Sidebar"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg ring-1 ring-white/20">
                                <Eye className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white tracking-tight">ProctAI</h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                                        Proctor Portal
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto px-4 space-y-1.5 custom-scrollbar pb-6 relative z-10">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            // Check if exact match or sub-path (except strict check for dashboard to avoid partial match issues if we had /proctor only)
                            const isActive = location.pathname.startsWith(item.path);

                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => {
                                        // On mobile, close when navigating. On desktop, keep open.
                                        if (window.innerWidth < 1024) onClose();
                                    }}
                                    className={`flex items-center gap-3.5 px-4 py-3.5 rounded-xl transition-all duration-200 group relative overflow-hidden ${isActive
                                        ? 'bg-indigo-600/90 text-white shadow-lg shadow-indigo-500/20'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    {isActive && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-indigo-500 opacity-100" />
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
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold ring-2 ring-slate-900">
                                    PR
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate group-hover:text-indigo-200 transition-colors">Proctor</p>
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
