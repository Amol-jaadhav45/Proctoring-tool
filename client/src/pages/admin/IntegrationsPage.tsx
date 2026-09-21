import React, { useState } from 'react';

import { useAuth } from '../../contexts/AuthContext';
import { Zap, CheckCircle, Key, Webhook, Users } from 'lucide-react';

interface Integration {
    id: string;
    name: string;
    description: string;
    icon: string;
    enabled: boolean;
    configured: boolean;
    category: 'lms' | 'sso' | 'api' | 'webhook';
}

export const IntegrationsPage: React.FC = () => {
    const { user: _user } = useAuth();
    const [integrations, setIntegrations] = useState<Integration[]>([
        {
            id: 'moodle',
            name: 'Moodle',
            description: 'Integrate with Moodle LMS for seamless exam management',
            icon: '📚',
            enabled: false,
            configured: false,
            category: 'lms'
        },
        {
            id: 'canvas',
            name: 'Canvas',
            description: 'Connect with Canvas LMS to sync courses and students',
            icon: '🎨',
            enabled: false,
            configured: false,
            category: 'lms'
        },
        {
            id: 'blackboard',
            name: 'Blackboard',
            description: 'Integrate with Blackboard Learn for course management',
            icon: '📖',
            enabled: false,
            configured: false,
            category: 'lms'
        },
        {
            id: 'sso-saml',
            name: 'SAML SSO',
            description: 'Single Sign-On using SAML 2.0 protocol',
            icon: '🔐',
            enabled: false,
            configured: false,
            category: 'sso'
        },
        {
            id: 'sso-oauth',
            name: 'OAuth 2.0',
            description: 'OAuth 2.0 integration for authentication',
            icon: '🔑',
            enabled: false,
            configured: false,
            category: 'sso'
        },
        {
            id: 'rest-api',
            name: 'REST API',
            description: 'Access platform features via REST API',
            icon: '⚡',
            enabled: true,
            configured: true,
            category: 'api'
        },
        {
            id: 'webhooks',
            name: 'Webhooks',
            description: 'Receive real-time notifications via webhooks',
            icon: '🔔',
            enabled: false,
            configured: false,
            category: 'webhook'
        }
    ]);
    const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
    const [apiKey, setApiKey] = useState('');
    const [webhookUrl, setWebhookUrl] = useState('');


    const toggleIntegration = async (id: string) => {
        setIntegrations(integrations.map(int =>
            int.id === id ? { ...int, enabled: !int.enabled } : int
        ));
    };

    const handleConfigure = (id: string) => {
        setSelectedIntegration(id);
        // In a real app, load existing configuration
    };

    const handleSaveConfig = () => {
        if (!selectedIntegration) return;

        // In a real app, save configuration to backend
        setIntegrations(integrations.map(int =>
            int.id === selectedIntegration ? { ...int, configured: true } : int
        ));
        setSelectedIntegration(null);
        alert('Configuration saved successfully!');
    };

    const generateApiKey = () => {
        const key = `pk_live_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
        setApiKey(key);
    };

    const categories = [
        { id: 'all', name: 'All Integrations', icon: Zap },
        { id: 'lms', name: 'LMS', icon: Users },
        { id: 'sso', name: 'SSO', icon: Key },
        { id: 'api', name: 'API', icon: Zap },
        { id: 'webhook', name: 'Webhooks', icon: Webhook },
    ];

    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const filteredIntegrations = selectedCategory === 'all'
        ? integrations
        : integrations.filter(int => int.category === selectedCategory);

    return (
        <div className="flex-1 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <Zap className="w-8 h-8 text-blue-600" />
                        Integrations
                    </h1>
                    <p className="text-gray-500 mt-1">Connect with external services and platforms</p>
                </div>

                {/* Category Filter */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    {categories.map(cat => {
                        const Icon = cat.icon;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${selectedCategory === cat.id
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white text-gray-700 hover:bg-gray-100'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {cat.name}
                            </button>
                        );
                    })}
                </div>

                {/* Integrations Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {filteredIntegrations.map((integration) => (
                        <div
                            key={integration.id}
                            className="bg-white rounded-xl shadow-md border border-gray-100 p-6 hover:shadow-lg transition-shadow"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-3xl">{integration.icon}</span>
                                    <div>
                                        <h3 className="font-bold text-gray-900">{integration.name}</h3>
                                        <p className="text-sm text-gray-500">{integration.description}</p>
                                    </div>
                                </div>
                                <div className={`w-3 h-3 rounded-full ${integration.enabled ? 'bg-green-500' : 'bg-gray-300'
                                    }`} />
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => toggleIntegration(integration.id)}
                                    className={`flex-1 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${integration.enabled
                                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    {integration.enabled ? 'Disable' : 'Enable'}
                                </button>
                                <button
                                    onClick={() => handleConfigure(integration.id)}
                                    className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium text-sm"
                                >
                                    Configure
                                </button>
                            </div>
                            {integration.configured && (
                                <div className="mt-3 flex items-center gap-2 text-xs text-green-600">
                                    <CheckCircle className="w-4 h-4" />
                                    Configured
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Configuration Modal */}
                {selectedIntegration && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                            <h2 className="text-xl font-bold mb-4">
                                Configure {integrations.find(i => i.id === selectedIntegration)?.name}
                            </h2>

                            {selectedIntegration === 'rest-api' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={apiKey}
                                                readOnly
                                                className="flex-1 px-3 py-2 border rounded-lg bg-gray-50 font-mono text-sm"
                                                placeholder="Click Generate to create API key"
                                            />
                                            <button
                                                onClick={generateApiKey}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                            >
                                                Generate
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2">
                                            Keep this key secure. It provides full access to your account.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {selectedIntegration === 'webhooks' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Webhook URL</label>
                                        <input
                                            type="url"
                                            value={webhookUrl}
                                            onChange={(e) => setWebhookUrl(e.target.value)}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                            placeholder="https://your-domain.com/webhook"
                                        />
                                        <p className="text-xs text-gray-500 mt-2">
                                            We'll send POST requests to this URL for events.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {selectedIntegration !== 'rest-api' && selectedIntegration !== 'webhooks' && (
                                <div className="text-center py-8 text-gray-500">
                                    <p>Configuration options for {integrations.find(i => i.id === selectedIntegration)?.name} will be available soon.</p>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    onClick={() => setSelectedIntegration(null)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveConfig}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Save Configuration
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
