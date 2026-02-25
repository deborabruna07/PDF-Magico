import { useEffect, useRef, useState, useCallback } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { Annotation, Tool, TextAnnotation, DrawAnnotation } from '@/types/pdf-editor';
import { cn } from '@/lib/utils';

interface PDFCanvasProps {
  pdfDoc: PDFDocumentProxy;
  pageIndex: number;
  activeTool: Tool;
  annotations: Annotation[];
  onAddAnnotation: (annotation: Annotation) => void;
  onRemoveAnnotation: (id: string) => void;
}

export function PDFCanvas({
  pdfDoc,
  pageIndex,
  activeTool,
  annotations,
  onAddAnnotation,
  onRemoveAnnotation,
}: PDFCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [drawing, setDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [editingText, setEditingText] = useState<string | null>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);

  // Render PDF page
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const page = await pdfDoc.getPage(pageIndex + 1);
      const baseViewport = page.getViewport({ scale: 1 });
      // Find the outer scrollable container
      const container = canvasRef.current?.closest('.pdf-canvas-container');
      if (!container || cancelled) return;

      const maxWidth = container.clientWidth - 80;
      const maxHeight = container.clientHeight - 80;
      const scaleW = maxWidth / baseViewport.width;
      const scaleH = maxHeight / baseViewport.height;
      const fitScale = Math.min(scaleW, scaleH, 2);

      const viewport = page.getViewport({ scale: fitScale });
      const canvas = canvasRef.current;
      if (!canvas || cancelled) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      setCanvasSize({ width: viewport.width, height: viewport.height });
      setScale(fitScale);

      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
    })();
    return () => { cancelled = true; };
  }, [pdfDoc, pageIndex]);

  const pageAnnotations = annotations.filter((a) => a.pageIndex === pageIndex);

  const getRelativePos = useCallback(
    (e: React.MouseEvent) => {
      const rect = overlayRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (e.clientX - rect.left) / scale,
        y: (e.clientY - rect.top) / scale,
      };
    },
    [scale]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (activeTool === 'text') {
        const pos = getRelativePos(e);
        const id = crypto.randomUUID();
        const annotation: TextAnnotation = {
          id,
          type: 'text',
          pageIndex,
          x: pos.x,
          y: pos.y,
          text: '',
          fontSize: 16,
          color: '#1a1a2e',
        };
        onAddAnnotation(annotation);
        setEditingText(id);
        setTimeout(() => textInputRef.current?.focus(), 50);
      } else if (activeTool === 'image') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async () => {
          const file = input.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            const pos = getRelativePos(e);
            const id = crypto.randomUUID();
            onAddAnnotation({
              id,
              type: 'image',
              pageIndex,
              x: pos.x,
              y: pos.y,
              width: 150,
              height: 150,
              dataUrl: reader.result as string,
            });
          };
          reader.readAsDataURL(file);
        };
        input.click();
      }
    },
    [activeTool, pageIndex, getRelativePos, onAddAnnotation]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (activeTool === 'draw' || activeTool === 'sign') {
        const pos = getRelativePos(e);
        setDrawing(true);
        setCurrentPath([pos]);
      }
    },
    [activeTool, getRelativePos]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (drawing) {
        const pos = getRelativePos(e);
        setCurrentPath((prev) => [...prev, pos]);
      }
    },
    [drawing, getRelativePos]
  );

  const handleMouseUp = useCallback(() => {
    if (drawing && currentPath.length > 1) {
      const id = crypto.randomUUID();
      const annotation: DrawAnnotation = {
        id,
        type: 'draw',
        pageIndex,
        paths: currentPath,
        color: activeTool === 'sign' ? '#1a1a2e' : '#2563eb',
        lineWidth: activeTool === 'sign' ? 2 : 3,
      };
      onAddAnnotation(annotation);
    }
    setDrawing(false);
    setCurrentPath([]);
  }, [drawing, currentPath, pageIndex, activeTool, onAddAnnotation]);

  // Draw annotations on overlay SVG
  const renderDrawAnnotations = () => {
    const draws = pageAnnotations.filter((a): a is DrawAnnotation => a.type === 'draw');
    return draws.map((d) => (
      <g key={d.id} onClick={() => activeTool === 'select' && onRemoveAnnotation(d.id)} className="cursor-pointer">
        <polyline
          points={d.paths.map((p) => `${p.x * scale},${p.y * scale}`).join(' ')}
          fill="none"
          stroke={d.color}
          strokeWidth={d.lineWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    ));
  };

  return (
    <div className="pdf-canvas-container flex flex-1 items-center justify-center overflow-auto bg-canvas-bg p-10">
      <div
        className="relative shadow-xl rounded-sm"
        style={{ width: canvasSize.width, height: canvasSize.height }}
      >
        <canvas ref={canvasRef} className="rounded-sm bg-canvas-page" />
        <div
          ref={overlayRef}
          className={cn(
            'absolute inset-0',
            activeTool === 'draw' || activeTool === 'sign' ? 'cursor-crosshair' : '',
            activeTool === 'text' ? 'cursor-text' : '',
            activeTool === 'image' ? 'cursor-cell' : ''
          )}
          onClick={handleClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* SVG overlay for drawings */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {renderDrawAnnotations()}
            {drawing && currentPath.length > 1 && (
              <polyline
                points={currentPath.map((p) => `${p.x * scale},${p.y * scale}`).join(' ')}
                fill="none"
                stroke={activeTool === 'sign' ? '#1a1a2e' : '#2563eb'}
                strokeWidth={activeTool === 'sign' ? 2 : 3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>

          {/* Text annotations */}
          {pageAnnotations
            .filter((a): a is TextAnnotation => a.type === 'text')
            .map((ann) => (
              <div
                key={ann.id}
                className="absolute group"
                style={{
                  left: ann.x * scale,
                  top: ann.y * scale,
                  fontSize: ann.fontSize * scale,
                  color: ann.color,
                }}
              >
                {editingText === ann.id ? (
                  <textarea
                    ref={textInputRef}
                    defaultValue={ann.text}
                    className="min-w-[100px] bg-primary/5 border border-primary/30 rounded px-1 py-0.5 outline-none resize-both text-foreground"
                    style={{ fontSize: ann.fontSize * scale }}
                    onBlur={(e) => {
                      const val = e.target.value.trim();
                      if (!val) {
                        onRemoveAnnotation(ann.id);
                      } else {
                        ann.text = val;
                      }
                      setEditingText(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        (e.target as HTMLTextAreaElement).blur();
                      }
                    }}
                    autoFocus
                  />
                ) : (
                  <span
                    className="whitespace-pre-wrap cursor-pointer hover:bg-primary/10 rounded px-0.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (activeTool === 'select') {
                        onRemoveAnnotation(ann.id);
                      } else {
                        setEditingText(ann.id);
                      }
                    }}
                  >
                    {ann.text || ' '}
                  </span>
                )}
              </div>
            ))}

          {/* Image annotations */}
          {pageAnnotations
            .filter((a) => a.type === 'image')
            .map((ann) => (
              <img
                key={ann.id}
                src={(ann as any).dataUrl}
                alt="annotation"
                className="absolute cursor-pointer border-2 border-transparent hover:border-primary/50 rounded"
                style={{
                  left: (ann as any).x * scale,
                  top: (ann as any).y * scale,
                  width: (ann as any).width * scale,
                  height: (ann as any).height * scale,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (activeTool === 'select') onRemoveAnnotation(ann.id);
                }}
              />
            ))}
        </div>
      </div>
    </div>
  );
}
