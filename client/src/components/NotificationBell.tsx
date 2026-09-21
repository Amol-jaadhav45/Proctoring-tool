import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { notificationsApi } from '../services/api';
import { ErrorBoundary } from './ErrorBoundary';

const NotificationBellContent: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);

    // Poll for notifications every 30 seconds
    useEffect(() => {
        if (!user?.user_id) return;

        const fetchCount = async () => {
            const count = await notificationsApi.getUnreadCount(user.user_id);
            setUnreadCount(count);
        };

        fetchCount();
        const interval = setInterval(fetchCount, 30000); // Poll every 30s

        // Also subscribe to realtime changes (optional optimization)
        // For now, polling is safer/simpler given the recent migration

        return () => clearInterval(interval);
    }, [user?.user_id]);

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Navigate based on user role
        if (!user) {
            console.warn('NotificationBell: No user found');
            return;
        }
        
        const userRole = user.role || 'student';
        console.log('NotificationBell: Navigating for role:', userRole);
        
        try {
            if (userRole === 'admin') {
                navigate('/admin/notifications');
            } else if (userRole === 'instructor') {
                navigate('/proctor/notifications');
            } else {
                navigate('/notifications');
            }
        } catch (error) {
            console.error('NotificationBell: Navigation error:', error);
            // Fallback to window.location
            const path = userRole === 'admin' ? '/admin/notifications' : 
                        userRole === 'instructor' ? '/proctor/notifications' : 
                        '/notifications';
            window.location.href = path;
        }
    };

    // Handle loading and error states
    if (!user) {
        return null;
    }

    return (
        <button
            type="button"
            onClick={handleClick}
            className="relative p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors z-10"
            title="Notifications"
            aria-label="View notifications"
        >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold z-20">
                    {unreadCount > 99 ? '99+' : unreadCount}
                </span>
            )}
        </button>
    );
};

export const NotificationBell: React.FC = () => {
    const { user } = useAuth();
    
    const getNotificationPath = () => {
        if (!user) return '/notifications';
        const userRole = user.role || 'student';
        if (userRole === 'admin') {
            return '/admin/notifications';
        } else if (userRole === 'instructor') {
            return '/proctor/notifications';
        } else {
            return '/notifications';
        }
    };

    return (
        <ErrorBoundary fallback={
            <button
                type="button"
                onClick={() => {
                    const path = getNotificationPath();
                    window.location.href = path;
                }}
                className="relative p-2 text-gray-400 rounded-lg hover:text-gray-600 transition-colors z-10"
                title="Notifications (limited functionality)"
                aria-label="View notifications"
            >
                <Bell className="w-5 h-5" />
            </button>
        }>
            <NotificationBellContent />
        </ErrorBoundary>
    );
};