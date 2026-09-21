import { useEffect, useRef } from 'react';

interface BrowserLockdownOptions {
    disableRightClick?: boolean;
    disableCopyPaste?: boolean;
    disablePrint?: boolean;
    disableDevTools?: boolean;
    enforceFullscreen?: boolean;
    onViolation?: (type: string) => void;
}

export const useBrowserLockdown = (options: BrowserLockdownOptions = {}) => {
    const {
        disableRightClick = true,
        disableCopyPaste = true,
        disablePrint = true,
        disableDevTools = true,
        enforceFullscreen = true,
        onViolation
    } = options;

    const fullscreenCheckRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        // Disable right-click
        const handleContextMenu = (e: MouseEvent) => {
            if (disableRightClick) {
                e.preventDefault();
                onViolation?.('RIGHT_CLICK_ATTEMPT');
            }
        };

        // Disable copy/paste
        const handleCopy = (e: ClipboardEvent) => {
            if (disableCopyPaste) {
                e.preventDefault();
                onViolation?.('COPY_ATTEMPT');
            }
        };

        const handlePaste = (e: ClipboardEvent) => {
            if (disableCopyPaste) {
                e.preventDefault();
                onViolation?.('PASTE_ATTEMPT');
            }
        };

        const handleCut = (e: ClipboardEvent) => {
            if (disableCopyPaste) {
                e.preventDefault();
                onViolation?.('CUT_ATTEMPT');
            }
        };

        // Disable keyboard shortcuts
        const handleKeyDown = (e: KeyboardEvent) => {
            // Disable Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A
            if (disableCopyPaste && (e.ctrlKey || e.metaKey)) {
                if (['c', 'v', 'x', 'a'].includes(e.key.toLowerCase())) {
                    e.preventDefault();
                    onViolation?.(`KEYBOARD_SHORTCUT_${e.key.toUpperCase()}`);
                }
            }

            // Disable Print (Ctrl+P / Cmd+P)
            if (disablePrint && (e.ctrlKey || e.metaKey) && e.key === 'p') {
                e.preventDefault();
                onViolation?.('PRINT_ATTEMPT');
            }

            // Disable DevTools (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U)
            if (disableDevTools) {
                if (
                    e.key === 'F12' ||
                    ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j'].includes(e.key.toLowerCase())) ||
                    ((e.ctrlKey || e.metaKey) && e.key === 'u')
                ) {
                    e.preventDefault();
                    onViolation?.('DEVTOOLS_ATTEMPT');
                }
            }
        };

        // Fullscreen enforcement
        const checkFullscreen = () => {
            if (enforceFullscreen) {
                if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
                    onViolation?.('FULLSCREEN_EXIT');
                    // Try to re-enter fullscreen
                    const element = document.documentElement;
                    if (element.requestFullscreen) {
                        element.requestFullscreen().catch(() => {
                            console.warn('Failed to re-enter fullscreen');
                        });
                    } else if ((element as any).webkitRequestFullscreen) {
                        (element as any).webkitRequestFullscreen();
                    }
                }
            }
        };

        // Disable text selection
        const handleSelectStart = (e: Event) => {
            if (disableCopyPaste) {
                e.preventDefault();
            }
        };

        // Attach event listeners
        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('copy', handleCopy);
        document.addEventListener('paste', handlePaste);
        document.addEventListener('cut', handleCut);
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('selectstart', handleSelectStart);
        document.addEventListener('fullscreenchange', checkFullscreen);
        document.addEventListener('webkitfullscreenchange', checkFullscreen);

        // Periodic fullscreen check
        if (enforceFullscreen) {
            fullscreenCheckRef.current = setInterval(checkFullscreen, 1000);
        }

        // Enter fullscreen on mount
        if (enforceFullscreen) {
            const element = document.documentElement;
            if (element.requestFullscreen) {
                element.requestFullscreen().catch(() => {
                    console.warn('Fullscreen not available');
                });
            } else if ((element as any).webkitRequestFullscreen) {
                (element as any).webkitRequestFullscreen();
            }
        }

        // Cleanup
        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('copy', handleCopy);
            document.removeEventListener('paste', handlePaste);
            document.removeEventListener('cut', handleCut);
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('selectstart', handleSelectStart);
            document.removeEventListener('fullscreenchange', checkFullscreen);
            document.removeEventListener('webkitfullscreenchange', checkFullscreen);

            if (fullscreenCheckRef.current) {
                clearInterval(fullscreenCheckRef.current);
            }
        };
    }, [disableRightClick, disableCopyPaste, disablePrint, disableDevTools, enforceFullscreen, onViolation]);
};





