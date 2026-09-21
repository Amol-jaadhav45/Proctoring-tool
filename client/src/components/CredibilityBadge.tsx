import React from 'react';
import { clsx } from 'clsx';

interface CredibilityBadgeProps {
    score: number;
    size?: 'small' | 'medium' | 'large';
    showLabel?: boolean;
}

export const CredibilityBadge: React.FC<CredibilityBadgeProps> = ({
    score,
    size = 'medium',
    showLabel = true,
}) => {
    // Determine color based on score
    const getColorClasses = () => {
        if (score >= 80) {
            return {
                bg: 'bg-green-100',
                text: 'text-green-800',
                border: 'border-green-300',
                ring: 'ring-green-500/20',
            };
        } else if (score >= 50) {
            return {
                bg: 'bg-yellow-100',
                text: 'text-yellow-800',
                border: 'border-yellow-300',
                ring: 'ring-yellow-500/20',
            };
        } else {
            return {
                bg: 'bg-red-100',
                text: 'text-red-800',
                border: 'border-red-300',
                ring: 'ring-red-500/20',
            };
        }
    };

    const getSizeClasses = () => {
        switch (size) {
            case 'small':
                return 'text-xs px-2 py-0.5';
            case 'large':
                return 'text-lg px-4 py-2';
            default:
                return 'text-sm px-3 py-1';
        }
    };

    const colors = getColorClasses();
    const sizeClasses = getSizeClasses();

    return (
        <div
            className={clsx(
                'inline-flex items-center gap-2 rounded-full font-semibold border',
                colors.bg,
                colors.text,
                colors.border,
                sizeClasses
            )}
        >
            <div
                className={clsx(
                    'w-2 h-2 rounded-full ring-2',
                    score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500',
                    colors.ring
                )}
            />
            <span>{score}%</span>
            {showLabel && size !== 'small' && (
                <span className="text-xs opacity-75">
                    {score >= 80 ? 'Good' : score >= 50 ? 'Fair' : 'Poor'}
                </span>
            )}
        </div>
    );
};
