import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, AlertCircle, UserPlus, Camera, Building2, GitBranch } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

export const SignupPage: React.FC = () => {
    const navigate = useNavigate();
    const { signUp } = useAuth();
    const videoRef = useRef<HTMLVideoElement>(null);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [facePhoto, setFacePhoto] = useState<string | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Institute and Branch state (managed by Convex)
    const [selectedInstitute, setSelectedInstitute] = useState('');
    const [selectedBranch, setSelectedBranch] = useState('');

    const institutes = useQuery(api.institutes.getAll) || [];
    const branches = useQuery(
        api.institutes.getAllBranches,
        (selectedInstitute ? { institute_id: selectedInstitute as Id<'institutes'> } : 'skip') as any
    ) || [];

    const handleInstituteChange = (instituteId: string) => {
        setSelectedInstitute(instituteId);
        setSelectedBranch('');
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
            setError('Unable to access camera. Please check permissions.');
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (!facePhoto) {
            setError('Please capture your face photo for verification');
            return;
        }

        if (!selectedInstitute || !selectedBranch) {
            setError('Please select your institute and branch');
            return;
        }

        setLoading(true);

        try {
            const { error: signUpError } = await signUp(email, password, name, 'student', {
                face_photo: facePhoto,
                institute_id: selectedInstitute,
                branch_id: selectedBranch
            });

            if (signUpError) {
                setError(signUpError);
                setLoading(false);
                return;
            }

            navigate('/');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                        <UserPlus className="w-8 h-8 text-blue-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
                    <p className="text-gray-500 mt-2">Join the proctoring system</p>
                </div>

                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                        <p className="text-sm">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                            Full Name
                        </label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                            placeholder="John Doe"
                        />
                    </div>

                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                            Email Address
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                            placeholder="you@example.com"
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                            placeholder="••••••••"
                        />
                    </div>

                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                            Confirm Password
                        </label>
                        <input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            minLength={6}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                            placeholder="••••••••"
                        />
                    </div>

                    {/* Institute Selection */}
                    <div>
                        <label htmlFor="institute" className="block text-sm font-medium text-gray-700 mb-2">
                            Institute
                        </label>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                            <select
                                id="institute"
                                value={selectedInstitute}
                                onChange={(e) => handleInstituteChange(e.target.value)}
                                required
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors appearance-none bg-white"
                            >
                                <option value="">Select Institute</option>
                                {institutes.map((inst: any) => (
                                    <option key={inst._id} value={inst._id}>
                                        {inst.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Branch Selection */}
                    <div>
                        <label htmlFor="branch" className="block text-sm font-medium text-gray-700 mb-2">
                            Branch
                        </label>
                        <div className="relative">
                            <GitBranch className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                            <select
                                id="branch"
                                value={selectedBranch}
                                onChange={(e) => setSelectedBranch(e.target.value)}
                                required
                                disabled={!selectedInstitute}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors appearance-none bg-white disabled:bg-gray-100 disabled:text-gray-400"
                            >
                                <option value="">Select Branch</option>
                                {branches.map((branch: any) => (
                                    <option key={branch._id} value={branch._id}>
                                        {branch.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Face Photo Capture */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Face Photo (Required)
                        </label>
                        {!facePhoto ? (
                            isCameraOpen ? (
                                <div className="space-y-4">
                                    <div className="relative w-full bg-black rounded-lg overflow-hidden aspect-video">
                                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />
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
                                            onClick={() => {
                                                const stream = videoRef.current?.srcObject as MediaStream;
                                                stream?.getTracks().forEach(track => track.stop());
                                                setIsCameraOpen(false);
                                            }}
                                            className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 font-medium"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={startCamera}
                                    className="w-full border-2 border-dashed border-gray-300 rounded-lg py-8 hover:border-blue-500 hover:bg-blue-50 transition-colors flex flex-col items-center gap-2"
                                >
                                    <Camera className="w-8 h-8 text-gray-400" />
                                    <span className="text-sm text-gray-600">Click to capture face photo</span>
                                </button>
                            )
                        ) : (
                            <div className="relative">
                                <img src={facePhoto} alt="Face" className="w-full rounded-lg border-2 border-green-500" />
                                <button
                                    type="button"
                                    onClick={() => setFacePhoto(null)}
                                    className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                                >
                                    Retake
                                </button>
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Creating account...
                            </>
                        ) : (
                            'Create Account'
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600">
                        Already have an account?{' '}
                        <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};
