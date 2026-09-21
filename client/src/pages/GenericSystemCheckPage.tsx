import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { CheckCircle2, XCircle, Video, Mic, Monitor, Loader2, RefreshCw, AlertCircle } from 'lucide-react';

export const GenericSystemCheckPage: React.FC = () => {
    const navigate = useNavigate();
    const [checks, setChecks] = useState({
        camera: 'pending',
        microphone: 'pending',
        screen: 'pending',
        connection: 'pending'
    });
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const runChecks = async () => {
        setLoading(true);
        setErrorMsg(null);
        const newChecks = { ...checks };

        try {
            // Camera & Mic
            // We request both explicitly to trigger permissions prompt
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

            // Check for active tracks
            const videoTrack = stream.getVideoTracks()[0];
            const audioTrack = stream.getAudioTracks()[0];

            if (videoTrack && videoTrack.readyState === 'live') {
                newChecks.camera = 'success';
            } else {
                newChecks.camera = 'failed';
            }

            if (audioTrack && audioTrack.readyState === 'live') {
                newChecks.microphone = 'success';
            } else {
                newChecks.microphone = 'failed';
            }

            // Clean up: stop all tracks to release hardware
            stream.getTracks().forEach(track => track.stop());

        } catch (err: any) {
            console.error("Media Device Error:", err);
            newChecks.camera = 'failed';
            newChecks.microphone = 'failed';

            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setErrorMsg("Permission denied. Please allow access to your camera and microphone in your browser settings.");
            } else if (err.name === 'NotFoundError') {
                setErrorMsg("No camera or microphone found. Please connect a device and try again.");
            } else {
                setErrorMsg("Could not access devices. Please check your system settings or close other apps using the camera.");
            }
        }

        // Connection (Simple navigator.onLine check)
        newChecks.connection = navigator.onLine ? 'success' : 'failed';

        // Screen Share API availability (just checking if API exists, not triggering prompt here to avoid dual prompts)
        if (navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices) {
            newChecks.screen = 'success';
        } else {
            newChecks.screen = 'failed';
        }

        setChecks(newChecks);
        setLoading(false);
    };

    useEffect(() => {
        runChecks();
    }, []);

    const CheckItem = ({
        icon: Icon,
        title,
        desc,
        status
    }: {
        icon: any,
        title: string,
        desc: string,
        status: string
    }) => (
        <div className="flex items-center justify-between p-4 bg-background-light rounded-lg border border-[#e6e6dd]">
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full border ${status === 'success' ? 'bg-green-50 border-green-200' : status === 'failed' ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
                    <Icon className={`w-6 h-6 ${status === 'success' ? 'text-green-600' : status === 'failed' ? 'text-red-600' : 'text-gray-500'}`} />
                </div>
                <div>
                    <h3 className="font-bold text-text-main">{title}</h3>
                    <p className="text-sm text-text-muted font-medium">{desc}</p>
                </div>
            </div>
            {loading ? (
                <Loader2 className="animate-spin text-primary w-6 h-6" />
            ) : (
                status === 'success' ? <CheckCircle2 className="text-green-500 w-6 h-6" /> :
                    status === 'failed' ? <XCircle className="text-red-500 w-6 h-6" /> :
                        <div className="w-6 h-6 rounded-full border-2 border-gray-200" />
            )}
        </div>
    );

    return (
        <div className="bg-background-light min-h-screen flex font-display text-text-main">
            <Sidebar />
            <main className="flex-1 p-8 overflow-y-auto">
                <div className="max-w-3xl mx-auto">
                    <header className="mb-8">
                        <h1 className="text-3xl font-black text-text-main">System Check</h1>
                        <p className="text-text-muted font-medium mt-1">Verify your device readiness for proctored exams.</p>
                    </header>

                    <div className="bg-surface-light rounded-xl p-8 border border-[#e6e6dd] shadow-sm">
                        {errorMsg && (
                            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                <p className="text-sm font-medium">{errorMsg}</p>
                            </div>
                        )}

                        <div className="space-y-4">
                            <CheckItem
                                icon={Video}
                                title="Camera"
                                desc="Required for video monitoring"
                                status={checks.camera}
                            />
                            <CheckItem
                                icon={Mic}
                                title="Microphone"
                                desc="Required for audio monitoring"
                                status={checks.microphone}
                            />
                            <CheckItem
                                icon={Monitor}
                                title="Screen Sharing"
                                desc="Browser API support check"
                                status={checks.screen}
                            />
                            <CheckItem
                                icon={RefreshCw}
                                title="Network Connection"
                                desc="Stable internet connectivity"
                                status={checks.connection}
                            />
                        </div>

                        <div className="mt-8 flex justify-end gap-4">
                            <button
                                onClick={runChecks}
                                disabled={loading}
                                className="px-6 py-2 border border-[#e6e6dd] rounded-full font-bold hover:bg-[#f4f4e6] transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                Run Again
                            </button>
                            <button
                                onClick={() => navigate('/')}
                                className="px-6 py-2 bg-primary text-primary-content rounded-full font-bold hover:bg-[#e0dd05] transition-colors shadow-sm"
                            >
                                Back to Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};
