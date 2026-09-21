import React, { useEffect, useState, useRef } from 'react';
import { userApi } from '../services/api';
import { Loader2, Search, Plus, Users, Upload, FileDown, AlertCircle, Trash2, Clock } from 'lucide-react';
import { CreateStudentModal } from '../components/CreateStudentModal';
import { parseCSV, validateStudentsCSV } from '../utils/csvUtils';
import { useAuth } from '../contexts/AuthContext';
import { useConvex } from 'convex/react';
import { api } from '../../../convex/_generated/api';

interface UserProfile {
    user_id: string;
    name: string;
    email: string;
    role: 'student' | 'instructor' | 'admin';
    institute_id?: string;
    branch_id?: string;
}

interface PendingInvite {
    _id: string;
    email: string;
    role: 'student' | 'instructor' | 'admin';
    token: string;
    used: boolean;
    expiresAt: number;
    isPending?: boolean;
}

export const UserManagement: React.FC = () => {
    const { user: currentUser } = useAuth();
    const isInstructor = currentUser?.role === 'instructor';
    const convex = useConvex();

    const [users, setUsers] = useState<UserProfile[]>([]);
    const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'instructor'>(currentUser?.role === 'admin' ? 'all' : (isInstructor ? 'student' : 'all'));
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [bulkImporting, setBulkImporting] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const data = await userApi.getAll();
            setUsers(data || []);

            // Fetch pending invites
            const invites = await convex.query((api as any).users.getAllPendingInvites);
            setPendingInvites(invites || []);
        } catch (err) {
            console.error('Error fetching users:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (user: UserProfile) => {
        if (!window.confirm(`Are you sure you want to delete ${user.name} (${user.email})? This action cannot be undone.`)) {
            return;
        }

        try {
            setLoading(true);
            await userApi.delete(user.user_id);
            await fetchUsers();
        } catch (err) {
            console.error('Error deleting user:', err);
            alert('Failed to delete user. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteInvite = async (invite: PendingInvite) => {
        if (!window.confirm(`Are you sure you want to delete the pending invite for ${invite.email}?`)) {
            return;
        }

        try {
            setLoading(true);
            await convex.mutation((api as any).auth.deleteInvite, { inviteId: invite._id });
            await fetchUsers();
        } catch (err) {
            console.error('Error deleting invite:', err);
            alert('Failed to delete invite. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target?.result as string;
            if (!text) return;

            setImportError(null);
            const parsed = parseCSV(text);
            const result = validateStudentsCSV(parsed);

            if (result.error) {
                setImportError(result.error);
            } else if (result.students) {
                setBulkImporting(true);
                try {
                    await userApi.bulkCreate(result.students);
                    await fetchUsers(); // Refresh the list
                    alert(`Successfully imported ${result.students.length} students.`);
                } catch (err) {
                    console.error('Bulk import failed:', err);
                    setImportError('Failed to import students. Some might already exist or the data is invalid.');
                } finally {
                    setBulkImporting(false);
                }
            }
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.onerror = () => {
            setImportError('Failed to read CSV file.');
        };
        reader.readAsText(file);
    };

    const downloadTemplate = () => {
        const template = "name,email,studentId\nJohn Doe,john@example.com,STU001\nJane Smith,jane@example.com,STU002\n";
        const blob = new Blob([template], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'students_import_template.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const filteredUsers = users
        .filter((user) => user.role !== 'admin')
        .filter((user) =>
            roleFilter === 'all' ? true : user.role === roleFilter
        )
        .filter((user) =>
            search
                ? user.name.toLowerCase().includes(search.toLowerCase()) ||
                user.email.toLowerCase().includes(search.toLowerCase())
                : true
        );

    const filteredInvites = pendingInvites
        .filter((invite) => invite.role !== 'admin')
        .filter((invite) =>
            roleFilter === 'all' ? true : invite.role === roleFilter
        )
        .filter((invite) =>
            search
                ? invite.email.toLowerCase().includes(search.toLowerCase())
                : true
        );

    // Combine users and pending invites for display
    const combinedList = [
        ...filteredUsers.map(u => ({ ...u, isPending: false })),
        ...filteredInvites.map(i => ({ ...i, user_id: i._id, name: 'Pending', isPending: true }))
    ];

    return (
        <div className="flex-1 p-8 bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <Users className="w-8 h-8 text-blue-600" />
                            User Management
                        </h1>
                        <p className="text-gray-500 dark:text-gray-300 mt-1">Manage students and proctors</p>
                    </div>
                    <div className="flex gap-3">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleCSVUpload}
                            accept=".csv"
                            className="hidden"
                        />
                        <button
                            onClick={downloadTemplate}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 font-medium transition-colors border border-gray-200 dark:border-gray-700"
                        >
                            <FileDown className="w-5 h-5" />
                            Template
                        </button>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={bulkImporting}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium shadow-sm transition-colors disabled:opacity-50"
                        >
                            {bulkImporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                            Import CSV
                        </button>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                            Add User
                        </button>
                    </div>
                </div>

                {importError && (
                    <div className="bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300 p-4 rounded-xl mb-6 flex items-start gap-3 border border-red-100 dark:border-red-900/50">
                        <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                        <p className="text-sm font-medium">{importError}</p>
                    </div>
                )}

                {/* Filters */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <div className="relative w-full md:w-80">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by name or email"
                            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <label className="text-sm text-gray-600 dark:text-gray-300">Role:</label>
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value as any)}
                            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="all">All Roles</option>
                            <option value="student">Students</option>
                            <option value="instructor">Proctors</option>
                        </select>
                    </div>
                </div>

                {/* Users table */}
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    </div>
                ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 uppercase text-xs">Name</th>
                                        <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 uppercase text-xs">Email</th>
                                        <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 uppercase text-xs">Role</th>
                                        <th className="px-6 py-3 text-right font-semibold text-gray-700 dark:text-gray-300 uppercase text-xs">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {combinedList.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-gray-500 dark:text-gray-300">
                                                No users match your filters.
                                            </td>
                                        </tr>
                                    ) : (
                                        combinedList.map((item: any) => (
                                            <tr key={item.user_id} className={`hover:bg-gray-50 dark:hover:bg-gray-900/60 ${item.isPending ? 'bg-yellow-50/30 dark:bg-yellow-900/10' : ''}`}>
                                                <td className="px-6 py-3 text-gray-900 dark:text-white font-medium">
                                                    <div className="flex items-center gap-2">
                                                        {item.name}
                                                        {item.isPending && (
                                                            <span className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
                                                                <Clock className="w-3 h-3" />
                                                                Invite Sent
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3 text-gray-600 dark:text-gray-200">{item.email}</td>
                                                <td className="px-6 py-3">
                                                    <span
                                                        className={`px-2.5 py-1 text-xs font-semibold rounded-full ${item.role === 'student'
                                                                ? 'bg-green-50 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                                                : item.role === 'instructor'
                                                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                                                    : 'bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                                                            }`}
                                                    >
                                                        {item.role.charAt(0).toUpperCase() + item.role.slice(1)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-right">
                                                    <button
                                                        onClick={() => item.isPending ? handleDeleteInvite(item) : handleDeleteUser(item)}
                                                        className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                        title={item.isPending ? "Delete Invite" : "Delete User"}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
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
                    onSuccess={() => {
                        fetchUsers();
                    }}
                    defaultRole={isInstructor ? 'student' : 'student'}
                    hideRoleSelector={isInstructor}
                />
            )}
        </div>
    );
};
