import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, Loader2, AlertCircle, Upload } from 'lucide-react';
import { useMediaPipe } from '../hooks/useMediaPipe';
import { userApi } from '../services/api';
import { useConvex } from 'convex/react';
import { api } from '../../../convex/_generated/api';

interface CreateStudentModalProps {
    onClose: () => void;
    onSuccess: () => void;
    instituteId?: string;
    branchId?: string;
    defaultRole?: 'student' | 'instructor' | 'admin';
    hideRoleSelector?: boolean;
}

export const CreateStudentModal: React.FC<CreateStudentModalProps> = ({
    onClose,
    onSuccess,
    instituteId: propInstituteId,
    branchId: propBranchId,
    defaultRole = 'student',
    hideRoleSelector = false
}) => {
    const convex = useConvex();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [studentId, setStudentId] = useState('');
    const [selectedRole, setSelectedRole] = useState<string>(defaultRole);
    const [selectedInstituteId, setSelectedInstituteId] = useState<string>(propInstituteId || '');
    const [selectedBranchId, setSelectedBranchId] = useState<string>(propBranchId || '');
    const [facePhoto, setFacePhoto] = useState<string | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingInstitutes, setLoadingInstitutes] = useState(true);

    const videoRef = useRef<HTMLVideoElement>(null);
    const { isLoading: mediaPipeLoading } = useMediaPipe();

    // Fetch institutes and branches
    const [branches, setBranches] = useState<any[]>([]);

    // Fetch all branches on mount

    // Fetch all branches when institute is selected
    useEffect(() => {
        const fetchBranches = async () => {
            try {
                const allBranches = await convex.query(api.institutes.getAllBranchesAdmin);
                setBranches(allBranches || []);
            } catch (err) {
                console.error('Error fetching branches:', err);
                setBranches([]);
            } finally {
                setLoadingInstitutes(false);
            }
        };
        fetchBranches();
    }, [convex]);

    const startCamera = () => {
        setIsCameraOpen(true);
        setError(null);
    };

    useEffect(() => {
        let stream: MediaStream | null = null;

        const initCamera = async () => {
            if (isCameraOpen) {
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                } catch (err) {
                    console.error('Error accessing camera:', err);
                    setError('Unable to access camera. Please check permissions.');
                    setIsCameraOpen(false);
                }
            }
        };

        if (isCameraOpen) {
            initCamera();
        }

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [isCameraOpen]);

    const capturePhoto = async () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0);
                const photo = canvas.toDataURL('image/jpeg');
                setFacePhoto(photo);
                setIsCameraOpen(false);
            }
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFacePhoto(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!facePhoto && selectedRole === 'student') {
            setError('Please capture or upload a face photo');
            return;
        }

        if (!name || !email) {
            setError('Please fill in name and email');
            return;
        }

        if (selectedRole === 'student') {
            if (!studentId) {
                setError('Student ID is required for students');
                return;
            }
        }

        setLoading(true);

        try {
            if (selectedRole === 'student') {
                await userApi.create({
                    email,
                    name,
                    role: 'student',
                    student_id: studentId,
                    face_photo: facePhoto!,
                    institute_id: selectedInstituteId || undefined,
                    branch_id: selectedBranchId || undefined
                });
            } else {
                // For non-students, create an invite and email a link
                const inviteResult: any = await convex.mutation((api as any).auth.createInvite, {
                    email,
                    role: selectedRole,
                });

                if (inviteResult?.error) {
                    throw new Error(inviteResult.error);
                }

                if (inviteResult?.link) {
                    try {
                        await convex.action((api as any).invites.sendInviteEmail, {
                            email,
                            link: inviteResult.link,
                            name,
                        });
                    } catch (emailErr) {
                        console.error('Failed to send invite email via server:', emailErr);
                    }
                    alert(
                        `Invite created successfully!\n\n` +
                        `Email: ${email}\n\n` +
                        `We attempted to email them an invite link.\n` +
                        `If they don't receive it, you can share this link manually:\n\n${inviteResult.link}`
                    );
                } else {
                    alert(
                        `Invite created successfully for ${email}, but no link was returned from the server.`
                    );
                }
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Error creating student:', err);
            setError(err.message || 'Failed to create account');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
                    <h2 className="text-2xl font-bold text-gray-900">
                        {selectedRole === 'student' ? 'Create Student' : 'Add Proctor'} Account
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                            <p className="text-sm">{error}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className={hideRoleSelector ? "md:col-span-2" : ""}>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Full Name *
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="John Doe"
                            />
                        </div>

                        {!hideRoleSelector && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Role *
                                </label>
                                <select
                                    value={selectedRole}
                                    onChange={(e) => setSelectedRole(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                                >
                                    <option value="student">Student</option>
                                    <option value="instructor">Proctor (Instructor)</option>
                                </select>
                            </div>
                        )}

                    </div>

                    {selectedRole === 'student' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Student ID *
                            </label>
                            <input
                                type="text"
                                value={studentId}
                                onChange={(e) => setStudentId(e.target.value)}
                                required
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="STU001"
                            />
                        </div>
                    )}

                    {selectedRole !== 'student' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Password (Optional)
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Password will be set via invite link"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                An invite link will be emailed so they can set their own password.
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email Address *
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="user@example.com"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            {selectedRole === 'student'
                                ? 'Students will log in with this email.'
                                : 'An invite will be sent to this email for account activation.'}
                        </p>
                    </div>

                    {/* Branch Selection Only */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Branch *
                        </label>
                        <select
                            value={selectedBranchId}
                            onChange={(e) => {
                                const branchId = e.target.value;
                                setSelectedBranchId(branchId);
                                // Automatically set institute ID for the selected branch
                                const selectedBranch = branches.find(b => (b._id || b.id) === branchId);
                                if (selectedBranch) {
                                    setSelectedInstituteId(selectedBranch.institute_id);
                                }
                            }}
                            required
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            disabled={loadingInstitutes || branches.length === 0}
                        >
                            <option value="">
                                {loadingInstitutes
                                    ? 'Loading Branches...'
                                    : branches.length === 0
                                        ? 'No Branches Available'
                                        : 'Select Branch'}
                            </option>
                            {branches.map((branch: any) => (
                                <option key={branch._id || branch.id} value={branch._id || branch.id}>
                                    {branch.name} ({branch.code || ''})
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            Selecting a branch will automatically associate the user with the correct institute.
                        </p>
                    </div>

                    {/* Face Photo Section - Only for Students */}
                    {selectedRole === 'student' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Face Photo (Required for Identity Verification) *
                            </label>
                            <p className="text-xs text-gray-500 mb-3">
                                Upload a clear photo of the student's face. This will be used for exam verification.
                            </p>

                            {!facePhoto && !isCameraOpen ? (
                                <div className="space-y-3">
                                    <label className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-gray-300 rounded-lg py-8 hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer">
                                        <Upload className="w-6 h-6 text-gray-400" />
                                        <span className="text-sm text-gray-600">Upload Photo</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileUpload}
                                            className="hidden"
                                        />
                                    </label>
                                    <div className="text-center">
                                        <span className="text-sm text-gray-500">OR</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={startCamera}
                                        disabled={mediaPipeLoading}
                                        className="w-full border-2 border-dashed border-gray-300 rounded-lg py-8 hover:border-blue-500 hover:bg-blue-50 transition-colors flex flex-col items-center gap-2"
                                    >
                                        <Camera className="w-6 h-6 text-gray-400" />
                                        <span className="text-sm text-gray-600">Capture Photo</span>
                                    </button>
                                </div>
                            ) : isCameraOpen ? (
                                <div className="space-y-3">
                                    <div className="relative w-full bg-black rounded-lg overflow-hidden aspect-video">
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            playsInline
                                            muted
                                            className="w-full h-full object-cover transform -scale-x-100"
                                        />
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={capturePhoto}
                                            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
                                        >
                                            Capture
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsCameraOpen(false)}
                                            className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 font-medium"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="relative">
                                        <img
                                            src={facePhoto || undefined}
                                            alt="Face"
                                            className="w-full max-w-md mx-auto rounded-lg border-2 border-gray-300"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setFacePhoto(null);
                                                setIsCameraOpen(false);
                                            }}
                                            className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 font-medium"
                                        >
                                            Change Photo
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || (selectedRole === 'student' && !facePhoto)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                selectedRole === 'student' ? 'Create Student' : 'Add Proctor'
                            )}
                        </button>
                    </div>
                </form>
            </div >
        </div >
    );
};
