import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Dashboard } from '../pages/Dashboard';
import { Loader2 } from 'lucide-react';

export const RoleBasedHome: React.FC = () => {
    const { user, loading: authLoading } = useAuth();

    if (authLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Use role directly from user object (already fetched from Convex)
    const userRole = user.role || 'student';

    // Admins go to admin workspace
    if (userRole === 'admin') {
        return <Navigate to="/admin/dashboard" replace />;
    }

    // Instructors (proctors) go to proctor workspace
    if (userRole === 'instructor') {
        return <Navigate to="/proctor/dashboard" replace />;
    }

    // Default: Render Student Dashboard
    return <Dashboard />;
};
