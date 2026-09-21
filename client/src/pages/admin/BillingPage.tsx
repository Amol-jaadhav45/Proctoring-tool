import React, { useState, useEffect } from 'react';

import { useAuth } from '../../contexts/AuthContext';
import { CreditCard, Download, Calendar, Loader2, CheckCircle } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';

interface BillingInfo {
    plan: string;
    status: 'active' | 'expired' | 'trial';
    users_limit: number;
    exams_limit: number;
    current_usage: {
        users: number;
        exams: number;
        sessions: number;
    };
    next_billing_date?: string;
    amount: number;
}

interface Invoice {
    id: string;
    date: string;
    amount: number;
    status: 'paid' | 'pending' | 'overdue';
    description: string;
}

export const BillingPage: React.FC = () => {
    const { user: _user } = useAuth();
    const stats = useQuery((api as any).monitoring.getGlobalUsageStats);

    const [billingInfo, setBillingInfo] = useState<BillingInfo>({
        plan: 'Enterprise',
        status: 'active',
        users_limit: 1000,
        exams_limit: 500,
        current_usage: {
            users: 0,
            exams: 0,
            sessions: 0,
        },
        next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        amount: 999,
    });
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);


    useEffect(() => {
        if (stats) {
            setBillingInfo(prev => ({
                ...prev,
                current_usage: {
                    users: stats.users,
                    exams: stats.exams,
                    sessions: stats.sessions,
                }
            }));
            setLoading(false);
        }
    }, [stats]);

    useEffect(() => {
        fetchBillingData();
    }, []);

    const fetchBillingData = async () => {
        try {
            // Mock invoices
            setInvoices([
                {
                    id: 'inv-001',
                    date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                    amount: 999,
                    status: 'paid',
                    description: 'Monthly Subscription - Enterprise Plan'
                },
                {
                    id: 'inv-002',
                    date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
                    amount: 999,
                    status: 'paid',
                    description: 'Monthly Subscription - Enterprise Plan'
                },
            ]);
        } catch (err) {
            console.error('Error fetching billing data:', err);
        }
    };

    const downloadInvoice = (invoiceId: string) => {
        alert(`Downloading invoice ${invoiceId}...`);
        // In a real app, generate and download PDF
    };

    return (
        <div className="flex-1 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <CreditCard className="w-8 h-8 text-blue-600" />
                        Billing & License Management
                    </h1>
                    <p className="text-gray-500 mt-1">Manage your subscription and usage</p>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Current Plan */}
                        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">{billingInfo.plan} Plan</h2>
                                    <p className="text-gray-500 mt-1">
                                        Status: <span className={`font-medium ${billingInfo.status === 'active' ? 'text-green-600' :
                                            billingInfo.status === 'expired' ? 'text-red-600' :
                                                'text-yellow-600'
                                            }`}>
                                            {billingInfo.status.charAt(0).toUpperCase() + billingInfo.status.slice(1)}
                                        </span>
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-bold text-gray-900">${billingInfo.amount}</div>
                                    <div className="text-sm text-gray-500">per month</div>
                                </div>
                            </div>
                            {billingInfo.next_billing_date && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Calendar className="w-4 h-4" />
                                    Next billing date: {new Date(billingInfo.next_billing_date).toLocaleDateString()}
                                </div>
                            )}
                        </div>

                        {/* Usage Statistics */}
                        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Current Usage</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <div className="text-sm text-gray-500 mb-1">Users</div>
                                    <div className="text-2xl font-bold text-gray-900">
                                        {billingInfo.current_usage.users} / {billingInfo.users_limit}
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                        <div
                                            className="bg-blue-600 h-2 rounded-full"
                                            style={{
                                                width: `${Math.min((billingInfo.current_usage.users / billingInfo.users_limit) * 100, 100)}%`
                                            }}
                                        />
                                    </div>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <div className="text-sm text-gray-500 mb-1">Exams</div>
                                    <div className="text-2xl font-bold text-gray-900">
                                        {billingInfo.current_usage.exams} / {billingInfo.exams_limit}
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                        <div
                                            className="bg-green-600 h-2 rounded-full"
                                            style={{
                                                width: `${Math.min((billingInfo.current_usage.exams / billingInfo.exams_limit) * 100, 100)}%`
                                            }}
                                        />
                                    </div>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <div className="text-sm text-gray-500 mb-1">Sessions (This Month)</div>
                                    <div className="text-2xl font-bold text-gray-900">
                                        {billingInfo.current_usage.sessions}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Invoices */}
                        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Invoices</h2>
                            {invoices.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <p>No invoices found</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 border-b border-gray-200">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Invoice ID</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Description</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Amount</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {invoices.map((invoice) => (
                                                <tr key={invoice.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                                                        {invoice.id}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                        {new Date(invoice.date).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-600">
                                                        {invoice.description}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                                                        ${invoice.amount}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 py-1 text-xs font-medium rounded ${invoice.status === 'paid' ? 'bg-green-100 text-green-700' :
                                                            invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                                'bg-red-100 text-red-700'
                                                            }`}>
                                                            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <button
                                                            onClick={() => downloadInvoice(invoice.id)}
                                                            className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                                                        >
                                                            <Download className="w-4 h-4" />
                                                            Download
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Plan Features */}
                        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Plan Features</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-start gap-3">
                                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                                    <div>
                                        <div className="font-medium text-gray-900">Unlimited Exam Sessions</div>
                                        <div className="text-sm text-gray-500">Conduct as many exams as needed</div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                                    <div>
                                        <div className="font-medium text-gray-900">AI Proctoring</div>
                                        <div className="text-sm text-gray-500">Advanced AI monitoring capabilities</div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                                    <div>
                                        <div className="font-medium text-gray-900">Priority Support</div>
                                        <div className="text-sm text-gray-500">24/7 dedicated support</div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                                    <div>
                                        <div className="font-medium text-gray-900">Custom Branding</div>
                                        <div className="text-sm text-gray-500">White-label your platform</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
