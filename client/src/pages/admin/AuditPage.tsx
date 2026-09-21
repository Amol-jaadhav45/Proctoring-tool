import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Loader2, Lock, Search, Filter, Download, AlertTriangle, User, Calendar, Shield } from 'lucide-react';

interface AuditLog {
    id: string;
    user_id: string;
    action: string;
    resource_type: string;
    resource_id: string;
    ip_address?: string;
    user_agent?: string;
    timestamp: string;
    metadata?: any;
    user_name?: string;
}

export const AuditPage: React.FC = () => {
    const { user: _user } = useAuth();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<string>('all');


    useEffect(() => {
        fetchAuditLogs();
    }, []);

    const fetchAuditLogs = async () => {
        try {
            setLoading(true);
            // Fetch from violations, sessions, and user_profiles to create audit trail
            const [violationsResult, sessionsResult, usersResult] = await Promise.all([
                supabase
                    .from('violations')
                    .select('*, exam_sessions(user_id), user_profiles(name)')
                    .order('timestamp', { ascending: false })
                    .limit(100),
                supabase
                    .from('exam_sessions')
                    .select('*, exams(title), user_profiles(name)')
                    .order('started_at', { ascending: false })
                    .limit(50),
                supabase
                    .from('user_profiles')
                    .select('*, institutes(name)')
                    .order('updated_at', { ascending: false })
                    .limit(50)
            ]);

            const auditLogs: AuditLog[] = [];

            // Add violation logs
            if (violationsResult.data) {
                violationsResult.data.forEach((v: any) => {
                    auditLogs.push({
                        id: v.id,
                        user_id: v.exam_sessions?.user_id || 'unknown',
                        action: `Violation: ${v.type}`,
                        resource_type: 'violation',
                        resource_id: v.id,
                        timestamp: v.timestamp,
                        metadata: { severity: v.severity },
                        user_name: v.user_profiles?.name || 'Unknown'
                    });
                });
            }

            // Add session logs
            if (sessionsResult.data) {
                sessionsResult.data.forEach((s: any) => {
                    auditLogs.push({
                        id: s.id,
                        user_id: s.user_id,
                        action: `Session ${s.status}`,
                        resource_type: 'session',
                        resource_id: s.id,
                        timestamp: s.started_at,
                        metadata: { exam: s.exams?.title, status: s.status },
                        user_name: s.user_profiles?.name || 'Unknown'
                    });
                });
            }

            // Add user activity logs
            if (usersResult.data) {
                usersResult.data.forEach((u: any) => {
                    auditLogs.push({
                        id: u.user_id,
                        user_id: u.user_id,
                        action: 'Profile updated',
                        resource_type: 'user',
                        resource_id: u.user_id,
                        timestamp: u.updated_at || u.created_at,
                        metadata: { role: u.role, institute: u.institutes?.name },
                        user_name: u.name || 'Unknown'
                    });
                });
            }

            // Sort by timestamp
            auditLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setLogs(auditLogs.slice(0, 200));
        } catch (err) {
            console.error('Error fetching audit logs:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = logs.filter(log => {
        const matchesSearch = log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.resource_type.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterType === 'all' || log.resource_type === filterType;
        return matchesSearch && matchesFilter;
    });

    const exportLogs = () => {
        const csv = [
            ['Timestamp', 'User', 'Action', 'Resource Type', 'Resource ID', 'Metadata'].join(','),
            ...filteredLogs.map(log => [
                new Date(log.timestamp).toISOString(),
                log.user_name || 'Unknown',
                log.action,
                log.resource_type,
                log.resource_id,
                JSON.stringify(log.metadata || {})
            ].join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    return (
        <div className="flex-1 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <Lock className="w-8 h-8 text-blue-600" />
                            Security & Audit Logs
                        </h1>
                        <p className="text-gray-500 mt-1">Complete audit trail of all system activities</p>
                    </div>
                    <button
                        onClick={exportLogs}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                    >
                        <Download className="w-5 h-5" />
                        Export CSV
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search by action, user, or resource..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <Filter className="w-5 h-5 text-gray-400" />
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="all">All Types</option>
                            <option value="violation">Violations</option>
                            <option value="session">Sessions</option>
                            <option value="user">User Activity</option>
                        </select>
                    </div>
                </div>

                {/* Audit Logs Table */}
                <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>No audit logs found matching your criteria.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Timestamp</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">User</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Action</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Resource</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Details</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredLogs.map((log) => (
                                        <tr key={log.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-gray-400" />
                                                    <span className="text-sm text-gray-900">
                                                        {new Date(log.timestamp).toLocaleString()}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <User className="w-4 h-4 text-gray-400" />
                                                    <span className="text-sm text-gray-900">{log.user_name || 'Unknown'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    {log.resource_type === 'violation' && (
                                                        <AlertTriangle className="w-4 h-4 text-red-500" />
                                                    )}
                                                    <span className={`text-sm font-medium ${log.resource_type === 'violation' ? 'text-red-700' : 'text-gray-900'
                                                        }`}>
                                                        {log.action}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded capitalize">
                                                    {log.resource_type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-600">
                                                    {log.metadata && Object.keys(log.metadata).length > 0 ? (
                                                        <details className="cursor-pointer">
                                                            <summary className="text-blue-600 hover:text-blue-700">View Details</summary>
                                                            <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-auto max-w-md">
                                                                {JSON.stringify(log.metadata, null, 2)}
                                                            </pre>
                                                        </details>
                                                    ) : (
                                                        <span className="text-gray-400">No details</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Stats Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                        <div className="text-sm text-gray-500 mb-1">Total Logs</div>
                        <div className="text-2xl font-bold text-gray-900">{logs.length}</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                        <div className="text-sm text-gray-500 mb-1">Violations</div>
                        <div className="text-2xl font-bold text-red-600">
                            {logs.filter(l => l.resource_type === 'violation').length}
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                        <div className="text-sm text-gray-500 mb-1">Sessions</div>
                        <div className="text-2xl font-bold text-blue-600">
                            {logs.filter(l => l.resource_type === 'session').length}
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                        <div className="text-sm text-gray-500 mb-1">User Activities</div>
                        <div className="text-2xl font-bold text-green-600">
                            {logs.filter(l => l.resource_type === 'user').length}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
