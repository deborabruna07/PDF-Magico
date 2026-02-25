import { useEffect, useRef, useState } from 'react';
import { Trash2, RotateCcw } from 'lucide-react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { PDFPageData } from '@/types/pdf-editor';
import { cn } from '@/lib/utils';

interface PageThumbnailsProps {
  pdfDoc: PDFDocumentProxy;
  pages: PDFPageData[];
  currentPage: number;
  onPageSelect: (pageIndex: number) => void;
  onRemovePage: (pageIndex: number) => void;
  onRestorePage: (pageIndex: number) => void;
}

function Thumbnail({
  pdfDoc,
  pageIndex,
  removed,
  isActive,
  onClick,
  onRemove,
  onRestore,
}: {
  pdfDoc: PDFDocumentProxy;
  pageIndex: number;
  removed: boolean;
  isActive: boolean;
  onClick: () => void;
  onRemove: () => void;
  onRestore: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const page = await pdfDoc.getPage(pageIndex + 1);
      const viewport = page.getViewport({ scale: 0.3 });
      const canvas = canvasRef.current;
      if (!canvas || cancelled) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d')!;
      await page.render({ canvasContext: ctx, viewport }).promise;
      if (!cancelled) setRendered(true);
    })();
    return () => { cancelled = true; };
  }, [pdfDoc, pageIndex]);

  return (
    <div
      className={cn(
        'group relative cursor-pointer rounded-lg border-2 transition-all',
        isActive && !removed ? 'border-sidebar-accent-color' : 'border-transparent',
        removed ? 'opacity-40' : 'hover:border-sidebar-fg/30'
      )}
      onClick={!removed ? onClick : undefined}
    >
      <canvas
        ref={canvasRef}
        className={cn('w-full rounded-md', removed && 'grayscale')}
      />
      <div className="absolute bottom-1 left-1 rounded bg-sidebar-bg/80 px-1.5 py-0.5 text-[10px] font-medium text-sidebar-fg-active">
        {pageIndex + 1}
      </div>
      {!removed ? (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="absolute right-1 top-1 hidden rounded-md bg-destructive p-1 text-destructive-foreground group-hover:flex transition-colors hover:bg-destructive/80"
          title="Remover página"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); onRestore(); }}
          className="absolute right-1 top-1 rounded-md bg-success p-1 text-success-foreground transition-colors hover:bg-success/80"
          title="Restaurar página"
        >
          <RotateCcw className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

export function PageThumbnails({
  pdfDoc,
  pages,
  currentPage,
  onPageSelect,
  onRemovePage,
  onRestorePage,
}: PageThumbnailsProps) {
  return (
    <div className="flex h-full w-52 flex-col bg-sidebar-bg border-r border-sidebar-border-color">
      <div className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-sidebar-fg">
        Páginas ({pages.filter(p => !p.removed).length}/{pages.length})
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 pb-3 space-y-2">
        {pages.map((page) => (
          <Thumbnail
            key={page.pageIndex}
            pdfDoc={pdfDoc}
            pageIndex={page.pageIndex}
            removed={page.removed}
            isActive={currentPage === page.pageIndex}
            onClick={() => onPageSelect(page.pageIndex)}
            onRemove={() => onRemovePage(page.pageIndex)}
            onRestore={() => onRestorePage(page.pageIndex)}
          />
        ))}
      </div>
    </div>
  );
}
