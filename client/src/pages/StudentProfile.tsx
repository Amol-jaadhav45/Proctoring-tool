import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Sidebar } from '../components/Sidebar';


import { useMutation, useConvex } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { User, Building2, GitBranch, Mail, Calendar, Loader2, Save, Bell, Lock, Eye, EyeOff, LogOut, Settings as SettingsIcon, Camera } from 'lucide-react';
import { API_BASE_URL } from '../services/api';

interface UserProfile {
    user_id: string;
    name: string;
    face_photo: string | null;
    role: string;
    created_at: string;
    institutes?: {
        name: string;
        code: string;
        address: string;
    };
    branches?: {
        name: string;
    };
}

export const StudentProfile: React.FC = () => {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const convex = useConvex();
    // Cast to any to avoid type errors until convex types are regenerated in IDE
    const updateProfileMutation = useMutation((api.users as any).updateProfile);



    const [activeTab, setActiveTab] = useState<'profile' | 'settings'>('profile');

    // Profile State
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [editing, setEditing] = useState(false);
    const [editedName, setEditedName] = useState('');
    const [savingProfile, setSavingProfile] = useState(false);

    // Camera State
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [facePhoto, setFacePhoto] = useState<string | null>(null);

    // Settings State
    const [settingsLoading, setSettingsLoading] = useState(false);
    const [settings, setSettings] = useState({
        emailNotifications: true,
        examReminders: true,
        violationAlerts: true,
        showProfilePhoto: true
    });
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [showPassword, setShowPassword] = useState(false);


    useEffect(() => {
        fetchProfile();
    }, [user]);

    const fetchProfile = async () => {
        if (!user) return;
        try {
            setLoadingProfile(true);

            // Try Convex
            const convexData = await convex.query(api.users.getUser, { user_id: user.user_id });
            if (convexData) {
                setProfile(convexData as UserProfile);
                setEditedName(convexData.name || '');
                return;
            }

            // Fallback to API
            const response = await fetch(`${API_BASE_URL}/profile/${user.id}`);
            if (response.ok) {
                const data = await response.json();
                setProfile(data);
                setEditedName(data.name || '');
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setLoadingProfile(false);
        }
    };

    const startCamera = async () => {
        setIsCameraOpen(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error('Error accessing camera:', err);
            alert('Unable to access camera. Please check permissions.');
            setIsCameraOpen(false);
        }
    };

    const capturePhoto = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0);
                const photo = canvas.toDataURL('image/jpeg');
                setFacePhoto(photo);

                // Stop camera
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
                setIsCameraOpen(false);
            }
        }
    };

    const cancelCamera = () => {
        const stream = videoRef.current?.srcObject as MediaStream;
        stream?.getTracks().forEach(track => track.stop());
        setIsCameraOpen(false);
    };

    const handleSaveProfile = async () => {
        if (!user) return;

        try {
            setSavingProfile(true);

            const updates: any = {
                user_id: user.user_id,
                name: editedName
            };

            if (facePhoto) {
                updates.face_photo = facePhoto;
            }

            // Use user.user_id (custom ID) which matches the by_user_id index
            await updateProfileMutation(updates);

            await fetchProfile();
            setEditing(false);
            setFacePhoto(null);
        } catch (error: any) {
            console.error('Error updating profile:', error);
            alert(`Failed to update profile: ${error.message || 'Unknown error'}`);
        } finally {
            setSavingProfile(false);
        }
    };

    const handleSaveSettings = async () => {
        setSettingsLoading(true);
        // Simulate API call
        setTimeout(() => {
            alert('Settings saved successfully!');
            setSettingsLoading(false);
        }, 500);
    };

    const handleChangePassword = async () => {
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            alert('New passwords do not match');
            return;
        }
        if (passwordForm.newPassword.length < 6) {
            alert('Password must be at least 6 characters');
            return;
        }
        setSettingsLoading(true);
        // Simulate API call
        setTimeout(() => {
            alert('Password changed successfully!');
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setSettingsLoading(false);
        }, 500);
    };

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    if (loadingProfile && !profile) {
        return (
            <div className="flex h-screen bg-background-light dark:bg-background-dark font-display">
                <Sidebar />
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-background-light dark:bg-background-dark font-display text-text-main transition-colors duration-200">
            <Sidebar />
            <div className="flex-1 overflow-auto">
                <div className="p-8">
                    <div className="max-w-6xl mx-auto">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-[#f4f4e6] rounded-xl">
                                    <User className="w-6 h-6 text-text-main" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-black text-text-main">My Profile</h1>
                                    <p className="text-text-muted mt-1 font-medium">Manage your personal information and account settings</p>
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-2 mb-6 border-b border-[#e6e6dd]">
                            <button
                                onClick={() => setActiveTab('profile')}
                                className={`px-6 py-3 font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'profile'
                                    ? 'border-primary text-text-main'
                                    : 'border-transparent text-text-muted hover:text-text-main'
                                    }`}
                            >
                                <User className="w-4 h-4" />
                                Overview
                            </button>
                            <button
                                onClick={() => setActiveTab('settings')}
                                className={`px-6 py-3 font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'settings'
                                    ? 'border-primary text-text-main'
                                    : 'border-transparent text-text-muted hover:text-text-main'
                                    }`}
                            >
                                <SettingsIcon className="w-4 h-4" />
                                Settings
                            </button>
                        </div>

                        {activeTab === 'profile' ? (
                            <div className="grid gap-6">
                                {/* Profile Picture */}
                                <div className="bg-surface-light p-6 rounded-xl shadow-sm border border-[#e6e6dd]">
                                    <h2 className="text-xl font-bold mb-4">Profile Picture</h2>
                                    <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                                        <div className="relative">
                                            {isCameraOpen ? (
                                                <div className="w-32 h-32 md:w-48 md:h-48 bg-black rounded-xl overflow-hidden border-2 border-primary">
                                                    <video
                                                        ref={videoRef}
                                                        autoPlay
                                                        playsInline
                                                        muted
                                                        className="w-full h-full object-cover transform -scale-x-100"
                                                    />
                                                </div>
                                            ) : facePhoto ? (
                                                <img
                                                    src={facePhoto}
                                                    alt="New Profile"
                                                    className="w-32 h-32 md:w-48 md:h-48 object-cover rounded-xl border-2 border-green-500 animate-pulse"
                                                />
                                            ) : profile?.face_photo ? (
                                                <img
                                                    src={profile.face_photo}
                                                    alt="Profile"
                                                    className="w-32 h-32 md:w-48 md:h-48 object-cover rounded-xl border-2 border-[#e6e6dd]"
                                                />
                                            ) : (
                                                <div className="w-32 h-32 md:w-48 md:h-48 bg-[#f4f4e6] rounded-xl flex items-center justify-center border border-[#e6e6dd]">
                                                    <User className="w-16 h-16 md:w-24 md:h-24 text-text-muted" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 space-y-4">
                                            <p className="text-sm text-text-muted font-medium max-w-md">
                                                This photo is used for identity verification during exams. Make sure your face is clearly visible.
                                            </p>

                                            <div className="flex flex-wrap gap-3">
                                                {isCameraOpen ? (
                                                    <>
                                                        <button
                                                            onClick={capturePhoto}
                                                            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-content rounded-full font-bold hover:bg-[#e0dd05] transition-colors shadow-sm"
                                                        >
                                                            <Camera className="w-4 h-4" />
                                                            Capture Photo
                                                        </button>
                                                        <button
                                                            onClick={cancelCamera}
                                                            className="px-4 py-2 text-text-main border border-[#e6e6dd] rounded-full font-bold hover:bg-[#f4f4e6] transition-colors"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </>
                                                ) : editing ? (
                                                    <>
                                                        <button
                                                            onClick={startCamera}
                                                            className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary-content border border-primary/50 rounded-full font-bold hover:bg-primary/20 transition-colors"
                                                        >
                                                            <Camera className="w-4 h-4" />
                                                            {facePhoto ? 'Retake Photo' : 'Update Photo'}
                                                        </button>
                                                        {facePhoto && (
                                                            <button
                                                                onClick={() => setFacePhoto(null)}
                                                                className="px-4 py-2 text-red-600 border border-red-200 rounded-full font-bold hover:bg-red-50 transition-colors"
                                                            >
                                                                Reset
                                                            </button>
                                                        )}
                                                    </>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Personal Information */}
                                <div className="bg-surface-light p-6 rounded-xl shadow-sm border border-[#e6e6dd]">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-xl font-bold">Personal Information</h2>
                                        {!editing && (
                                            <button
                                                onClick={() => setEditing(true)}
                                                className="text-text-main hover:text-primary transition-colors text-sm font-bold underline decoration-primary decoration-2 underline-offset-4"
                                            >
                                                Edit
                                            </button>
                                        )}
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <User className="w-5 h-5 text-text-muted" />
                                            <div className="flex-1">
                                                <p className="text-sm text-text-muted font-bold">Name</p>
                                                {editing ? (
                                                    <input
                                                        type="text"
                                                        value={editedName}
                                                        onChange={(e) => setEditedName(e.target.value)}
                                                        className="mt-1 w-full px-3 py-2 border border-[#e6e6dd] rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white shadow-sm"
                                                    />
                                                ) : (
                                                    <p className="font-bold text-lg text-text-main">{profile?.name}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <Mail className="w-5 h-5 text-text-muted" />
                                            <div>
                                                <p className="text-sm text-text-muted font-bold">Email</p>
                                                <p className="font-bold text-lg text-text-main">{user?.email}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <Calendar className="w-5 h-5 text-text-muted" />
                                            <div>
                                                <p className="text-sm text-text-muted font-bold">Member Since</p>
                                                <p className="font-bold text-lg text-text-main">
                                                    {profile?.created_at && new Date(profile.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {editing && (
                                        <div className="flex gap-3 mt-6">
                                            <button
                                                onClick={handleSaveProfile}
                                                disabled={savingProfile}
                                                className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-content rounded-full hover:bg-[#e0dd05] font-bold transition-colors disabled:opacity-50"
                                            >
                                                {savingProfile ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Save className="w-4 h-4" />
                                                )}
                                                Save Changes
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEditing(false);
                                                    setEditedName(profile?.name || '');
                                                }}
                                                className="px-6 py-2 text-text-main bg-transparent border border-[#e6e6dd] rounded-full hover:bg-[#f4f4e6] font-bold transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Institute Information */}
                                <div className="bg-surface-light p-6 rounded-xl shadow-sm border border-[#e6e6dd]">
                                    <h2 className="text-xl font-bold mb-4">Institute Information</h2>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <Building2 className="w-5 h-5 text-text-muted" />
                                            <div>
                                                <p className="text-sm text-text-muted font-bold">Institute</p>
                                                <p className="font-bold text-lg text-text-main">
                                                    {profile?.institutes?.name || 'Not specified'}
                                                </p>
                                                {profile?.institutes?.code && (
                                                    <p className="text-sm text-text-muted font-medium">Code: {profile.institutes.code}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <GitBranch className="w-5 h-5 text-text-muted" />
                                            <div>
                                                <p className="text-sm text-text-muted font-bold">Branch</p>
                                                <p className="font-bold text-lg text-text-main">
                                                    {profile?.branches?.name || 'Not specified'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Appearance */}
                                {/* Notification Settings */}

                                {/* Notification Settings */}
                                <div className="bg-surface-light rounded-xl shadow-sm border border-[#e6e6dd] p-6 transition-colors">
                                    <div className="flex items-center gap-2 mb-6">
                                        <Bell className="w-5 h-5 text-text-main" />
                                        <h2 className="text-xl font-bold text-text-main">Notification Preferences</h2>
                                    </div>
                                    <div className="space-y-4">
                                        <label className="flex items-center justify-between cursor-pointer">
                                            <div>
                                                <div className="font-bold text-text-main">Email Notifications</div>
                                                <div className="text-sm text-text-muted font-medium">Receive email updates about your exams</div>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={settings.emailNotifications}
                                                onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                                                className="w-5 h-5 text-primary rounded focus:ring-primary border-[#e6e6dd]"
                                            />
                                        </label>
                                        <label className="flex items-center justify-between cursor-pointer">
                                            <div>
                                                <div className="font-bold text-text-main">Exam Reminders</div>
                                                <div className="text-sm text-text-muted font-medium">Get notified before upcoming exams</div>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={settings.examReminders}
                                                onChange={(e) => setSettings({ ...settings, examReminders: e.target.checked })}
                                                className="w-5 h-5 text-primary rounded focus:ring-primary border-[#e6e6dd]"
                                            />
                                        </label>
                                        <label className="flex items-center justify-between cursor-pointer">
                                            <div>
                                                <div className="font-bold text-text-main">Violation Alerts</div>
                                                <div className="text-sm text-text-muted font-medium">Get notified about exam violations</div>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={settings.violationAlerts}
                                                onChange={(e) => setSettings({ ...settings, violationAlerts: e.target.checked })}
                                                className="w-5 h-5 text-primary rounded focus:ring-primary border-[#e6e6dd]"
                                            />
                                        </label>
                                    </div>
                                </div>

                                {/* Privacy Settings */}
                                <div className="bg-surface-light rounded-xl shadow-sm border border-[#e6e6dd] p-6 transition-colors">
                                    <div className="flex items-center gap-2 mb-6">
                                        <Eye className="w-5 h-5 text-text-main" />
                                        <h2 className="text-xl font-bold text-text-main">Privacy Settings</h2>
                                    </div>
                                    <div className="space-y-4">
                                        <label className="flex items-center justify-between cursor-pointer">
                                            <div>
                                                <div className="font-bold text-text-main">Show Profile Photo</div>
                                                <div className="text-sm text-text-muted font-medium">Display your profile photo to instructors</div>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={settings.showProfilePhoto}
                                                onChange={(e) => setSettings({ ...settings, showProfilePhoto: e.target.checked })}
                                                className="w-5 h-5 text-primary rounded focus:ring-primary border-[#e6e6dd]"
                                            />
                                        </label>
                                    </div>
                                </div>

                                {/* Change Password */}
                                <div className="bg-surface-light rounded-xl shadow-sm border border-[#e6e6dd] p-6 transition-colors">
                                    <div className="flex items-center gap-2 mb-6">
                                        <Lock className="w-5 h-5 text-red-600" />
                                        <h2 className="text-xl font-bold text-text-main">Change Password</h2>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-bold text-text-muted mb-2">Current Password</label>
                                            <div className="relative">
                                                <input
                                                    type={showPassword ? 'text' : 'password'}
                                                    value={passwordForm.currentPassword}
                                                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                                    className="w-full px-4 py-2 border border-[#e6e6dd] rounded-lg bg-surface-light text-text-main focus:ring-2 focus:ring-primary focus:border-transparent"
                                                />
                                                <button
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main"
                                                >
                                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-text-muted mb-2">New Password</label>
                                            <input
                                                type="password"
                                                value={passwordForm.newPassword}
                                                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                                className="w-full px-4 py-2 border border-[#e6e6dd] rounded-lg bg-surface-light text-text-main focus:ring-2 focus:ring-primary focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-text-muted mb-2">Confirm New Password</label>
                                            <input
                                                type="password"
                                                value={passwordForm.confirmPassword}
                                                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                                className="w-full px-4 py-2 border border-[#e6e6dd] rounded-lg bg-surface-light text-text-main focus:ring-2 focus:ring-primary focus:border-transparent"
                                            />
                                        </div>
                                        <div className="flex justify-end pt-4">
                                            <button
                                                onClick={handleChangePassword}
                                                disabled={settingsLoading}
                                                className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 font-bold transition-colors disabled:opacity-50"
                                            >
                                                {settingsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                                                Change Password
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Account Actions */}
                                <div className="bg-surface-light rounded-xl shadow-sm border border-[#e6e6dd] p-6 transition-colors">
                                    <div className="flex items-center gap-2 mb-6 text-red-600">
                                        <LogOut className="w-5 h-5" />
                                        <h2 className="text-xl font-bold">Account Actions</h2>
                                    </div>
                                    <div className="space-y-4">
                                        <button
                                            onClick={handleLogout}
                                            className="flex items-center gap-2 px-6 py-2 bg-red-50 text-red-600 border border-red-200 rounded-full hover:bg-red-100 font-bold transition-colors shadow-sm"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            Logout from Session
                                        </button>
                                        <p className="text-xs text-text-muted font-medium ml-2">
                                            Logging out will end your current session. You will need to login again to access your exams.
                                        </p>
                                    </div>
                                </div>

                                {/* Save Settings Button */}
                                <div className="flex justify-end">
                                    <button
                                        onClick={handleSaveSettings}
                                        disabled={settingsLoading}
                                        className="flex items-center gap-2 px-8 py-3 bg-primary text-primary-content rounded-full hover:bg-[#e0dd05] font-bold transition-colors disabled:opacity-50 shadow-sm"
                                    >
                                        {settingsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        Save All Settings
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

