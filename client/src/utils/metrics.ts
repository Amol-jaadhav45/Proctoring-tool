/**
 * Utility for standardized performance metrics and credibility scoring.
 */

export const METRIC_THRESHOLDS = {
    CREDIBILITY: {
        EXCELLENT: 90,
        GOOD: 80,
        WARNING: 60,
        CRITICAL: 40,
    },
    EXAM_SCORE: {
        PASS: 60,
        EXCELLENT: 85,
    }
};

export type CredibilityStatus = 'ok' | 'warning' | 'alert' | 'critical';

/**
 * Returns the status category for a given credibility score.
 */
export const getCredibilityStatus = (score: number): CredibilityStatus => {
    if (score >= METRIC_THRESHOLDS.CREDIBILITY.GOOD) return 'ok';
    if (score >= METRIC_THRESHOLDS.CREDIBILITY.WARNING) return 'warning';
    if (score >= METRIC_THRESHOLDS.CREDIBILITY.CRITICAL) return 'alert';
    return 'critical';
};

/**
 * Returns the color class for a credibility score.
 */
export const getCredibilityColor = (score: number): string => {
    if (score >= METRIC_THRESHOLDS.CREDIBILITY.GOOD) return 'text-green-600';
    if (score >= METRIC_THRESHOLDS.CREDIBILITY.WARNING) return 'text-orange-500';
    if (score >= METRIC_THRESHOLDS.CREDIBILITY.CRITICAL) return 'text-red-500';
    return 'text-red-800';
};

/**
 * Returns the background and border classes for status indicators.
 */
export const getStatusStyles = (status: CredibilityStatus) => {
    switch (status) {
        case 'ok':
            return 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200';
        case 'warning':
            return 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-200';
        case 'alert':
            return 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200';
        case 'critical':
            return 'bg-red-200 dark:bg-red-900/40 text-red-900 dark:text-red-200 border-red-300 animate-pulse';
        default:
            return 'bg-gray-100 text-gray-700 border-gray-200';
    }
};

/**
 * Formats a score as a percentage string.
 */
export const formatScore = (score: number | undefined): string => {
    if (score === undefined) return 'N/A';
    return `${Math.round(score)}%`;
};
