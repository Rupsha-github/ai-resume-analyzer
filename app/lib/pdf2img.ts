// pdf2img.ts

export interface PdfConversionResult {
    imageUrl: string;
    file: File | null;
    error?: string;
}

export async function convertPdfToImage(file: File): Promise<PdfConversionResult> {
    if (typeof window === "undefined") {
        return {
            imageUrl: "",
            file: null,
            error: "PDF rendering is only available in browser environments.",
        };
    }

    try {
        const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist");
        const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;

        GlobalWorkerOptions.workerSrc = workerSrc;

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);

        const scale = 2;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        if (!context) {
            return {
                imageUrl: "",
                file: null,
                error: "Canvas rendering context not available.",
            };
        }

        await page.render({
            canvasContext: context,
            viewport,
            canvas, // Required in recent PDF.js versions
        });

        return new Promise((resolve) => {
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        const imageFile = new File(
                            [blob],
                            `${file.name.replace(/\.pdf$/i, "")}.png`,
                            { type: "image/png" }
                        );

                        resolve({
                            imageUrl: URL.createObjectURL(blob),
                            file: imageFile,
                        });
                    } else {
                        resolve({
                            imageUrl: "",
                            file: null,
                            error: "Failed to generate PNG blob from canvas.",
                        });
                    }
                },
                "image/png",
                1.0
            );
        });
    } catch (error: any) {
        console.error("PDF to image conversion error:", error);
        return {
            imageUrl: "",
            file: null,
            error: `Failed to convert PDF: ${error.message || error}`,
        };
    }
}