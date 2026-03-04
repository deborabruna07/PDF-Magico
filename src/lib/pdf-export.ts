import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { Annotation, PDFPageData, TextAnnotation, DrawAnnotation } from '@/types/pdf-editor';

const GOOGLE_FONTS_URLS: Record<string, { regular: string; bold: string }> = {
  'Roboto': {
    regular: 'https://raw.githubusercontent.com/google/fonts/main/ofl/roboto/Roboto-Regular.ttf',
    bold: 'https://raw.githubusercontent.com/google/fonts/main/ofl/roboto/Roboto-Bold.ttf'
  },
  'Montserrat': {
    regular: 'https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/Montserrat-Regular.ttf',
    bold: 'https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/Montserrat-Bold.ttf'
  },
  'Oswald': {
    regular: 'https://raw.githubusercontent.com/google/fonts/main/ofl/oswald/Oswald-Regular.ttf',
    bold: 'https://raw.githubusercontent.com/google/fonts/main/ofl/oswald/Oswald-Bold.ttf'
  },
  'Comic Neue': {
    regular: 'https://raw.githubusercontent.com/google/fonts/main/ofl/comicneue/ComicNeue-Regular.ttf',
    bold: 'https://raw.githubusercontent.com/google/fonts/main/ofl/comicneue/ComicNeue-Bold.ttf'
  }
};

function hexToRgb(hex: string) {
  if (!hex || hex === 'transparent') return rgb(1, 1, 1);
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return rgb(r, g, b);
}

// ✨ NOVA FUNÇÃO MATEMÁTICA PARA ROTACIONAR PELO CENTRO:
// O PDFJs rotaciona pelas pontas, o HTML rotaciona pelo centro.
// Essa função traduz a posição de forma que o elemento fique no mesmo lugar.
function getRotatedPoint(
  pointX: number, pointY: number,
  cx: number, cy: number,
  angleDegrees: number
) {
  const dx = pointX - cx;
  const dy = pointY - cy;
  const rad = (angleDegrees * Math.PI) / 180;
  
  const newDx = dx * Math.cos(rad) - dy * Math.sin(rad);
  const newDy = dx * Math.sin(rad) + dy * Math.cos(rad);
  
  return { x: cx + newDx, y: cy + newDy };
}

