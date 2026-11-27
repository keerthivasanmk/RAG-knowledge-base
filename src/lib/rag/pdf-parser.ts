import { PageText } from './chunker';

/**
 * Extracts text from a PDF Buffer with page number tracking.
 * Uses pdf-parse with a custom page-render handler.
 */
export async function extractPagesFromPDF(pdfBuffer: Buffer): Promise<PageText[]> {
  // Dynamic import to prevent client-side bundling issues in Next.js
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pdfParse = require('pdf-parse');

  const pages: PageText[] = [];

  const options = {
    pagerender: async function (pageData: any) {
      const pageIndex = pageData.pageIndex ? pageData.pageIndex + 1 : pages.length + 1;
      const textContent = await pageData.getTextContent();
      
      let pageText = '';
      let lastY: number | null = null;

      for (const item of textContent.items) {
        if (!item.str) continue;
        if (lastY === null || Math.abs(lastY - item.transform[5]) < 2) {
          pageText += item.str + ' ';
        } else {
          pageText += '\n' + item.str + ' ';
        }
        lastY = item.transform[5];
      }

      const cleanedText = pageText.trim();
      if (cleanedText) {
        pages.push({
          pageNumber: pageIndex,
          text: cleanedText,
        });
      }

      return pageText;
    },
  };

  const data = await pdfParse(pdfBuffer, options);

  // Fallback: If custom pagerender didn't populate individual pages, use full text as page 1
  if (pages.length === 0 && data.text) {
    pages.push({
      pageNumber: 1,
      text: data.text.trim(),
    });
  }

  return pages;
}
