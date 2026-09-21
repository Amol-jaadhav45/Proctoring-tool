import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, X } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

interface Message {
    userId: string;
    userName: string;
    message: string;
    type: 'proctor' | 'student';
    timestamp: string;
    targetUserId?: string; // For targeted messages
    targetType?: 'all' | 'user'; // 'all' for broadcast, 'user' for specific user
}

interface ProctorChatProps {
    roomId: string;
    userId: string;
    userName: string;
    userType: 'proctor' | 'student';
    isOpen: boolean;
    onClose: () => void;
    availableStudents?: Array<{ id: string; name: string }>; // For proctor to select target
}

const getSignalingUrl = (): string => {
    const signaling = import.meta.env.VITE_SIGNALING_URL as string | undefined;
    if (signaling) return signaling.replace(/\/+$/, '');
    const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
    if (apiUrl) return apiUrl.replace(/\/api\/?$/, '').replace(/\/+$/, '');
    if (typeof window !== 'undefined') return window.location.origin;
    return '';
};

export const ProctorChat: React.FC<ProctorChatProps> = ({
    roomId,
    userId,
    userName,
    userType,
    isOpen,
    onClose,
    availableStudents = []
}) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [targetType, setTargetType] = useState<'all' | 'user'>('all');
    const [targetUserId, setTargetUserId] = useState<string>('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;

        const signalingUrl = getSignalingUrl();
        if (!signalingUrl) {
            console.error('Signaling URL is not set. Set VITE_SIGNALING_URL or run from a browser origin.');
            return;
        }

        console.log('Connecting to signaling server:', signalingUrl);
        const newSocket = io(signalingUrl, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
        });

        newSocket.on('connect', () => {
            console.log('Chat socket connected:', newSocket.id);
            setIsConnected(true);
            newSocket.emit('join-room', roomId, userId);
        });

        newSocket.on('connect_error', (error) => {
            console.error('Chat connection error:', error);
            setIsConnected(false);
        });

        newSocket.on('disconnect', (reason) => {
            console.log('Chat disconnected:', reason);
            setIsConnected(false);
        });

        newSocket.on('new-message', (message: Message) => {
            console.log('Received message:', message);
            // Only show messages if:
            // 1. It's a broadcast (targetType is 'all' or undefined)
            // 2. It's targeted to this user
            // 3. This user sent it
            if (
                (!message.targetType || message.targetType === 'all' || message.targetUserId === userId) &&
                message.userId !== userId
            ) {
                setMessages(prev => [...prev, message]);
            }
        });

        setSocket(newSocket);

        return () => {
            console.log('Cleaning up chat socket');
            newSocket.disconnect();
            setSocket(null);
        };
    }, [isOpen, roomId, userId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = () => {
        if (!inputMessage.trim()) {
            return;
        }

        if (!socket || !socket.connected) {
            console.error('Socket not connected. Cannot send message.');
            alert('Chat connection lost. Please refresh the page.');
            return;
        }

        const message: Message = {
            userId,
            userName,
            message: inputMessage.trim(),
            type: userType,
            timestamp: new Date().toISOString()
        };

        try {
            const payload: any = {
                roomId,
                userId,
                userName,
                message: inputMessage.trim(),
                type: userType,
                timestamp: message.timestamp // Use the same timestamp as the optimistic message
            };

            // Add targeting for proctor
            if (userType === 'proctor') {
                payload.targetType = targetType;
                if (targetType === 'user' && targetUserId) {
                    payload.targetUserId = targetUserId;
                }
            }

            socket.emit('send-message', payload);

            // Optimistically add message to UI
            const messageToAdd: Message = {
                ...message,
                targetType: userType === 'proctor' ? targetType : undefined,
                targetUserId: userType === 'proctor' && targetType === 'user' ? targetUserId : undefined
            };
            setMessages(prev => [...prev, messageToAdd]);
            setInputMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message. Please try again.');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed bottom-4 right-4 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col z-50">
            <div className="bg-blue-600 text-white p-4 rounded-t-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    <h3 className="font-semibold">
                        {userType === 'proctor' ? 'Proctor Chat' : 'Student Support'}
                    </h3>
                    <div className={`flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded text-[10px] ${isConnected ? 'bg-green-500/30' : 'bg-red-500/30'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-300 animate-pulse' : 'bg-red-300'}`}></span>
                        {isConnected ? 'Connected' : 'Disconnected'}
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-blue-700 rounded transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Proctor Targeting Options */}
            {userType === 'proctor' && availableStudents.length > 0 && (
                <div className="bg-blue-50 border-b border-blue-200 p-3">
                    <div className="flex items-center gap-3">
                        <label className="text-xs font-semibold text-blue-900">Send to:</label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    setTargetType('all');
                                    setTargetUserId('');
                                }}
                                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${targetType === 'all'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white text-blue-700 hover:bg-blue-100'
                                    }`}
                            >
                                Everyone
                            </button>
                            <select
                                value={targetUserId}
                                onChange={(e) => {
                                    if (e.target.value) {
                                        setTargetType('user');
                                        setTargetUserId(e.target.value);
                                    } else {
                                        setTargetType('all');
                                        setTargetUserId('');
                                    }
                                }}
                                className="px-3 py-1 rounded text-xs font-medium border border-blue-300 bg-white text-blue-700 focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select Student</option>
                                {availableStudents.map((student) => (
                                    <option key={student.id} value={student.id}>
                                        #{student.id.slice(0, 8)} - {student.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    {targetType === 'user' && targetUserId && (
                        <div className="mt-2 text-xs text-blue-700">
                            Sending to: {availableStudents.find(s => s.id === targetUserId)?.name || targetUserId.slice(0, 8)}
                        </div>
                    )}
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-96">
                {messages.length === 0 ? (
                    <div className="text-center text-gray-500 text-sm py-8">
                        <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No messages yet. Start a conversation!</p>
                    </div>
                ) : (
                    messages.map((msg, idx) => (
                        <div
                            key={idx}
                            className={`flex flex-col ${msg.userId === userId ? 'items-end' : 'items-start'}`}
                        >
                            <div className={`max-w-[80%] rounded-lg p-3 ${msg.userId === userId
                                ? msg.type === 'proctor'
                                    ? 'bg-blue-100 text-blue-900'
                                    : 'bg-gray-100 text-gray-900'
                                : msg.type === 'proctor'
                                    ? 'bg-yellow-100 text-yellow-900'
                                    : 'bg-gray-200 text-gray-900'
                                }`}>
                                <div className="text-xs font-medium mb-1">
                                    {msg.userName} {msg.type === 'proctor' && '👮'}
                                </div>
                                <div className="text-sm">{msg.message}</div>
                                <div className="text-xs opacity-60 mt-1">
                                    {new Date(msg.timestamp).toLocaleTimeString()}
                                </div>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-gray-200 p-3">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder={userType === 'proctor' ? 'Send warning or message...' : 'Ask for help...'}
                        className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!inputMessage.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};





