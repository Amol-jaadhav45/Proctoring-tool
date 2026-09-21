import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Settings, Save, Loader2, Bell, Moon, Sun } from 'lucide-react';

interface ProctorSettings {
    notifications: {
        email_exam_assigned: boolean;
        email_violations: boolean;
        email_schedule_updates: boolean;
    };
    appearance: {
        dark_mode: boolean;
    };
}

export const ProctorSettingsPage: React.FC = () => {
    // const { user } = useAuth();
    const { theme, toggleTheme } = useTheme();
    // const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Local state for settings
    const [settings, setSettings] = useState<ProctorSettings>({
        notifications: {
            email_exam_assigned: true,
            email_violations: true,
            email_schedule_updates: true,
        },
        appearance: {
            dark_mode: theme === 'dark',
        }
    });

    const handleSave = async () => {
        try {
            setSaving(true);
            // In a real app, save to database
            localStorage.setItem('proctor_settings', JSON.stringify(settings));

            // Artificial delay
            await new Promise(resolve => setTimeout(resolve, 800));

            alert('Settings saved successfully!');
        } catch (err) {
            console.error('Error saving settings:', err);
            alert('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const updateNotifications = (key: keyof ProctorSettings['notifications'], value: boolean) => {
        setSettings({
            ...settings,
            notifications: {
                ...settings.notifications,
                [key]: value,
            },
        });
    };

    return (
        <div className="p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <Settings className="w-8 h-8 text-blue-600" />
                            Proctor Settings
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your preferences</p>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 transition-colors"
                    >
                        {saving ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Save className="w-5 h-5" />
                        )}
                        Save Settings
                    </button>
                </div>

                <div className="space-y-6">

                    {/* Appearance Settings */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 p-6 transition-colors">
                        <div className="flex items-center gap-3 mb-4">
                            {theme === 'dark' ? <Moon className="w-6 h-6 text-indigo-600" /> : <Sun className="w-6 h-6 text-yellow-600" />}
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Appearance</h2>
                        </div>

                        <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer transition-colors">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-indigo-100/10 text-indigo-400' : 'bg-yellow-100 text-yellow-600'}`}>
                                    {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                                </div>
                                <div>
                                    <span className="font-medium text-gray-700 dark:text-gray-200 block">Dark Mode</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">Toggle application theme</span>
                                </div>
                            </div>
                            <div
                                onClick={toggleTheme}
                                className={`relative w-12 h-6 transition-colors duration-200 ease-in-out rounded-full cursor-pointer ${theme === 'dark' ? 'bg-indigo-600' : 'bg-gray-200'
                                    }`}
                            >
                                <span
                                    className={`inline-block w-5 h-5 transform duration-200 ease-in-out bg-white rounded-full shadow mt-0.5 ml-0.5 ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0'
                                        }`}
                                />
                            </div>
                        </label>
                    </div>

                    {/* Notifications */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 p-6 transition-colors">
                        <div className="flex items-center gap-3 mb-4">
                            <Bell className="w-6 h-6 text-yellow-600" />
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Email Notifications</h2>
                        </div>
                        <div className="space-y-4">
                            <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer transition-colors">
                                <span className="font-medium text-gray-700 dark:text-gray-200">Exam Assignments</span>
                                <input
                                    type="checkbox"
                                    checked={settings.notifications.email_exam_assigned}
                                    onChange={(e) => updateNotifications('email_exam_assigned', e.target.checked)}
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                                />
                            </label>
                            <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer transition-colors">
                                <span className="font-medium text-gray-700 dark:text-gray-200">Violation Alerts</span>
                                <input
                                    type="checkbox"
                                    checked={settings.notifications.email_violations}
                                    onChange={(e) => updateNotifications('email_violations', e.target.checked)}
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                                />
                            </label>
                            <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer transition-colors">
                                <span className="font-medium text-gray-700 dark:text-gray-200">Schedule Updates</span>
                                <input
                                    type="checkbox"
                                    checked={settings.notifications.email_schedule_updates}
                                    onChange={(e) => updateNotifications('email_schedule_updates', e.target.checked)}
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                                />
                            </label>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