export async function exportPDF(
  originalBytes: ArrayBuffer,
  pages: PDFPageData[],
  annotations: Annotation[]
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(originalBytes);
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const fonts: Record<string, { regular: any; bold: any }> = {
    'Helvetica': {
      regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
      bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    },
    'Times New Roman': {
      regular: await pdfDoc.embedFont(StandardFonts.TimesRoman),
      bold: await pdfDoc.embedFont(StandardFonts.TimesRomanBold),
    },
    'Courier': {
      regular: await pdfDoc.embedFont(StandardFonts.Courier),
      bold: await pdfDoc.embedFont(StandardFonts.CourierBold),
    },
  };

  const usedCustomFonts = new Set(
    annotations
      .filter((a): a is TextAnnotation => a.type === 'text')
      .map(a => a.fontFamily)
      .filter(font => font && GOOGLE_FONTS_URLS[font])
  );

  for (const fontName of usedCustomFonts) {
    if (fontName) {
      try {
        const urls = GOOGLE_FONTS_URLS[fontName];
        const [regBytes, boldBytes] = await Promise.all([
          fetch(urls.regular).then(res => res.arrayBuffer()),
          fetch(urls.bold).then(res => res.arrayBuffer())
        ]);
        fonts[fontName] = {
          regular: await pdfDoc.embedFont(regBytes),
          bold: await pdfDoc.embedFont(boldBytes)
        };
      } catch (e) { console.error("Erro ao carregar fonte:", e); }
    }
  }

  const activePages = pages.filter((p) => !p.removed);

  for (const pageData of activePages) {
    const [copiedPage] = await pdfDoc.copyPages(srcDoc, [pageData.pageIndex]);
    pdfDoc.addPage(copiedPage);

    const page = pdfDoc.getPage(pdfDoc.getPageCount() - 1);
    
    if (pageData.rotation) {
      const currentRotation = page.getRotation().angle;
      page.setRotation(degrees((currentRotation + pageData.rotation) % 360));
    }

    const { height } = page.getSize();
    const pageAnnotations = annotations.filter((a) => a.pageIndex === pageData.pageIndex);

    for (const ann of pageAnnotations) {
      const rotationAngle = -(ann.rotation || 0);

      if (ann.type === 'text') {
        const textAnn = ann as TextAnnotation;
        const fontGroup = fonts[textAnn.fontFamily || 'Helvetica'] || fonts['Helvetica'];
        const selectedFont = textAnn.fontWeight === 'bold' ? fontGroup.bold : fontGroup.regular;
        const lines = textAnn.text.split('\n');
        const lineHeight = textAnn.fontSize * 1.1;
        const longestLine = lines.reduce((a, b) => (a.length > b.length ? a : b), "");
        const measuredWidth = selectedFont.widthOfTextAtSize(longestLine || " ", textAnn.fontSize);
        const rectWidth = textAnn.width || measuredWidth;
        const rectHeight = textAnn.height || (lines.length * lineHeight);

        // ✨ A mágica acontece aqui: encontra o centro real do texto
        const pdfCx = textAnn.x + rectWidth / 2;
        const pdfCy = height - textAnn.y - rectHeight / 2;

        if (textAnn.backgroundColor) {
          // Reposiciona o fundo do texto aplicando o giro em torno do centro
          const rectOrigin = getRotatedPoint(
            textAnn.x, height - textAnn.y - rectHeight,
            pdfCx, pdfCy, rotationAngle
          );

          page.drawRectangle({
            x: rectOrigin.x,
            y: rectOrigin.y,
            width: rectWidth,
            height: rectHeight,
            color: hexToRgb(textAnn.backgroundColor),
            rotate: degrees(rotationAngle)
          });
        }

        lines.forEach((line, index) => {
          if (line || line === "") {
            // Reposiciona cada linha de texto aplicando o giro em torno do centro
            const lineOrigin = getRotatedPoint(
              textAnn.x, 
              height - textAnn.y - textAnn.fontSize - (index * lineHeight),
              pdfCx, pdfCy, rotationAngle
            );

            page.drawText(line, {
              x: lineOrigin.x, 
              y: lineOrigin.y,
              size: textAnn.fontSize,
              font: selectedFont,
              color: hexToRgb(textAnn.color),
              rotate: degrees(rotationAngle)
            });
          }
        });
      } 
      else if (ann.type === 'image') {
        try {
          const image = ann.dataUrl.includes('image/png') 
            ? await pdfDoc.embedPng(ann.dataUrl) 
            : await pdfDoc.embedJpg(ann.dataUrl);
          
          const imgPdfCx = ann.x + ann.width / 2;
          const imgPdfCy = height - ann.y - ann.height / 2;
          
          // Reposiciona a imagem aplicando o giro em torno do centro
          const imgOrigin = getRotatedPoint(
            ann.x, height - ann.y - ann.height,
            imgPdfCx, imgPdfCy, rotationAngle
          );
          
          page.drawImage(image, {
            x: imgOrigin.x,
            y: imgOrigin.y,
            width: ann.width,
            height: ann.height,
            rotate: degrees(rotationAngle)
          });
        } catch (e) { console.error("Erro na imagem:", e); }
      }
      else if (ann.type === 'draw' && ann.paths.length > 1) {
        const drawAnn = ann as DrawAnnotation;
        
        for (let i = 1; i < drawAnn.paths.length; i++) {
          const currentPoint = drawAnn.paths[i];
          const prevPoint = drawAnn.paths[i - 1];

          if (!currentPoint.erased && !prevPoint.erased) {
            page.drawLine({
              start: { x: prevPoint.x, y: height - prevPoint.y },
              end: { x: currentPoint.x, y: height - currentPoint.y },
              thickness: drawAnn.lineWidth * 0.75, 
              color: hexToRgb(drawAnn.color),
              lineCap: 1,
            });
          }
        }
      }
    }
  }

  return pdfDoc.save();
}