/**
 * Time and Status Utility Functions
 * Used for calculating exam time remaining and student status
 */

/**
 * Calculate time remaining in milliseconds
 * @param endTime - Unix timestamp in milliseconds
 * @returns Milliseconds remaining (0 if expired)
 */
export const calculateTimeRemaining = (endTime: number): number => {
    const now = Date.now();
    return Math.max(0, endTime - now);
};

/**
 * Format milliseconds as HH:MM:SS
 * @param milliseconds - Time in milliseconds
 * @returns Formatted time string
 */
export const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Calculate student status based on credibility score
 * @param credibilityScore - Score from 0-100
 * @returns Status indicator
 */
export const calculateStatus = (
    credibilityScore?: number
): 'ok' | 'warning' | 'alert' => {
    if (!credibilityScore) return 'ok';
    if (credibilityScore < 50) return 'alert';
    if (credibilityScore < 80) return 'warning';
    return 'ok';
};

/**
 * Get default avatar URL
 * @returns Path to default avatar image
 */
export const getDefaultAvatar = (): string => {
    return '/default-avatar.png';
};

/**
 * Get user avatar URL with fallback
 * @param facePhoto - User's face photo URL
 * @returns Avatar URL or default
 */
export const getUserAvatar = (facePhoto?: string): string => {
    return facePhoto || getDefaultAvatar();
};
