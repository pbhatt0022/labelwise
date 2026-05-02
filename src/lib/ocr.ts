import { createWorker } from "tesseract.js";

export interface OcrResult {
  text: string;
  confidence?: number;
  durationMs?: number;
  warnings?: string[];
}

export interface OcrAdapter {
  extractText(input: Blob | File): Promise<OcrResult>;
}

async function resizeImageIfNeeded(file: File): Promise<Blob> {
  const imageUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Could not load the selected image."));
      element.src = imageUrl;
    });

    const maxDimension = 1800;
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));

    if (scale === 1) {
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    const context = canvas.getContext("2d");

    if (!context) {
      return file;
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    return blob ?? file;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

export class TesseractOcrAdapter implements OcrAdapter {
  async extractText(input: Blob | File): Promise<OcrResult> {
    const worker = await createWorker("eng");
    const startTime = performance.now();

    try {
      const image = await resizeImageIfNeeded(input instanceof File ? input : new File([input], "ocr-region.jpg", { type: input.type || "image/jpeg" }));
      const result = await worker.recognize(image);
      const text = result.data.text.trim();
      const confidence = result.data.confidence;
      const warnings: string[] = [];

      if (!text) {
        warnings.push("No readable text was detected in this image.");
      }

      if (typeof confidence === "number" && confidence < 55) {
        warnings.push("OCR confidence is low, so double-check the extracted text before analyzing.");
      }

      return {
        text,
        confidence,
        durationMs: Math.round(performance.now() - startTime),
        warnings,
      };
    } finally {
      await worker.terminate();
    }
  }
}
