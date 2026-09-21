import React, { useState, useEffect } from 'react';
import { X, Send, Users, User, Building, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { notificationsApi } from '../services/api';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

interface SendNotificationModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type NotificationType = 'info' | 'success' | 'warning' | 'error';
type RecipientType = 'user' | 'role' | 'institute' | 'multiple';

export const SendNotificationModal: React.FC<SendNotificationModalProps> = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [recipientType, setRecipientType] = useState<RecipientType>('user');
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [selectedRole, setSelectedRole] = useState<'student' | 'instructor' | 'admin'>('student');
    const [selectedInstitute, setSelectedInstitute] = useState<string>('');
    const [notificationType, setNotificationType] = useState<NotificationType>('info');
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');

    // Fetch data for dropdowns
    const allUsers = useQuery(api.users.getAll);
    const institutes = useQuery(api.institutes.getAll);

    useEffect(() => {
        if (!isOpen) {
            // Reset form when modal closes
            setRecipientType('user');
            setSelectedUsers([]);
            setSelectedRole('student');
            setSelectedInstitute('');
            setNotificationType('info');
            setTitle('');
            setMessage('');
        }
    }, [isOpen]);

    const handleSend = async () => {
        if (!user || !title.trim() || !message.trim()) return;

        setLoading(true);
        try {
            const notificationData = {
                type: notificationType,
                title: title.trim(),
                message: message.trim(),
                sender_id: user.user_id,
            };

            let result;
            switch (recipientType) {
                case 'user':
                    if (selectedUsers.length === 1) {
                        result = await notificationsApi.sendToUser({
                            ...notificationData,
                            user_id: selectedUsers[0],
                        });
                    } else if (selectedUsers.length > 1) {
                        result = await notificationsApi.sendToMultiple({
                            ...notificationData,
                            user_ids: selectedUsers,
                        });
                    }
                    break;
                case 'multiple':
                    result = await notificationsApi.sendToMultiple({
                        ...notificationData,
                        user_ids: selectedUsers,
                    });
                    break;
                case 'role':
                    result = await notificationsApi.sendToRole({
                        ...notificationData,
                        role: selectedRole,
                    });
                    break;
                case 'institute':
                    result = await notificationsApi.sendToInstitute({
                        ...notificationData,
                        institute_id: selectedInstitute,
                    });
                    break;
            }

            console.log('Notification sent:', result);
            onClose();
        } catch (error: any) {
            console.error('Failed to send notification:', error);
            const errorMessage = error.data?.error || error.message || 'Unknown error';
            alert(`Failed to send notification: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    const canSend = title.trim() && message.trim() && (
        (recipientType === 'user' && selectedUsers.length > 0) ||
        (recipientType === 'multiple' && selectedUsers.length > 0) ||
        (recipientType === 'role') ||
        (recipientType === 'institute' && selectedInstitute)
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-gray-900">Send Notification</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Notification Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Notification Type
                        </label>
                        <select
                            value={notificationType}
                            onChange={(e) => setNotificationType(e.target.value as NotificationType)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="info">Info</option>
                            <option value="success">Success</option>
                            <option value="warning">Warning</option>
                            <option value="error">Error</option>
                        </select>
                    </div>

                    {/* Recipient Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Send To
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setRecipientType('user')}
                                className={`p-3 rounded-lg border-2 transition-colors flex items-center gap-2 ${recipientType === 'user'
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <User className="w-4 h-4" />
                                Single User
                            </button>
                            <button
                                onClick={() => setRecipientType('multiple')}
                                className={`p-3 rounded-lg border-2 transition-colors flex items-center gap-2 ${recipientType === 'multiple'
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <Users className="w-4 h-4" />
                                Multiple Users
                            </button>
                            <button
                                onClick={() => setRecipientType('role')}
                                className={`p-3 rounded-lg border-2 transition-colors flex items-center gap-2 ${recipientType === 'role'
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <Users className="w-4 h-4" />
                                By Role
                            </button>
                            <button
                                onClick={() => setRecipientType('institute')}
                                className={`p-3 rounded-lg border-2 transition-colors flex items-center gap-2 ${recipientType === 'institute'
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <Building className="w-4 h-4" />
                                By Institute
                            </button>
                        </div>
                    </div>

                    {/* Recipient Selection */}
                    {(recipientType === 'user' || recipientType === 'multiple') && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Users
                            </label>
                            <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2">
                                {allUsers?.map((u: any) => (
                                    <label key={u._id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                                        <input
                                            type={recipientType === 'user' ? 'radio' : 'checkbox'}
                                            name="selectedUsers"
                                            checked={selectedUsers.includes(u.user_id)}
                                            onChange={(e) => {
                                                if (recipientType === 'user') {
                                                    setSelectedUsers(e.target.checked ? [u.user_id] : []);
                                                } else {
                                                    setSelectedUsers(prev =>
                                                        e.target.checked
                                                            ? [...prev, u.user_id]
                                                            : prev.filter(id => id !== u.user_id)
                                                    );
                                                }
                                            }}
                                            className="rounded"
                                        />
                                        <span className="text-sm">
                                            {u.name} ({u.email}) - {u.role}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {recipientType === 'role' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Role
                            </label>
                            <select
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(e.target.value as any)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="student">All Students</option>
                                <option value="instructor">All Instructors</option>
                                <option value="admin">All Admins</option>
                            </select>
                        </div>
                    )}

                    {recipientType === 'institute' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Institute
                            </label>
                            <select
                                value={selectedInstitute}
                                onChange={(e) => setSelectedInstitute(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">Select an institute...</option>
                                {institutes?.map((institute: any) => (
                                    <option key={institute._id} value={institute._id}>
                                        {institute.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Title
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter notification title..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Message */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Message
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Enter notification message..."
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        />
                    </div>
                </div>

                <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={!canSend || loading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Sending...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                Send Notification
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};