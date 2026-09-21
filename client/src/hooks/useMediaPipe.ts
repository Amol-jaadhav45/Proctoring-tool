import { useEffect, useState, useCallback } from 'react';
import { FaceLandmarker, FilesetResolver, ImageEmbedder } from '@mediapipe/tasks-vision';

/** Crop image to face region so comparison ignores clothes/background. Returns canvas or null if no face. */
function cropToFace(
    source: HTMLImageElement | HTMLVideoElement,
    faceLandmarkerImage: FaceLandmarker
): HTMLCanvasElement | null {
    try {
        const result = faceLandmarkerImage.detect(source as HTMLImageElement);
        if (!result?.faceLandmarks?.length) return null;

        const landmarks = result.faceLandmarks[0];
        let minX = 1, minY = 1, maxX = 0, maxY = 0;
        for (const p of landmarks) {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        }
        const pad = 0.2;
        const w = maxX - minX, h = maxY - minY;
        minX = Math.max(0, minX - w * pad);
        minY = Math.max(0, minY - h * pad);
        maxX = Math.min(1, maxX + w * pad);
        maxY = Math.min(1, maxY + h * pad);

        const sw = (source as HTMLImageElement).naturalWidth || (source as HTMLVideoElement).videoWidth;
        const sh = (source as HTMLImageElement).naturalHeight || (source as HTMLVideoElement).videoHeight;
        const x0 = Math.floor(minX * sw);
        const y0 = Math.floor(minY * sh);
        const cw = Math.ceil((maxX - minX) * sw);
        const ch = Math.ceil((maxY - minY) * sh);
        if (cw < 10 || ch < 10) return null;

        const canvas = document.createElement('canvas');
        canvas.width = cw;
        canvas.height = ch;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.drawImage(source, x0, y0, cw, ch, 0, 0, cw, ch);
        return canvas;
        return canvas;
    } catch (e) {
        console.error("❌ [MediaPipe] cropToFace error:", e);
        return null;
    }
}

// Singleton instances to persist models across component lifecycle
let globalFaceLandmarker: FaceLandmarker | null = null;
let globalFaceLandmarkerImage: FaceLandmarker | null = null;
let globalImageEmbedder: ImageEmbedder | null = null;
let initPromise: Promise<void> | null = null;

