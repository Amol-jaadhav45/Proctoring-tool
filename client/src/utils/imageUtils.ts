/**
 * Utility to flip a DataURL image horizontally
 */
export async function flipImageHorizontal(dataUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }

            // Flip horizontally
            ctx.translate(img.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(img, 0, 0);

            resolve(canvas.toDataURL('image/jpeg'));
        };
        img.onerror = () => reject(new Error('Failed to load image for flipping'));
        img.src = dataUrl;
    });
}
