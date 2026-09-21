import React, { useMemo, useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { ProctorLayout } from '../components/ProctorLayout';
import { AdminLayout } from '../components/AdminLayout';
import { Bell, CheckCircle, AlertCircle, Info, X, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { notificationsApi } from '../services/api';

export const NotificationsPage: React.FC = () => {
    const { user } = useAuth();
    const userRole = user?.role || 'student';
    const [notifications, setNotifications] = useState<any[] | undefined>(undefined);
    const [loadingActions, setLoadingActions] = useState<Set<string>>(new Set());
    const [error, setError] = useState<string | null>(null);

    // Fetch notifications on mount
    const fetchNotifications = async () => {
        if (!user?.user_id) {
            console.warn("Cannot fetch notifications: no user_id");
            setNotifications([]);
            setError(null);
            return;
        }
        try {
            setError(null);
            console.log("Fetching notifications for user:", user.user_id);
            const data = await notificationsApi.getAll(user.user_id);
            console.log("Fetched notifications:", data);
            setNotifications(data);
        } catch (error: any) {
            console.error("Error fetching notifications:", error);
            const errorMessage = error?.message || error?.data?.message || 'Failed to load notifications';
            setError(errorMessage);
            setNotifications([]);
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Optional: Poll every 30s
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [user?.user_id]);

    const markAsRead = async (notificationId: string) => {
        if (!user || !notificationId) return;

        setLoadingActions(prev => new Set(prev).add(notificationId));
        try {
            await notificationsApi.markRead(notificationId, user.user_id);
            // Optimistic update
            setNotifications(prev => prev?.map(n => {
                const nId = String(n._id || n.id || '');
                return nId === notificationId ? { ...n, read: true } : n;
            }));
        } catch (err: any) {
            console.error('Failed to mark as read:', err);
            alert(`Failed to mark notification as read: ${err?.message || 'Unknown error'}`);
        } finally {
            setLoadingActions(prev => {
                const newSet = new Set(prev);
                newSet.delete(notificationId);
                return newSet;
            });
        }
    };

    const deleteNotification = async (notificationId: string) => {
        if (!user || !notificationId) return;

        setLoadingActions(prev => new Set(prev).add(notificationId));
        try {
            await notificationsApi.deleteNotification(notificationId, user.user_id);
            // Optimistic update
            setNotifications(prev => prev?.filter(n => {
                const nId = String(n._id || n.id || '');
                return nId !== notificationId;
            }));
        } catch (err: any) {
            console.error('Failed to delete notification:', err);
            alert(`Failed to delete notification: ${err?.message || 'Unknown error'}`);
        } finally {
            setLoadingActions(prev => {
                const newSet = new Set(prev);
                newSet.delete(notificationId);
                return newSet;
            });
        }
    };

    const markAllAsRead = async () => {
        if (!user) return;

        setLoadingActions(prev => new Set(prev).add('mark-all'));
        try {
            await notificationsApi.markAllAsRead(user.user_id);
            // Optimistic update
            setNotifications(prev => prev?.map(n => ({ ...n, read: true })));

            // Force re-fetch to ensure sync (since api.markAllAsRead returns count)
            fetchNotifications();
        } catch (err) {
            console.error('Failed to mark all as read:', err);
        } finally {
            setLoadingActions(prev => {
                const newSet = new Set(prev);
                newSet.delete('mark-all');
                return newSet;
            });
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return CheckCircle;
            case 'warning': return AlertCircle;
            case 'error': return AlertCircle;
            default: return Info;
        }
    };

    const unreadCount = useMemo(() =>
        notifications ? notifications.filter((n: any) => !n.read).length : 0,
        [notifications]
    );

    const loading = notifications === undefined;

    // Debug logging
    useEffect(() => {
        if (notifications !== undefined) {
            console.log("Notifications state updated:", {
                count: notifications?.length || 0,
                notifications: notifications
            });
        }
    }, [notifications]);

    // Render different layouts based on role
    const content = (
        <div className="flex-1 overflow-auto">
            <div className="p-8">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-[#f4f4e6] rounded-xl">
                                <Bell className="w-6 h-6 text-text-main" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black text-text-main">Notifications</h1>
                                <p className="text-text-muted mt-1 font-medium">
                                    {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
                                </p>
                            </div>
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                disabled={loadingActions.has('mark-all')}
                                className="px-4 py-2 text-sm text-text-main hover:text-primary font-bold transition-colors underline decoration-primary underline-offset-4 disabled:opacity-50"
                            >
                                {loadingActions.has('mark-all') ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    'Mark all as read'
                                )}
                            </button>
                        )}
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                            <p className="text-red-800 text-sm font-medium">Error: {error}</p>
                            <button
                                onClick={fetchNotifications}
                                className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                            >
                                Try again
                            </button>
                        </div>
                    )}

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        </div>
                    ) : !notifications || notifications.length === 0 ? (
                        <div className="bg-surface-light rounded-xl shadow-sm p-12 text-center border border-[#e6e6dd]">
                            <Bell className="w-16 h-16 text-[#e6e6dd] mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-text-main mb-2">No Notifications</h3>
                            <p className="text-text-muted font-medium">You're all caught up! No new notifications.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {notifications.map((notification: any, index: number) => {
                                if (!notification) {
                                    console.warn(`Notification at index ${index} is null/undefined`);
                                    return null;
                                }

                                const Icon = getIcon(notification.type);
                                const isUnread = !notification.read;
                                // Ensure notificationId is always a string
                                const notificationId = String(notification._id || notification.id || `unknown-${index}`);
                                const isLoading = loadingActions.has(notificationId);

                                if (!notificationId || notificationId === 'unknown') {
                                    console.warn("Invalid notification ID:", notification);
                                    return null;
                                }

                                return (
                                    <div
                                        key={notificationId}
                                        className={`bg-surface-light rounded-xl shadow-sm border p-6 transition-all ${isUnread
                                            ? `border-l-4 border-l-primary border-t-[#e6e6dd] border-r-[#e6e6dd] border-b-[#e6e6dd]`
                                            : 'border-[#e6e6dd]'
                                            }`}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className={`p-2 rounded-full ${notification.type === 'success' ? 'bg-green-100' :
                                                notification.type === 'warning' ? 'bg-yellow-100' :
                                                    notification.type === 'error' ? 'bg-red-100' :
                                                        'bg-[#f4f4e6]'
                                                }`}>
                                                <Icon className={`w-5 h-5 ${notification.type === 'success' ? 'text-green-600' :
                                                    notification.type === 'warning' ? 'text-yellow-600' :
                                                        notification.type === 'error' ? 'text-red-600' :
                                                            'text-text-main'
                                                    }`} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div>
                                                        <h3 className="font-bold text-text-main mb-1 text-lg">
                                                            {notification.title}
                                                            {isUnread && (
                                                                <span className="ml-2 w-2 h-2 bg-primary rounded-full inline-block" />
                                                            )}
                                                        </h3>
                                                        <p className="text-sm text-text-muted font-medium">{notification.message}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {isUnread && (
                                                            <button
                                                                onClick={() => markAsRead(notificationId)}
                                                                disabled={isLoading}
                                                                className="text-xs text-text-muted hover:text-primary font-bold disabled:opacity-50"
                                                            >
                                                                {isLoading ? (
                                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                                ) : (
                                                                    'Mark read'
                                                                )}
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => deleteNotification(notificationId)}
                                                            disabled={isLoading}
                                                            className="text-text-muted hover:text-red-500 transition-colors disabled:opacity-50"
                                                        >
                                                            {isLoading ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <X className="w-4 h-4" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="text-xs text-text-muted mt-2 font-bold">
                                                    {new Date(notification.timestamp).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }).filter(Boolean)}
                        </div>
                    )}
                </div>
            </div>
        </div>

    );

    // Return appropriate layout based on role
    if (userRole === 'instructor') {
        return (
            <ProctorLayout>
                {content}
            </ProctorLayout>
        );
    } else if (userRole === 'admin') {
        return (
            <AdminLayout>
                {content}
            </AdminLayout>
        );
    } else {
        return (
            <div className="flex min-h-screen bg-background-light dark:bg-background-dark font-display">
                <Sidebar />
                {content}
            </div>
        );
    }
};