export const useMediaPipe = () => {
    const [faceLandmarker, setFaceLandmarker] = useState<FaceLandmarker | null>(globalFaceLandmarker);
    const [imageEmbedder, setImageEmbedder] = useState<ImageEmbedder | null>(globalImageEmbedder);
    const [isLoading, setIsLoading] = useState(!globalFaceLandmarker);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadModels = async () => {
            try {
                console.log("🔄 [MediaPipe] Starting model loading...");

                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
                );
                console.log("✅ [MediaPipe] Vision tasks resolver loaded");

                console.log("🔄 [MediaPipe] Loading face landmarker (VIDEO mode)...");
                let landmarker;
                try {
                    landmarker = await FaceLandmarker.createFromOptions(vision, {
                        baseOptions: {
                            modelAssetPath: "/models/face_landmarker.task",
                            delegate: "GPU"
                        },
                        runningMode: "VIDEO",
                        numFaces: 2,
                        outputFaceBlendshapes: true
                    });
                    console.log("✅ [MediaPipe] Face landmarker (VIDEO) loaded with GPU");
                } catch (gpuError) {
                    console.warn("⚠️ [MediaPipe] GPU delegate failed for VIDEO landmarker, falling back to CPU", gpuError);
                    landmarker = await FaceLandmarker.createFromOptions(vision, {
                        baseOptions: {
                            modelAssetPath: "/models/face_landmarker.task",
                            delegate: "CPU"
                        },
                        runningMode: "VIDEO",
                        numFaces: 2,
                        outputFaceBlendshapes: true
                    });
                    console.log("✅ [MediaPipe] Face landmarker (VIDEO) loaded with CPU");
                }
                globalFaceLandmarker = landmarker;

                console.log("🔄 [MediaPipe] Loading face landmarker (IMAGE mode)...");
                let landmarkerImage;
                try {
                    landmarkerImage = await FaceLandmarker.createFromOptions(vision, {
                        baseOptions: {
                            modelAssetPath: "/models/face_landmarker.task",
                            delegate: "GPU"
                        },
                        runningMode: "IMAGE",
                        numFaces: 1,
                        outputFaceBlendshapes: false
                    });
                    console.log("✅ [MediaPipe] Face landmarker (IMAGE) loaded with GPU");
                } catch (gpuError) {
                    console.warn("⚠️ [MediaPipe] GPU delegate failed for IMAGE landmarker, falling back to CPU", gpuError);
                    landmarkerImage = await FaceLandmarker.createFromOptions(vision, {
                        baseOptions: {
                            modelAssetPath: "/models/face_landmarker.task",
                            delegate: "CPU"
                        },
                        runningMode: "IMAGE",
                        numFaces: 1,
                        outputFaceBlendshapes: false
                    });
                    console.log("✅ [MediaPipe] Face landmarker (IMAGE) loaded with CPU");
                }
                globalFaceLandmarkerImage = landmarkerImage;

                console.log("🔄 [MediaPipe] Loading image embedder...");
                const embedder = await ImageEmbedder.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: "/models/mobilenet_v3_small.tflite",
                    },
                    runningMode: "IMAGE"
                });
                globalImageEmbedder = embedder;
                console.log("✅ [MediaPipe] Image embedder loaded");
                console.log("🎉 [MediaPipe] All models loaded successfully!");

            } catch (err: any) {
                console.error("❌ [MediaPipe] Error loading models:", err);
                console.error("Error details:", {
                    message: err?.message,
                    stack: err?.stack,
                    name: err?.name
                });
                setError(err?.message || "Failed to load AI models");
                throw err;
            }
        };

        if (globalFaceLandmarker) {
            console.log("✅ [MediaPipe] Using cached models");
            setIsLoading(false);
            return;
        }

        if (!initPromise) {
            initPromise = loadModels();
        }

        initPromise.then(() => {
            setFaceLandmarker(globalFaceLandmarker);
            setImageEmbedder(globalImageEmbedder);
            setIsLoading(false);
            setError(null);
        }).catch((err) => {
            console.error("❌ [MediaPipe] Failed to initialize models:", err);
            setIsLoading(false);
            setError(err?.message || "Failed to load AI models");
        });
    }, []);


    const compareFaces = useCallback((image1: HTMLImageElement | HTMLVideoElement, image2: HTMLImageElement | HTMLVideoElement): number => {
        if (!globalImageEmbedder || !globalFaceLandmarkerImage) {
            console.error("❌ [MediaPipe] Models not loaded when compareFaces called");
            return 0;
        }

        console.log("🔍 [MediaPipe] compareFaces: Processing captured image...");
        const crop1 = cropToFace(image1, globalFaceLandmarkerImage);
        if (!crop1) {
            console.error("❌ [MediaPipe] No face detected in CAPTURED image");
        } else {
            console.log("✅ [MediaPipe] Face detected in captured image");
        }

        console.log("🔍 [MediaPipe] compareFaces: Processing profile image...");
        const crop2 = cropToFace(image2, globalFaceLandmarkerImage);
        if (!crop2) {
            console.error("❌ [MediaPipe] No face detected in PROFILE photo");
        } else {
            console.log("✅ [MediaPipe] Face detected in profile photo");
        }

        if (!crop1 || !crop2) return 0;

        const result1 = globalImageEmbedder.embed(crop1);
        const result2 = globalImageEmbedder.embed(crop2);

        if (result1.embeddings.length > 0 && result2.embeddings.length > 0) {
            const similarity = ImageEmbedder.cosineSimilarity(result1.embeddings[0], result2.embeddings[0]);
            console.log("📊 [MediaPipe] Similarity calculated:", similarity);
            return similarity;
        }
        return 0;
    }, []);

    return { faceLandmarker, imageEmbedder, compareFaces, isLoading, error };
};

