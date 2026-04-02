/**
 * Extract raw text from a PDF buffer using pdfjs-dist.
 * Designed to run in Next.js API routes (Node.js server context).
 */
export async function extractText(buffer: Buffer): Promise<{
  fullText: string;
  pages: string[];
  numPages: number;
}> {
  // Use dynamic require to avoid webpack bundling issues
  // pdfjs-dist is listed in serverExternalPackages in next.config.ts
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

  // Disable worker threads (not available in API routes)
  if (pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '';
  }

  const data = new Uint8Array(buffer);
  const loadingTask = pdfjsLib.getDocument({
    data,
    useSystemFonts: true,
    // Disable worker to run synchronously in API route
    isEvalSupported: false,
  });
  
  const doc = await loadingTask.promise;
  const pages: string[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();

    // Reconstruct text with line breaks based on Y-position changes
    let pageText = '';
    let lastY: number | null = null;

    for (const item of content.items) {
      if ('str' in item && 'transform' in item) {
        const textItem = item as { str: string; transform: number[] };
        const y = textItem.transform[5];

        // Insert newline when Y position changes (new line in PDF)
        if (lastY !== null && Math.abs(y - lastY) > 2) {
          pageText += '\n';
        } else if (lastY !== null && pageText.length > 0 && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
          // Add space between items on the same line
          pageText += ' ';
        }

        pageText += textItem.str;
        lastY = y;
      }
    }

    pages.push(pageText);
  }

  const fullText = pages.join('\n\n');
  return { fullText, pages, numPages: doc.numPages };
}
