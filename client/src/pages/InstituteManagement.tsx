import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { useAuth } from '../contexts/AuthContext';

import { Loader2, Building2, Plus, Trash2, MapPin, Hash, AlertCircle } from 'lucide-react';
import { instituteApi } from '../services/api';




interface Institute {
    id: string;
    name: string;
    code: string;
    address: string;
}

interface Branch {
    id: string;
    _id?: string;
    institute_id: string;
    name: string;
    code?: string;
}

export const InstituteManagement: React.FC = () => {
    const { user: _user } = useAuth();
    const [institutes, setInstitutes] = useState<Institute[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal states
    const [showAddInstitute, setShowAddInstitute] = useState(false);
    const [showAddBranch, setShowAddBranch] = useState<string | null>(null); // institute_id or null

    // Form states
    const [newInstitute, setNewInstitute] = useState({ name: '', code: '', address: '' });
    const [newBranch, setNewBranch] = useState({ name: '', code: '' });

    const fetchData = async () => {
        try {
            setLoading(true);

            // Fetch institutes
            const instData = await instituteApi.getAll();
            // Transform Convex data to match interface
            const transformedInstitutes = (instData || []).map((inst: any) => ({
                id: inst._id || inst.id,
                name: inst.name,
                code: inst.code,
                address: inst.address
            }));
            setInstitutes(transformedInstitutes);

            // Fetch branches
            const branchData = await instituteApi.getAllBranches("");
            // Transform Convex data to match interface
            const transformedBranches = (branchData || []).map((branch: any) => ({
                id: branch._id || branch.id,
                institute_id: branch.institute_id,
                name: branch.name,
                code: branch.code
            }));
            setBranches(transformedBranches);

        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Failed to load institutes');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateInstitute = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await instituteApi.create(newInstitute);

            setShowAddInstitute(false);
            setNewInstitute({ name: '', code: '', address: '' });
            fetchData();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleCreateBranch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!showAddBranch) return;

        if (!newBranch.name.trim()) {
            alert('Please enter a branch name');
            return;
        }

        try {
            console.log('Creating branch:', { instituteId: showAddBranch, name: newBranch.name, code: newBranch.code });
            await instituteApi.createBranch(showAddBranch, newBranch.name, newBranch.code);
            console.log('Branch created successfully');

            setShowAddBranch(null);
            setNewBranch({ name: '', code: '' });
            fetchData();
        } catch (err: any) {
            console.error('Error creating branch:', err);
            alert(err.message || 'Failed to create branch. Make sure you have deployed the Convex functions.');
        }
    };

    const handleDeleteInstitute = async (id: string) => {
        if (!confirm('Are you sure? This will delete all associated branches and users.')) return;

        try {
            console.log('Deleting institute:', id);
            await instituteApi.delete(id);
            console.log('Institute deleted successfully');
            fetchData();
        } catch (err: any) {
            console.error('Error deleting institute:', err);
            alert(err.message || 'Failed to delete institute. Make sure you have deployed the Convex functions.');
        }
    };


    return (
        <AdminLayout>
            <div className="flex min-h-screen bg-gray-50">
                <div className="flex-1 p-8 overflow-auto">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">Institute Management</h1>
                                <p className="text-gray-500 mt-1">Manage educational institutes and their branches</p>
                            </div>
                            <button
                                onClick={() => setShowAddInstitute(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                            >
                                <Plus className="w-5 h-5" />
                                Add Institute
                            </button>
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                                <span className="ml-3 text-gray-600">Loading data...</span>
                            </div>
                        ) : error ? (
                            <div className="bg-red-50 text-red-800 p-4 rounded-lg flex items-center gap-2">
                                <AlertCircle className="w-5 h-5" />
                                {error}
                            </div>
                        ) : (
                            <div className="grid gap-6">
                                {institutes.map((inst) => (
                                    <div key={inst.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                                    <Building2 className="w-5 h-5 text-blue-600" />
                                                    {inst.name}
                                                </h3>
                                                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                                    <span className="flex items-center gap-1">
                                                        <Hash className="w-4 h-4" />
                                                        Code: {inst.code}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="w-4 h-4" />
                                                        {inst.address}
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteInstitute(inst.id)}
                                                className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                                title="Delete Institute"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>

                                        <div className="border-t border-gray-100 pt-4">
                                            <div className="flex justify-between items-center mb-3">
                                                <h4 className="text-sm font-semibold text-gray-700">Branches</h4>
                                                <button
                                                    onClick={() => setShowAddBranch(inst.id)}
                                                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                    Add Branch
                                                </button>
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                {branches.filter(b => {
                                                    // Handle both string and Convex Id types
                                                    const branchInstId = typeof b.institute_id === 'object' ? String(b.institute_id) : b.institute_id;
                                                    const instId = typeof inst.id === 'object' ? String(inst.id) : inst.id;
                                                    return branchInstId === instId;
                                                }).map(branch => (
                                                    <span key={branch.id || branch._id} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                                                        {branch.name}
                                                        {branch.code && <span className="text-xs text-gray-500">({branch.code})</span>}
                                                    </span>
                                                ))}
                                                {branches.filter(b => {
                                                    const branchInstId = typeof b.institute_id === 'object' ? String(b.institute_id) : b.institute_id;
                                                    const instId = typeof inst.id === 'object' ? String(inst.id) : inst.id;
                                                    return branchInstId === instId;
                                                }).length === 0 && (
                                                        <span className="text-sm text-gray-400 italic">No branches added</span>
                                                    )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Add Institute Modal */}
                {showAddInstitute && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                            <h2 className="text-xl font-bold mb-4">Add New Institute</h2>
                            <form onSubmit={handleCreateInstitute} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Institute Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={newInstitute.name}
                                        onChange={e => setNewInstitute({ ...newInstitute, name: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Institute Code</label>
                                    <input
                                        type="text"
                                        required
                                        value={newInstitute.code}
                                        onChange={e => setNewInstitute({ ...newInstitute, code: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                    <textarea
                                        required
                                        value={newInstitute.address}
                                        onChange={e => setNewInstitute({ ...newInstitute, address: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="flex justify-end gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddInstitute(false)}
                                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                    >
                                        Create Institute
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Add Branch Modal */}
                {showAddBranch && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
                            <h2 className="text-xl font-bold mb-4">Add Branch</h2>
                            <p className="text-sm text-gray-500 mb-4">
                                Adding branch to: {institutes.find(i => i.id === showAddBranch)?.name || 'Institute'}
                            </p>
                            <form onSubmit={handleCreateBranch} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Branch Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={newBranch.name}
                                        onChange={e => setNewBranch({ ...newBranch, name: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g., Computer Science"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Branch Code (Optional)</label>
                                    <input
                                        type="text"
                                        value={newBranch.code}
                                        onChange={e => setNewBranch({ ...newBranch, code: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g., CS (auto-generated if empty)"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Leave empty to auto-generate</p>
                                </div>
                                <div className="flex justify-end gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowAddBranch(null);
                                            setNewBranch({ name: '', code: '' });
                                        }}
                                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                    >
                                        Add Branch
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
};
