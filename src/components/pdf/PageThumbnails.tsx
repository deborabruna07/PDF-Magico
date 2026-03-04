import { useEffect, useRef, useState } from 'react';
import { Trash2, RotateCcw, RotateCw } from 'lucide-react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { PDFPageData } from '@/types/pdf-edit';
import { cn } from '@/lib/utils';

interface PageThumbnailsProps {
  pdfDoc: PDFDocumentProxy;
  pages: PDFPageData[];
  currentPage: number;
  onPageSelect: (pageIndex: number) => void;
  onRemovePage: (pageIndex: number) => void;
  onRestorePage: (pageIndex: number) => void;
  onRotatePage: (pageIndex: number) => void;
}

function Thumbnail({
  pdfDoc,
  page,
  isActive,
  onClick,
  onRemove,
  onRestore,
  onRotate,
}: {
  pdfDoc: PDFDocumentProxy;
  page: PDFPageData;
  isActive: boolean;
  onClick: () => void;
  onRemove: () => void;
  onRestore: () => void;
  onRotate: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const pdfPage = await pdfDoc.getPage(page.pageIndex + 1);
      const viewport = pdfPage.getViewport({ scale: 0.3 });
      const canvas = canvasRef.current;
      if (!canvas || cancelled) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d')!;
      await pdfPage.render({ canvasContext: ctx, viewport }).promise;
      if (!cancelled) setRendered(true);
    })();
    return () => { cancelled = true; };
  }, [pdfDoc, page.pageIndex]);

  return (
    <div
      className={cn(
        'group relative cursor-pointer rounded-xl border-2 transition-all duration-300 overflow-hidden shadow-sm',
        // ✨ Transformamos as bordas e fundos cinzentos em tons de rosa
        isActive && !page.removed ? 'border-pink-400 ring-4 ring-pink-400/20' : 'border-transparent bg-pink-50/60',
        page.removed ? 'opacity-50 grayscale' : 'hover:border-pink-300 hover:shadow-md'
      )}
      onClick={!page.removed ? onClick : undefined}
    >
      <div className="p-2 bg-white flex items-center justify-center overflow-hidden min-h-[120px]">
        <canvas
          ref={canvasRef}
          className="rounded shadow-sm transition-transform duration-500 ease-in-out"
          style={{ transform: `rotate(${page.rotation || 0}deg)`, maxWidth: '100%', maxHeight: '140px' }}
        />
      </div>
      
      {/* Etiqueta da Página */}
      <div className="absolute bottom-2 left-2 rounded-md bg-pink-900/60 backdrop-blur-md px-2 py-1 text-[10px] font-bold text-white shadow-sm">
        {page.pageIndex + 1}
      </div>

      {/* Botões Flutuantes (Glassmorphism cor-de-rosa) */}
      <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {!page.removed ? (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onRotate(); }}
              className="rounded-full bg-white/90 backdrop-blur shadow-sm p-1.5 text-pink-500 hover:bg-pink-400 hover:text-white transition-colors"
              title="Rodar 90º"
            >
              <RotateCw className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              className="rounded-full bg-white/90 backdrop-blur shadow-sm p-1.5 text-pink-500 hover:bg-red-500 hover:text-white transition-colors"
              title="Remover página"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onRestore(); }}
            className="rounded-full bg-pink-500/90 backdrop-blur shadow-sm p-1.5 text-white hover:bg-pink-600 transition-colors"
            title="Restaurar página"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

export function PageThumbnails({
  pdfDoc, pages, currentPage, onPageSelect, onRemovePage, onRestorePage, onRotatePage
}: PageThumbnailsProps) {
  return (
    // ✨ Fundo geral da coluna agora usa tons rose e bordas pink
    <div className="flex h-full w-56 flex-col bg-rose-50/40 border-r border-pink-100 shadow-inner">
      
      {/* ✨ Cabeçalho da coluna a combinar com a Toolbar */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-pink-100 bg-white/60 backdrop-blur-sm">
        <span className="text-xs font-bold uppercase tracking-widest text-pink-600">
          Páginas
        </span>
        <span className="text-xs font-bold bg-pink-100 text-pink-700 px-2.5 py-1 rounded-full shadow-sm">
          {pages.filter(p => !p.removed).length}/{pages.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
        {pages.map((page) => (
          <Thumbnail
            key={page.pageIndex} pdfDoc={pdfDoc} page={page} isActive={currentPage === page.pageIndex}
            onClick={() => onPageSelect(page.pageIndex)}
            onRemove={() => onRemovePage(page.pageIndex)}
            onRestore={() => onRestorePage(page.pageIndex)}
            onRotate={() => onRotatePage(page.pageIndex)}
          />
        ))}
      </div>
    </div>
  );
}