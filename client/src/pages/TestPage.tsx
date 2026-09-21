import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useAuth } from '../contexts/AuthContext';

export const TestPage: React.FC = () => {
    const { user } = useAuth();
    const [testResult, setTestResult] = useState<string>('');

    // Test queries
    const testConnection = useQuery(api.debug.testConnection);
    const stats = useQuery(api.debug.getStats);
    const notifications = useQuery(
        api.notifications.getAll,
        user ? { user_id: user.user_id } : "skip"
    );

    // Test mutations
    const createTestNotification = useMutation(api.debug.createTestNotification);
    // const resetNotifications = useMutation(api.debug.resetNotificationsTable);
    // const createSampleData = useMutation(api.debug.createSampleData);

    const handleTest = async (testName: string, testFn: () => Promise<any>) => {
        try {
            setTestResult(`Running ${testName}...`);
            const result = await testFn();
            setTestResult(`✅ ${testName} SUCCESS: ${JSON.stringify(result, null, 2)}`);
        } catch (error: any) {
            setTestResult(`❌ ${testName} FAILED: ${error?.message || 'Unknown error'}`);
        }
    };

    if (!user) {
        return <div className="p-8">Please log in to test the system.</div>;
    }

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">Convex System Test</h1>

            {/* Connection Status */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">Connection Status</h2>
                {testConnection ? (
                    <div className="text-green-600">
                        ✅ Connected: {testConnection.message}
                    </div>
                ) : (
                    <div className="text-red-600">❌ Connection failed</div>
                )}
            </div>

            {/* System Stats */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">System Stats</h2>
                {stats ? (
                    <pre className="bg-gray-100 p-4 rounded text-sm">
                        {JSON.stringify(stats, null, 2)}
                    </pre>
                ) : (
                    <div>Loading stats...</div>
                )}
            </div>

            {/* Notifications */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">Your Notifications</h2>
                {notifications ? (
                    <div>
                        <p className="mb-2">Count: {notifications.length}</p>
                        {notifications.length > 0 ? (
                            <div className="space-y-2">
                                {notifications.slice(0, 3).map((notif: any) => (
                                    <div key={notif._id} className="bg-gray-50 p-3 rounded">
                                        <div className="font-medium">{notif.title}</div>
                                        <div className="text-sm text-gray-600">{notif.message}</div>
                                        <div className="text-xs text-gray-400">{notif.timestamp}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500">No notifications</p>
                        )}
                    </div>
                ) : (
                    <div>Loading notifications...</div>
                )}
            </div>

            {/* Test Actions */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">Test Actions</h2>
                <div className="space-y-4">
                    <button
                        onClick={() => handleTest('Create Test Notification', () =>
                            createTestNotification({
                                user_id: user.user_id,
                                title: "Test Notification",
                                message: "This is a test notification created at " + new Date().toLocaleTimeString()
                            })
                        )}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mr-2"
                    >
                        Create Test Notification
                    </button>

                    {/* <button
                        onClick={() => handleTest('Reset Notifications', () => resetNotifications())}
                        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 mr-2"
                    >
                        Reset Notifications
                    </button>

                    <button
                        onClick={() => handleTest('Create Sample Data', () => createSampleData())}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 mr-2"
                    >
                        Create Sample Data
                    </button> */}
                </div>
            </div>

            {/* Test Results */}
            {testResult && (
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold mb-4">Test Results</h2>
                    <pre className="bg-gray-100 p-4 rounded text-sm whitespace-pre-wrap">
                        {testResult}
                    </pre>
                </div>
            )}
        </div>
    );
};