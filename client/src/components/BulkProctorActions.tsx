import React, { useState } from 'react';
import { AlertTriangle, PauseCircle, PlayCircle, Square, MessageSquare, Camera, Users, CheckCircle } from 'lucide-react';

export interface Student {
    id: string;
    name: string;
    status: 'active' | 'paused' | 'terminated' | 'offline';
    selected: boolean;
}

interface BulkProctorActionsProps {
    students: Student[];
    onWarnStudents: (studentIds: string[]) => void;
    onPauseStudents: (studentIds: string[]) => void;
    onResumeStudents: (studentIds: string[]) => void;
    onTerminateStudents: (studentIds: string[]) => void;
    onMessageStudents: (studentIds: string[]) => void;
    onScreenshotStudents: (studentIds: string[]) => void;
    onSelectAll: () => void;
    onDeselectAll: () => void;
    onToggleStudent: (studentId: string) => void;
}

export const BulkProctorActions: React.FC<BulkProctorActionsProps> = ({
    students,
    onWarnStudents,
    onPauseStudents,
    onResumeStudents,
    onTerminateStudents,
    onMessageStudents,
    onScreenshotStudents,
    onSelectAll,
    onDeselectAll,
    onToggleStudent
}) => {
    const [showConfirmDialog, setShowConfirmDialog] = useState<{
        action: string;
        title: string;
        message: string;
        onConfirm: () => void;
    } | null>(null);

    const selectedStudents = students.filter(s => s.selected);
    const selectedCount = selectedStudents.length;

    const handleAction = (action: string, title: string, message: string, onAction: () => void) => {
        if (selectedCount === 0) return;

        setShowConfirmDialog({
            action,
            title,
            message,
            onConfirm: () => {
                onAction();
                setShowConfirmDialog(null);
            }
        });
    };

    const handleWarn = () => {
        handleAction(
            'warn',
            'Send Warning',
            `Send warning message to ${selectedCount} student${selectedCount > 1 ? 's' : ''}?`,
            () => onWarnStudents(selectedStudents.map(s => s.id))
        );
    };

    const handlePause = () => {
        handleAction(
            'pause',
            'Pause Students',
            `Pause ${selectedCount} student${selectedCount > 1 ? 's' : ''}? They will not be able to continue the exam.`,
            () => onPauseStudents(selectedStudents.map(s => s.id))
        );
    };

    const handleResume = () => {
        handleAction(
            'resume',
            'Resume Students',
            `Resume ${selectedCount} student${selectedCount > 1 ? 's' : ''}?`,
            () => onResumeStudents(selectedStudents.map(s => s.id))
        );
    };

    const handleTerminate = () => {
        handleAction(
            'terminate',
            'Terminate Students',
            `Terminate exam for ${selectedCount} student${selectedCount > 1 ? 's' : ''}? This action cannot be undone.`,
            () => onTerminateStudents(selectedStudents.map(s => s.id))
        );
    };

    const handleMessage = () => {
        handleAction(
            'message',
            'Send Message',
            `Send message to ${selectedCount} student${selectedCount > 1 ? 's' : ''}?`,
            () => onMessageStudents(selectedStudents.map(s => s.id))
        );
    };

    const handleScreenshot = () => {
        onScreenshotStudents(selectedStudents.map(s => s.id));
    };

    const getActionIcon = (action: string) => {
        switch (action) {
            case 'warn': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
            case 'pause': return <PauseCircle className="w-5 h-5 text-orange-600" />;
            case 'resume': return <PlayCircle className="w-5 h-5 text-green-600" />;
            case 'terminate': return <Square className="w-5 h-5 text-red-600" />;
            case 'message': return <MessageSquare className="w-5 h-5 text-blue-600" />;
            case 'screenshot': return <Camera className="w-5 h-5 text-purple-600" />;
            default: return null;
        }
    };

    const getActionButtonClass = (action: string) => {
        const baseClass = "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

        switch (action) {
            case 'warn': return `${baseClass} bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border border-yellow-300`;
            case 'pause': return `${baseClass} bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-300`;
            case 'resume': return `${baseClass} bg-green-100 text-green-700 hover:bg-green-200 border border-green-300`;
            case 'terminate': return `${baseClass} bg-red-100 text-red-700 hover:bg-red-200 border border-red-300`;
            case 'message': return `${baseClass} bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300`;
            case 'screenshot': return `${baseClass} bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-300`;
            default: return baseClass;
        }
    };

    return (
        <>
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-gray-600" />
                        <h3 className="text-lg font-bold text-gray-900">Bulk Actions</h3>
                        {selectedCount > 0 && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                                {selectedCount} selected
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={onSelectAll}
                            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                        >
                            Select All
                        </button>
                        <button
                            onClick={onDeselectAll}
                            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                        >
                            Deselect All
                        </button>
                    </div>
                </div>

                {/* Student Selection */}
                <div className="mb-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {students.map((student) => (
                            <div
                                key={student.id}
                                onClick={() => onToggleStudent(student.id)}
                                className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${student.selected
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                    } ${student.status === 'offline' ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={student.selected}
                                        onChange={() => onToggleStudent(student.id)}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        disabled={student.status === 'offline'}
                                    />
                                    <span className="text-sm font-medium text-gray-900">{student.name}</span>
                                    <span className={`px-2 py-0.5 text-xs rounded-full ${student.status === 'active' ? 'bg-green-100 text-green-700' :
                                            student.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                                                student.status === 'terminated' ? 'bg-red-100 text-red-700' :
                                                    'bg-gray-100 text-gray-700'
                                        }`}>
                                        {student.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-4">
                    <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Communication Actions</h4>
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={handleWarn}
                                disabled={selectedCount === 0}
                                className={getActionButtonClass('warn')}
                            >
                                {getActionIcon('warn')}
                                Send Warning
                            </button>

                            <button
                                onClick={handleMessage}
                                disabled={selectedCount === 0}
                                className={getActionButtonClass('message')}
                            >
                                {getActionIcon('message')}
                                Send Message
                            </button>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Exam Control Actions</h4>
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={handlePause}
                                disabled={selectedCount === 0}
                                className={getActionButtonClass('pause')}
                            >
                                {getActionIcon('pause')}
                                Pause Exam
                            </button>

                            <button
                                onClick={handleResume}
                                disabled={selectedCount === 0}
                                className={getActionButtonClass('resume')}
                            >
                                {getActionIcon('resume')}
                                Resume Exam
                            </button>

                            <button
                                onClick={handleScreenshot}
                                disabled={selectedCount === 0}
                                className={getActionButtonClass('screenshot')}
                            >
                                {getActionIcon('screenshot')}
                                Take Screenshot
                            </button>

                            <button
                                onClick={handleTerminate}
                                disabled={selectedCount === 0}
                                className={getActionButtonClass('terminate')}
                            >
                                {getActionIcon('terminate')}
                                Terminate Exam
                            </button>
                        </div>
                    </div>
                </div>

                {/* Quick Stats */}
                {selectedCount > 0 && (
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="text-center">
                                <div className="font-semibold text-blue-900">{selectedCount}</div>
                                <div className="text-blue-700">Selected</div>
                            </div>
                            <div className="text-center">
                                <div className="font-semibold text-green-600">
                                    {selectedStudents.filter(s => s.status === 'active').length}
                                </div>
                                <div className="text-green-700">Active</div>
                            </div>
                            <div className="text-center">
                                <div className="font-semibold text-yellow-600">
                                    {selectedStudents.filter(s => s.status === 'paused').length}
                                </div>
                                <div className="text-yellow-700">Paused</div>
                            </div>
                            <div className="text-center">
                                <div className="font-semibold text-red-600">
                                    {selectedStudents.filter(s => s.status === 'terminated').length}
                                </div>
                                <div className="text-red-700">Terminated</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Confirmation Dialog */}
            {showConfirmDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
                        <div className="flex items-start gap-3 mb-4">
                            <div className="p-2 bg-gray-100 rounded-lg">
                                {getActionIcon(showConfirmDialog.action)}
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    {showConfirmDialog.title}
                                </h3>
                                <p className="text-gray-600">
                                    {showConfirmDialog.message}
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowConfirmDialog(null)}
                                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={showConfirmDialog.onConfirm}
                                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
                            >
                                <CheckCircle className="w-4 h-4" />
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};