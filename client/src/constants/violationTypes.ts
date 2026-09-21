export type ViolationType =
    | 'TAB_SWITCH'
    | 'FULLSCREEN_EXIT'
    | 'AUDIO_DETECTED'
    | 'NO_FACE'
    | 'MULTIPLE_FACES'
    | 'LOOKING_AWAY'
    | 'USER_MISMATCH'
    | 'FOCUS_LOST'
    | 'LIVENESS_FAILURE'
    | 'PHONE_VISIBLE'
    | 'RIGHT_CLICK_ATTEMPT'
    | 'COPY_ATTEMPT'
    | 'PASTE_ATTEMPT'
    | 'PRINT_ATTEMPT'
    | 'DEVTOOLS_ATTEMPT'
    | 'KEYBOARD_SHORTCUT_C'
    | 'KEYBOARD_SHORTCUT_V'
    | 'KEYBOARD_SHORTCUT_X'
    | 'KEYBOARD_SHORTCUT_A'
    | 'RAPID_INPUT'
    | 'BOT_LIKE_TYPING';

export interface ViolationConfig {
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
}

export const VIOLATION_TYPES: Record<ViolationType, ViolationConfig> = {
    TAB_SWITCH: {
        message: "Tab switching detected!",
        severity: 'critical'
    },
    FULLSCREEN_EXIT: {
        message: "Full-screen exited!",
        severity: 'critical'
    },
    AUDIO_DETECTED: {
        message: "Audio detected!",
        severity: 'critical'
    },
    NO_FACE: {
        message: "No face detected!",
        severity: 'critical'
    },
    MULTIPLE_FACES: {
        message: "Multiple people detected!",
        severity: 'critical'
    },
    LOOKING_AWAY: {
        message: "Looking away from screen",
        severity: 'medium'
    },
    USER_MISMATCH: {
        message: "User identity mismatch!",
        severity: 'critical'
    },
    FOCUS_LOST: {
        message: "Window focus lost!",
        severity: 'high'
    },
    LIVENESS_FAILURE: {
        message: "Liveness check failed (No blink detected)!",
        severity: 'critical'
    },
    PHONE_VISIBLE: {
        message: "Phone or secondary device visible to camera!",
        severity: 'critical'
    },
    RIGHT_CLICK_ATTEMPT: {
        message: "Right-click disabled!",
        severity: 'high'
    },
    COPY_ATTEMPT: {
        message: "Copy disabled!",
        severity: 'critical'
    },
    KEYBOARD_SHORTCUT_C: {
        message: "Copy disabled!",
        severity: 'critical'
    },
    PASTE_ATTEMPT: {
        message: "Paste disabled!",
        severity: 'critical'
    },
    KEYBOARD_SHORTCUT_V: {
        message: "Paste disabled!",
        severity: 'critical'
    },
    PRINT_ATTEMPT: {
        message: "Print disabled!",
        severity: 'high'
    },
    DEVTOOLS_ATTEMPT: {
        message: "Developer tools disabled!",
        severity: 'critical'
    },
    RAPID_INPUT: {
        message: "Suspiciously rapid input detected (Macro/Script)!",
        severity: 'critical'
    },
    BOT_LIKE_TYPING: {
        message: "Bot-like typing detected!",
        severity: 'critical'
    },
    KEYBOARD_SHORTCUT_X: {
        message: "Cut disabled!",
        severity: 'critical'
    },
    KEYBOARD_SHORTCUT_A: {
        message: "Select all disabled!",
        severity: 'critical'
    }
};
