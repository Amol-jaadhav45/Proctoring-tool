import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { UserCheck, Clock, Loader2, UserPlus2 } from 'lucide-react';
import { CreateStudentModal } from '../../components/CreateStudentModal';

interface Proctor {
    id: string;
    name: string;
    email: string;
    role: string;
    active_sessions: number;
    total_sessions: number;
    availability: 'available' | 'busy' | 'offline';
    rating: number;
}

export const ProctorManagementPage: React.FC = () => {
    const { user: _user } = useAuth();
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Load all users from Convex and filter to staff who can proctor
    const allUsers = useQuery((api as any).users.getAll, undefined);

    const loading = allUsers === undefined;
    const proctors: Proctor[] =
        allUsers
            ?.filter((u: any) => u.role === 'instructor' || u.role === 'teacher')
            .map((u: any) => ({
                id: u.user_id,
                name: u.name || 'Unknown',
                email: u.email || '',
                role: u.role || 'instructor',
                active_sessions: 0,
                total_sessions: 0,
                availability: 'available' as const,
                rating: 4.6,
            })) || [];

    return (
        <div className="flex-1 p-8 bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <UserCheck className="w-8 h-8 text-blue-600" />
                            Proctor Management
                        </h1>
                        <p className="text-gray-500 dark:text-gray-300 mt-1">Manage proctors and their availability</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex flex-col text-right text-xs text-gray-500 dark:text-gray-400">
                            <span className="font-medium text-gray-700 dark:text-gray-200">Total staff that can proctor</span>
                            <span>{proctors.length} users</span>
                        </div>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm"
                        >
                            <UserPlus2 className="w-5 h-5" />
                            Add Proctor
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-100 dark:border-gray-700">
                        <div className="text-sm text-gray-500 dark:text-gray-300 mb-1">Total Proctors</div>
                        <div className="text-3xl font-bold text-gray-900 dark:text-white">{proctors.length}</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-100 dark:border-gray-700">
                        <div className="text-sm text-gray-500 dark:text-gray-300 mb-1">Available</div>
                        <div className="text-3xl font-bold text-green-600">
                            {proctors.filter(p => p.availability === 'available').length}
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-100 dark:border-gray-700">
                        <div className="text-sm text-gray-500 dark:text-gray-300 mb-1">Active Sessions</div>
                        <div className="text-3xl font-bold text-blue-600">
                            {proctors.reduce((sum, p) => sum + p.active_sessions, 0)}
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-100 dark:border-gray-700">
                        <div className="text-sm text-gray-500 dark:text-gray-300 mb-1">Avg Rating</div>
                        <div className="text-3xl font-bold text-yellow-600">
                            {proctors.length > 0
                                ? (proctors.reduce((sum, p) => sum + p.rating, 0) / proctors.length).toFixed(1)
                                : '0.0'}
                        </div>
                    </div>
                </div>

                {/* Proctors List */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    </div>
                ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Proctor</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Role</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Active Sessions</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Total Sessions</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Rating</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {proctors.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-300">
                                                <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                                <p>No proctors found yet. Use “Add Proctor” to invite an instructor.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        proctors.map((proctor) => (
                                            <tr key={proctor.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/60">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold">
                                                            {proctor.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-gray-900 dark:text-white">{proctor.name}</div>
                                                            <div className="text-sm text-gray-500 dark:text-gray-300">{proctor.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200">
                                                    {proctor.role}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 py-1 text-xs font-medium rounded ${proctor.availability === 'available' ? 'bg-green-100 text-green-700' :
                                                        proctor.availability === 'busy' ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-gray-100 text-gray-700'
                                                        }`}>
                                                        {proctor.availability.charAt(0).toUpperCase() + proctor.availability.slice(1)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="w-4 h-4 text-blue-600" />
                                                        <span className="font-medium text-gray-900 dark:text-white">{proctor.active_sessions}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-gray-900 dark:text-white">{proctor.total_sessions}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-yellow-500">★</span>
                                                        <span className="font-medium text-gray-900 dark:text-white">{proctor.rating.toFixed(1)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <button className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium">
                                                        View Schedule
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {showCreateModal && (
                <CreateStudentModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => { /* Convex useQuery will auto-refresh */ }}
                    defaultRole="instructor"
                />
            )}
        </div>
    );
};
