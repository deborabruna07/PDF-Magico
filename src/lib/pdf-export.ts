import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { Annotation, PDFPageData } from '@/types/pdf-editor';

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return rgb(r, g, b);
}

export async function exportPDF(
  originalBytes: ArrayBuffer,
  pages: PDFPageData[],
  annotations: Annotation[]
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(originalBytes);
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const activePages = pages.filter((p) => !p.removed);

  for (const pageData of activePages) {
    const [copiedPage] = await pdfDoc.copyPages(srcDoc, [pageData.pageIndex]);
    pdfDoc.addPage(copiedPage);

    const newPageIndex = pdfDoc.getPageCount() - 1;
    const page = pdfDoc.getPage(newPageIndex);
    const { height } = page.getSize();

    const pageAnnotations = annotations.filter(
      (a) => a.pageIndex === pageData.pageIndex
    );

    for (const ann of pageAnnotations) {
      if (ann.type === 'text' && ann.text) {
        page.drawText(ann.text, {
          x: ann.x,
          y: height - ann.y - ann.fontSize,
          size: ann.fontSize,
          font,
          color: hexToRgb(ann.color),
        });
      } else if (ann.type === 'draw' && ann.paths.length > 1) {
        for (let i = 1; i < ann.paths.length; i++) {
          page.drawLine({
            start: { x: ann.paths[i - 1].x, y: height - ann.paths[i - 1].y },
            end: { x: ann.paths[i].x, y: height - ann.paths[i].y },
            thickness: ann.lineWidth,
            color: hexToRgb(ann.color),
          });
        }
      } else if (ann.type === 'image') {
        try {
          const dataUrl = ann.dataUrl;
          let image;
          if (dataUrl.includes('image/png')) {
            const base64 = dataUrl.split(',')[1];
            const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
            image = await pdfDoc.embedPng(bytes);
          } else {
            const base64 = dataUrl.split(',')[1];
            const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
            image = await pdfDoc.embedJpg(bytes);
          }
          page.drawImage(image, {
            x: ann.x,
            y: height - ann.y - ann.height,
            width: ann.width,
            height: ann.height,
          });
        } catch (e) {
          console.error('Failed to embed image:', e);
        }
      }
    }
  }

  return pdfDoc.save();
}
