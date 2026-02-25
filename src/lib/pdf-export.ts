import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { Annotation, PDFPageData, TextAnnotation } from '@/types/pdf-editor';

// Mapeamento de fontes do Google Fonts (Links diretos para os arquivos .ttf gratuitos)
const GOOGLE_FONTS_URLS: Record<string, string> = {
  'Roboto': 'https://raw.githubusercontent.com/google/fonts/main/ofl/roboto/Roboto-Regular.ttf',
  'Montserrat': 'https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/Montserrat-Regular.ttf',
  'Oswald': 'https://raw.githubusercontent.com/google/fonts/main/ofl/oswald/Oswald-Regular.ttf',
  'Comic Neue': 'https://raw.githubusercontent.com/google/fonts/main/ofl/comicneue/ComicNeue-Regular.ttf'
};

function hexToRgb(hex: string) {
  if (!hex || hex === 'transparent') return rgb(1, 1, 1);
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
  
  // 1. Registrar o FontKit (Necessário para fontes customizadas)
  pdfDoc.registerFontkit(fontkit);

  // 2. Embutir as Fontes Padrão
  const fonts: Record<string, any> = {
    'Helvetica': await pdfDoc.embedFont(StandardFonts.Helvetica),
    'Times New Roman': await pdfDoc.embedFont(StandardFonts.TimesRoman),
    'Courier': await pdfDoc.embedFont(StandardFonts.Courier),
  };

  // 3. Descobrir quais fontes customizadas o utilizador usou e baixá-las!
  const usedCustomFonts = new Set(
    annotations
      .filter((a): a is TextAnnotation => a.type === 'text')
      .map(a => a.fontFamily)
      .filter(font => font && GOOGLE_FONTS_URLS[font])
  );

  for (const fontName of usedCustomFonts) {
    if (fontName) {
      try {
        const url = GOOGLE_FONTS_URLS[fontName];
        const fontBytes = await fetch(url).then(res => res.arrayBuffer());
        fonts[fontName] = await pdfDoc.embedFont(fontBytes);
      } catch (e) {
        console.error(`Falha ao carregar a fonte ${fontName}`, e);
      }
    }
  }

  const getFont = (family?: string) => fonts[family || 'Helvetica'] || fonts['Helvetica'];

  const activePages = pages.filter((p) => !p.removed);

  for (const pageData of activePages) {
    const [copiedPage] = await pdfDoc.copyPages(srcDoc, [pageData.pageIndex]);
    pdfDoc.addPage(copiedPage);

    const newPageIndex = pdfDoc.getPageCount() - 1;
    const page = pdfDoc.getPage(newPageIndex);
    const { height } = page.getSize();

    const pageAnnotations = annotations.filter((a) => a.pageIndex === pageData.pageIndex);

    for (const ann of pageAnnotations) {
      // O ângulo no PDF-lib gira no sentido oposto ao CSS, por isso usamos valor negativo
      const rotationAngle = -(ann.rotation || 0);

      if (ann.type === 'text') {
        const textAnn = ann as TextAnnotation;
        const selectedFont = getFont(textAnn.fontFamily);
        const lines = textAnn.text.split('\n');
        const lineHeight = textAnn.fontSize * 1.2;
        
        // Fundo (Corretor)
        if (textAnn.backgroundColor) {
          page.drawRectangle({
            x: textAnn.x,
            y: height - textAnn.y - (textAnn.height || 30),
            width: textAnn.width || 100,
            height: textAnn.height || 30,
            color: hexToRgb(textAnn.backgroundColor),
            rotate: degrees(rotationAngle)
          });
        }

        // Texto Multilinhas
        if (textAnn.text && textAnn.text.trim()) {
          lines.forEach((line, index) => {
            page.drawText(line, {
              x: textAnn.x + 2,
              y: height - textAnn.y - textAnn.fontSize - (index * lineHeight),
              size: textAnn.fontSize,
              font: selectedFont,
              color: hexToRgb(textAnn.color),
              rotate: degrees(rotationAngle)
            });
          });
        }
      } 
      else if (ann.type === 'image') {
        try {
          const dataUrl = ann.dataUrl;
          let image;
          if (dataUrl.includes('image/png')) {
            image = await pdfDoc.embedPng(dataUrl);
          } else {
            image = await pdfDoc.embedJpg(dataUrl);
          }
          
          page.drawImage(image, {
            x: ann.x,
            y: height - ann.y - ann.height,
            width: ann.width,
            height: ann.height,
            rotate: degrees(rotationAngle)
          });
        } catch (e) {
          console.error('Failed to embed image:', e);
        }
      }
      else if (ann.type === 'draw' && ann.paths.length > 1) {
        for (let i = 1; i < ann.paths.length; i++) {
          page.drawLine({
            start: { x: ann.paths[i - 1].x, y: height - ann.paths[i - 1].y },
            end: { x: ann.paths[i].x, y: height - ann.paths[i].y },
            thickness: ann.lineWidth,
            color: hexToRgb(ann.color),
          });
        }
      }
    }
  }

  return pdfDoc.save();
}