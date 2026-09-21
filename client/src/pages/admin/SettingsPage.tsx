import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';
import { Settings, Save, Loader2, Shield, Bell, Database, Globe, Moon, Sun } from 'lucide-react';

interface SystemSettings {
    proctoring_rules: {
        enable_face_detection: boolean;
        enable_gaze_tracking: boolean;
        enable_audio_monitoring: boolean;
        enable_screen_monitoring: boolean;
        violation_threshold: number;
        credibility_threshold: number;
        face_verification_threshold: number;
        require_face_verification: boolean;
        periodic_face_check: boolean;
    };
    data_retention: {
        session_recordings_days: number;
        violation_logs_days: number;
        audit_logs_days: number;
    };
    notifications: {
        email_violations: boolean;
        email_system_updates: boolean;
        email_exam_scheduled: boolean;
    };
    gdpr: {
        allow_data_export: boolean;
        auto_delete_expired: boolean;
        require_consent: boolean;
    };
}

export const AdminSettingsPage: React.FC = () => {
    const { user } = useAuth();
    const [settings, setSettings] = useState<SystemSettings>({
        proctoring_rules: {
            enable_face_detection: true,
            enable_gaze_tracking: true,
            enable_audio_monitoring: true,
            enable_screen_monitoring: true,
            violation_threshold: 3,
            credibility_threshold: 70,
            face_verification_threshold: 85,
            require_face_verification: true,
            periodic_face_check: true,
        },
        data_retention: {
            session_recordings_days: 90,
            violation_logs_days: 180,
            audit_logs_days: 365,
        },
        notifications: {
            email_violations: true,
            email_system_updates: true,
            email_exam_scheduled: true,
        },
        gdpr: {
            allow_data_export: true,
            auto_delete_expired: true,
            require_consent: true,
        },
    });
    const { theme, toggleTheme } = useTheme();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [_profile, setProfile] = useState<any>(null); // Fetch user profile
    useEffect(() => {
        const fetchProfile = async () => {
            if (user) {
                const { data } = await supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();

                if (data) {
                    setProfile(data);
                }
            }
        };
        fetchProfile();
    }, [user]);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            // In a real app, load from database
            // For now, load from localStorage or use defaults
            const saved = localStorage.getItem('system_settings');
            if (saved) {
                setSettings(JSON.parse(saved));
            }
        } catch (err) {
            console.error('Error loading settings:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            // In a real app, save to database
            localStorage.setItem('system_settings', JSON.stringify(settings));
            alert('Settings saved successfully!');
        } catch (err) {
            console.error('Error saving settings:', err);
            alert('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const updateProctoringRules = (key: string, value: any) => {
        setSettings({
            ...settings,
            proctoring_rules: {
                ...settings.proctoring_rules,
                [key]: value,
            },
        });
    };

    const updateDataRetention = (key: string, value: number) => {
        setSettings({
            ...settings,
            data_retention: {
                ...settings.data_retention,
                [key]: value,
            },
        });
    };

    const updateNotifications = (key: string, value: boolean) => {
        setSettings({
            ...settings,
            notifications: {
                ...settings.notifications,
                [key]: value,
            },
        });
    };

    const updateGDPR = (key: string, value: boolean) => {
        setSettings({
            ...settings,
            gdpr: {
                ...settings.gdpr,
                [key]: value,
            },
        });
    };

    return (
        // Note: Wrapped in AdminLayout at page level or via App.tsx
        <div className="p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <Settings className="w-8 h-8 text-blue-600" />
                            System Settings
                        </h1>
                        <p className="text-gray-500 mt-1">Configure global system settings</p>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                    >
                        {saving ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Save className="w-5 h-5" />
                        )}
                        Save Settings
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Proctoring Rules */}
                        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <Shield className="w-6 h-6 text-blue-600" />
                                <h2 className="text-xl font-bold text-gray-900">Proctoring Rules</h2>
                            </div>

                            {/* Theme Settings (New) */}
                            <div className="mb-6 pb-6 border-b border-gray-100">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Appearance</h3>
                                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-indigo-100 text-indigo-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                            {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <span className="font-medium text-gray-700 block">Dark Mode</span>
                                            <span className="text-xs text-gray-500">Toggle application theme</span>
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

                            <div className="space-y-4">
                                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
                                    <span className="font-medium text-gray-700">Enable Face Detection</span>
                                    <input
                                        type="checkbox"
                                        checked={settings.proctoring_rules.enable_face_detection}
                                        onChange={(e) => updateProctoringRules('enable_face_detection', e.target.checked)}
                                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                </label>
                                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
                                    <span className="font-medium text-gray-700">Enable Gaze Tracking</span>
                                    <input
                                        type="checkbox"
                                        checked={settings.proctoring_rules.enable_gaze_tracking}
                                        onChange={(e) => updateProctoringRules('enable_gaze_tracking', e.target.checked)}
                                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                </label>
                                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
                                    <span className="font-medium text-gray-700">Enable Audio Monitoring</span>
                                    <input
                                        type="checkbox"
                                        checked={settings.proctoring_rules.enable_audio_monitoring}
                                        onChange={(e) => updateProctoringRules('enable_audio_monitoring', e.target.checked)}
                                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                </label>
                                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
                                    <span className="font-medium text-gray-700">Enable Screen Monitoring</span>
                                    <input
                                        type="checkbox"
                                        checked={settings.proctoring_rules.enable_screen_monitoring}
                                        onChange={(e) => updateProctoringRules('enable_screen_monitoring', e.target.checked)}
                                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                </label>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Violation Threshold (before flagging)
                                    </label>
                                    <input
                                        type="number"
                                        value={settings.proctoring_rules.violation_threshold}
                                        onChange={(e) => updateProctoringRules('violation_threshold', parseInt(e.target.value))}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                        min={1}
                                        max={10}
                                    />
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Minimum Credibility Score (%)
                                    </label>
                                    <input
                                        type="number"
                                        value={settings.proctoring_rules.credibility_threshold}
                                        onChange={(e) => updateProctoringRules('credibility_threshold', parseInt(e.target.value))}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                        min={0}
                                        max={100}
                                    />
                                </div>
                                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
                                    <span className="font-medium text-gray-700">Require Face Verification Before Exam</span>
                                    <input
                                        type="checkbox"
                                        checked={settings.proctoring_rules.require_face_verification}
                                        onChange={(e) => updateProctoringRules('require_face_verification', e.target.checked)}
                                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                </label>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Face Verification Threshold (%)
                                    </label>
                                    <input
                                        type="number"
                                        value={settings.proctoring_rules.face_verification_threshold}
                                        onChange={(e) => updateProctoringRules('face_verification_threshold', parseInt(e.target.value))}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                        min={70}
                                        max={100}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Minimum similarity percentage required for face match (Recommended: 85%)
                                    </p>
                                </div>
                                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
                                    <span className="font-medium text-gray-700">Periodic Face Check During Exam</span>
                                    <input
                                        type="checkbox"
                                        checked={settings.proctoring_rules.periodic_face_check}
                                        onChange={(e) => updateProctoringRules('periodic_face_check', e.target.checked)}
                                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                </label>
                            </div>
                        </div>

                        {/* Data Retention */}
                        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <Database className="w-6 h-6 text-green-600" />
                                <h2 className="text-xl font-bold text-gray-900">Data Retention</h2>
                            </div>
                            <div className="space-y-4">
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Session Recordings (days)
                                    </label>
                                    <input
                                        type="number"
                                        value={settings.data_retention.session_recordings_days}
                                        onChange={(e) => updateDataRetention('session_recordings_days', parseInt(e.target.value))}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                        min={1}
                                    />
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Violation Logs (days)
                                    </label>
                                    <input
                                        type="number"
                                        value={settings.data_retention.violation_logs_days}
                                        onChange={(e) => updateDataRetention('violation_logs_days', parseInt(e.target.value))}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                        min={1}
                                    />
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Audit Logs (days)
                                    </label>
                                    <input
                                        type="number"
                                        value={settings.data_retention.audit_logs_days}
                                        onChange={(e) => updateDataRetention('audit_logs_days', parseInt(e.target.value))}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                        min={1}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Notifications */}
                        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <Bell className="w-6 h-6 text-yellow-600" />
                                <h2 className="text-xl font-bold text-gray-900">Email Notifications</h2>
                            </div>
                            <div className="space-y-4">
                                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
                                    <span className="font-medium text-gray-700">Email on Violations</span>
                                    <input
                                        type="checkbox"
                                        checked={settings.notifications.email_violations}
                                        onChange={(e) => updateNotifications('email_violations', e.target.checked)}
                                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                </label>
                                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
                                    <span className="font-medium text-gray-700">Email on System Updates</span>
                                    <input
                                        type="checkbox"
                                        checked={settings.notifications.email_system_updates}
                                        onChange={(e) => updateNotifications('email_system_updates', e.target.checked)}
                                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                </label>
                                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
                                    <span className="font-medium text-gray-700">Email on Exam Scheduled</span>
                                    <input
                                        type="checkbox"
                                        checked={settings.notifications.email_exam_scheduled}
                                        onChange={(e) => updateNotifications('email_exam_scheduled', e.target.checked)}
                                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                </label>
                            </div>
                        </div>

                        {/* GDPR Compliance */}
                        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <Globe className="w-6 h-6 text-purple-600" />
                                <h2 className="text-xl font-bold text-gray-900">GDPR Compliance</h2>
                            </div>
                            <div className="space-y-4">
                                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
                                    <span className="font-medium text-gray-700">Allow Data Export</span>
                                    <input
                                        type="checkbox"
                                        checked={settings.gdpr.allow_data_export}
                                        onChange={(e) => updateGDPR('allow_data_export', e.target.checked)}
                                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                </label>
                                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
                                    <span className="font-medium text-gray-700">Auto-delete Expired Data</span>
                                    <input
                                        type="checkbox"
                                        checked={settings.gdpr.auto_delete_expired}
                                        onChange={(e) => updateGDPR('auto_delete_expired', e.target.checked)}
                                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                </label>
                                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
                                    <span className="font-medium text-gray-700">Require Consent</span>
                                    <input
                                        type="checkbox"
                                        checked={settings.gdpr.require_consent}
                                        onChange={(e) => updateGDPR('require_consent', e.target.checked)}
                                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                </label>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
