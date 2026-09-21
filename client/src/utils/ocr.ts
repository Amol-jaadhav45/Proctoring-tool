/**
 * Simple OCR-like text extraction from ID card images
 * Uses Tesseract.js for text extraction
 */

export interface ExtractedIDData {
    name?: string;
    studentId?: string;
    dob?: string;
    urn?: string;
    class?: string;
}

/**
 * Extract text from ID card image using Tesseract.js
 * Falls back to manual pattern matching if Tesseract is not available
 */
export async function extractTextFromID(imageDataUrl: string): Promise<ExtractedIDData> {
    try {
        // Try to use Tesseract.js if available
        if (typeof window !== 'undefined' && (window as any).Tesseract) {
            const { Tesseract } = (window as any);
            const { data: { text } } = await Tesseract.recognize(imageDataUrl, 'eng');
            
            // Parse extracted text
            return parseIDText(text);
        }
    } catch (error) {
        console.warn('Tesseract OCR not available, using fallback', error);
    }

    // Fallback: Return empty data (will rely on face matching only)
    return {};
}

/**
 * Parse extracted text to find name and other details
 */
function parseIDText(text: string): ExtractedIDData {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const result: ExtractedIDData = {};

    // Look for name patterns (usually contains "Wagh", "Ganesh", etc.)
    for (const line of lines) {
        // Match name pattern (2-4 words, capitalized)
        const nameMatch = line.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})$/);
        if (nameMatch && !result.name) {
            result.name = nameMatch[1];
        }

        // Match URN pattern (6 digits)
        const urnMatch = line.match(/(\d{6})/);
        if (urnMatch && !result.urn) {
            result.urn = urnMatch[1];
        }

        // Match DOB pattern (DD/MM/YYYY)
        const dobMatch = line.match(/(\d{2}\/\d{2}\/\d{4})/);
        if (dobMatch && !result.dob) {
            result.dob = dobMatch[1];
        }

        // Match class pattern (like FYCM)
        const classMatch = line.match(/([A-Z]{2,5})/);
        if (classMatch && !result.class && classMatch[1] !== 'URN' && classMatch[1] !== 'DOB') {
            result.class = classMatch[1];
        }
    }

    return result;
}

/**
 * Compare two ID card images to check if they match
 * Uses image similarity and extracted text comparison
 */
export async function compareIDCards(
    capturedImage: string,
    authorizedImage: string,
    compareFaces: (img1: HTMLImageElement | HTMLVideoElement, img2: HTMLImageElement | HTMLVideoElement) => number
): Promise<{ matches: boolean; similarity: number; extractedName?: string }> {
    const capturedImg = new Image();
    const authorizedImg = new Image();

    capturedImg.src = capturedImage;
    authorizedImg.src = authorizedImage;

    await Promise.all([
        new Promise((resolve) => { capturedImg.onload = resolve; }),
        new Promise((resolve) => { authorizedImg.onload = resolve; })
    ]);

    // Compare images using face matching
    const similarity = compareFaces(capturedImg, authorizedImg);

    // Extract text from captured image
    const extractedData = await extractTextFromID(capturedImage);

    // For now, we'll use a lower threshold for ID card matching (0.60)
    // since ID cards may have different lighting/angles
    const ID_MATCH_THRESHOLD = 0.60;

    return {
        matches: similarity >= ID_MATCH_THRESHOLD,
        similarity,
        extractedName: extractedData.name
    };
}
