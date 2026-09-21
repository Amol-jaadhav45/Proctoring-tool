import React, { useState } from 'react';
import { examManagementApi, type Exam } from '../services/api';
import { X, Plus, Trash2, Edit, Upload, FileDown, AlertCircle, Clock, Calendar, Loader2 } from 'lucide-react';
import { parseCSV, validateQuestionsCSV } from '../utils/csvUtils';

interface EditExamModalProps {
    exam: Exam;
    onClose: () => void;
    onSuccess: () => void;
}

interface Question {
    question: string;
    options: string[];
    correctAnswer: number;
}

export const EditExamModal: React.FC<EditExamModalProps> = ({ exam, onClose, onSuccess }) => {
    const [title, setTitle] = useState(exam.title);
    const [duration, setDuration] = useState(exam.duration_minutes);
    const [scheduledFor, setScheduledFor] = useState(exam.scheduled_for || '');
    const [questions, setQuestions] = useState<Question[]>(exam.questions);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const questionsEndRef = React.useRef<HTMLDivElement>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        questionsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            if (!text) return;

            const parsed = parseCSV(text);
            const result = validateQuestionsCSV(parsed);

            if (result.error) {
                setError(result.error);
            } else if (result.questions) {
                setQuestions([...questions, ...result.questions]);
                setError(null);
            }
            // Reset file input
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.onerror = () => {
            setError('Failed to read CSV file.');
        };
        reader.readAsText(file);
    };

    const downloadTemplate = () => {
        const template = "question,option1,option2,option3,option4,correctAnswer\nWhat is the capital of France?,Paris,London,Berlin,Madrid,0\n";
        const blob = new Blob([template], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'exam_questions_template.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const addQuestion = () => {
        setQuestions([...questions, { question: '', options: ['', '', '', ''], correctAnswer: 0 }]);
        setTimeout(scrollToBottom, 100);
    };

    const removeQuestion = (index: number) => {
        setQuestions(questions.filter((_, i) => i !== index));
    };

    const updateQuestion = (index: number, field: keyof Question, value: any) => {
        const updated = [...questions];
        updated[index] = { ...updated[index], [field]: value };
        setQuestions(updated);
    };

    const updateOption = (qIndex: number, oIndex: number, value: string) => {
        const updated = [...questions];
        updated[qIndex].options[oIndex] = value;
        setQuestions(updated);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!title.trim()) {
            setError('Please enter an exam title');
            return;
        }

        if (questions.length === 0) {
            setError('Please add at least one question');
            return;
        }

        for (let i = 0; i < questions.length; i++) {
            if (!questions[i].question.trim()) {
                setError(`Question ${i + 1} is empty`);
                return;
            }
            if (questions[i].options.some(opt => !opt.trim())) {
                setError(`Question ${i + 1} has empty options`);
                return;
            }
        }

        setLoading(true);

        try {
            await examManagementApi.update(exam.id, {
                title,
                duration_minutes: duration,
                questions,
                scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : undefined,
            });
            onSuccess();
        } catch (err) {
            console.error('Error updating exam:', err);
            setError('Failed to update exam. Please try again.');
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] transition-all duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-white/20 dark:border-slate-800 animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 px-8 py-6 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                            <Edit className="w-7 h-7 text-blue-600" />
                            Edit Exam
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Modify exam details and questions.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="p-8">
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-xl mb-8 flex items-start gap-3 border border-red-100 dark:border-red-900/30">
                                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                                <p className="text-sm font-bold">{error}</p>
                            </div>
                        )}

                        {/* Exam Details Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 pb-8 border-b border-slate-100 dark:border-slate-800">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
                                    Exam Title <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-900 dark:text-white font-medium"
                                    placeholder="e.g., Midterm Examination"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
                                    Duration <span className="text-slate-400 font-medium">(minutes)</span> *
                                </label>
                                <div className="relative">
                                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="number"
                                        required
                                        value={duration}
                                        onChange={(e) => setDuration(parseInt(e.target.value))}
                                        min="1"
                                        className="w-full pl-11 pr-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-900 dark:text-white font-medium"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
                                    Scheduled Time <span className="text-slate-400 font-medium">(Optional)</span>
                                </label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="datetime-local"
                                        value={scheduledFor}
                                        onChange={(e) => setScheduledFor(e.target.value)}
                                        className="w-full pl-11 pr-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-900 dark:text-white font-medium"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Questions Section */}
                        <div className="mb-8">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Question Bank</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{questions.length} questions added</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleCSVUpload}
                                        accept=".csv"
                                        className="hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-xs font-bold transition-all border border-emerald-100 dark:border-emerald-800"
                                    >
                                        <Upload className="w-4 h-4" />
                                        Import CSV
                                    </button>
                                    <button
                                        type="button"
                                        onClick={downloadTemplate}
                                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold transition-all border border-slate-200 dark:border-slate-700"
                                    >
                                        <FileDown className="w-4 h-4" />
                                        Template
                                    </button>
                                    <button
                                        type="button"
                                        onClick={addQuestion}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-xs font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add New
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-6">
                                {questions.map((q, qIndex) => (
                                    <div key={qIndex} className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 relative group overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                                        <div className="flex justify-between items-center mb-5">
                                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-black">
                                                {qIndex + 1}
                                            </span>
                                            {questions.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeQuestion(qIndex)}
                                                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                                    title="Delete Question"
                                                >
                                                    <Trash2 className="w-4.5 h-4.5" />
                                                </button>
                                            )}
                                        </div>

                                        <div className="space-y-5">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] mb-2">Question Statement</label>
                                                <textarea
                                                    value={q.question}
                                                    onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                                                    className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-900 dark:text-white font-medium min-h-[80px]"
                                                    placeholder="Enter your question here..."
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {q.options.map((opt, oIndex) => (
                                                    <div key={oIndex} className="relative group/opt">
                                                        <div className="flex items-center gap-3">
                                                            <div className="relative">
                                                                <input
                                                                    type="radio"
                                                                    name={`correct-${qIndex}`}
                                                                    checked={q.correctAnswer === oIndex}
                                                                    onChange={() => updateQuestion(qIndex, 'correctAnswer', oIndex)}
                                                                    className="peer sr-only"
                                                                    id={`q-edit-${qIndex}-o-${oIndex}`}
                                                                />
                                                                <label
                                                                    htmlFor={`q-edit-${qIndex}-o-${oIndex}`}
                                                                    className="w-6 h-6 rounded-full border-2 border-slate-300 dark:border-slate-700 flex items-center justify-center cursor-pointer peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-all text-white"
                                                                >
                                                                    <div className="w-2 h-2 rounded-full bg-white opacity-0 peer-checked:opacity-100" />
                                                                </label>
                                                            </div>
                                                            <input
                                                                type="text"
                                                                value={opt}
                                                                onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                                                                className={`flex-1 px-4 py-2.5 bg-white dark:bg-slate-900 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm font-medium ${q.correctAnswer === oIndex
                                                                    ? "border-blue-300 dark:border-blue-800 ring-1 ring-blue-100 dark:ring-blue-900/30"
                                                                    : "border-slate-200 dark:border-slate-800"
                                                                    }`}
                                                                placeholder={`Option ${oIndex + 1}`}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div ref={questionsEndRef} />
                            </div>

                            <button
                                type="button"
                                onClick={addQuestion}
                                className="w-full mt-6 py-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 hover:text-blue-500 hover:border-blue-200 dark:hover:border-blue-900/30 hover:bg-blue-50/50 dark:hover:bg-blue-900/5 transition-all flex items-center justify-center gap-2 font-bold group"
                            >
                                <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                Add Another Question
                            </button>
                        </div>
                    </div>
                </form>

                {/* Footer Actions */}
                <div className="px-8 py-5 bg-slate-50 dark:bg-slate-900/90 border-t border-gray-100 dark:border-slate-800 flex justify-between items-center shrink-0">
                    <p className="hidden sm:block text-xs font-medium text-slate-500 dark:text-slate-400 italic">
                        All changes are saved locally until you create the exam.
                    </p>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 sm:flex-none px-6 py-2.5 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 font-bold transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={loading}
                            className="flex-1 sm:flex-none px-8 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-black shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4.5 h-4.5 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save Changes'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
