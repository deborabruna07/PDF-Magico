import { useEffect, useRef, useState, useCallback } from 'react';
import { Trash2, RotateCw, Bold } from 'lucide-react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { Annotation, Tool, TextAnnotation, DrawAnnotation, ImageAnnotation } from '@/types/pdf-editor';
import { cn } from '@/lib/utils';

interface PDFCanvasProps {
  pdfDoc: PDFDocumentProxy;
  pageIndex: number;
  activeTool: Tool;
  annotations: Annotation[];
  onAddAnnotation: (annotation: Annotation) => void;
  onRemoveAnnotation: (id: string) => void;
  onUpdateAnnotation: (id: string, updates: Partial<Annotation>, replaceHistory?: boolean) => void;
  drawColor?: string;
  drawWidth?: number;
  userZoom?: number;
  rotation?: number;
}

export function PDFCanvas({
  pdfDoc, pageIndex, activeTool, annotations, onAddAnnotation, onRemoveAnnotation, onUpdateAnnotation,
  drawColor = '#f472b6', drawWidth = 3, userZoom = 1, rotation = 0
}: PDFCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [drawing, setDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);

  const [editingText, setEditingText] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [dragInfo, setDragInfo] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [rotatingId, setRotatingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const page = await pdfDoc.getPage(pageIndex + 1);
      const baseViewport = page.getViewport({ scale: 1 });
      const container = canvasRef.current?.closest('.pdf-canvas-container');
      if (!container || cancelled) return;

      const maxWidth = container.clientWidth - 80;
      const maxHeight = container.clientHeight - 80;
      const fitScale = Math.min(maxWidth / baseViewport.width, maxHeight / baseViewport.height, 2);
      const finalScale = fitScale * userZoom;

      const viewport = page.getViewport({ scale: finalScale });
      const canvas = canvasRef.current;
      if (!canvas || cancelled) return;

      // ✨ CORREÇÃO 1: Multiplica a qualidade pela densidade de píxeis do monitor
      const pixelRatio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * pixelRatio);
      canvas.height = Math.floor(viewport.height * pixelRatio);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      setCanvasSize({ width: viewport.width, height: viewport.height });
      setScale(finalScale);

      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Envia a escala corrigida para o renderizador do PDFJS
      const transform = pixelRatio !== 1 ? [pixelRatio, 0, 0, pixelRatio, 0, 0] : undefined;
      await page.render({ canvasContext: ctx, viewport, transform }).promise;
    })();
    return () => { cancelled = true; };
  }, [pdfDoc, pageIndex, userZoom]);

  const getRelativePos = useCallback((e: React.MouseEvent | MouseEvent) => {
    const overlay = overlayRef.current;
    if (!overlay) return { x: 0, y: 0 };
    
    const rect = overlay.getBoundingClientRect();
    
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    
    const angle = (-rotation * Math.PI) / 180;
    const rx = dx * Math.cos(angle) - dy * Math.sin(angle);
    const ry = dx * Math.sin(angle) + dy * Math.cos(angle);
    
    const isRotated = (rotation % 180) !== 0;
    const unrotatedWidth = isRotated ? rect.height : rect.width;
    const unrotatedHeight = isRotated ? rect.width : rect.height;
    
    const x = rx + unrotatedWidth / 2;
    const y = ry + unrotatedHeight / 2;
    
    return { x: x / scale, y: y / scale };
  }, [scale, rotation]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const pos = getRelativePos(e);

    if (rotatingId) {
      const ann = annotations.find(a => a.id === rotatingId);
      if (ann && 'x' in ann) {
        const w = 'width' in ann ? (ann.width || 120) : 120;
        const h = 'height' in ann ? (ann.height || 40) : 40;
        const centerX = ann.x + w / 2;
        const centerY = ann.y + h / 2;
        const dx = pos.x - centerX;
        const dy = pos.y - centerY;
        let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;

        const snap = 5;
        if (Math.abs(angle % 90) < snap || Math.abs(angle % 90) > 90 - snap) {
          angle = Math.round(angle / 90) * 90;
        }
        onUpdateAnnotation(rotatingId, { rotation: angle }, true);
      }
      return;
    }

    if (drawing) {
      if (activeTool === 'draw' && drawColor === 'eraser') {
        const radius = Math.max(drawWidth, 15) / scale;
        annotations.forEach(a => {
          if (a.type === 'draw' && a.pageIndex === pageIndex) {
            let modified = false;
            const newPaths = a.paths.map(p => {
              if (p.erased) return p;
              const dx = p.x - pos.x;
              const dy = p.y - pos.y;
              if (Math.sqrt(dx*dx + dy*dy) <= radius) {
                modified = true;
                return { ...p, erased: true };
              }
              return p;
            });
            if (modified) onUpdateAnnotation(a.id, { paths: newPaths }, true);
          }
        });
      } else {
        setCurrentPath((prev) => [...prev, pos]);
      }
    } else if (dragInfo) {
      onUpdateAnnotation(dragInfo.id, {
        x: pos.x - dragInfo.offsetX,
        y: pos.y - dragInfo.offsetY
      }, true);
    }
  }, [drawing, dragInfo, rotatingId, annotations, getRelativePos, onUpdateAnnotation, activeTool, drawColor, drawWidth, pageIndex]);

  const handleMouseUp = useCallback(() => {
    if (drawing && currentPath.length > 1 && drawColor !== 'eraser') {
      onAddAnnotation({
        id: crypto.randomUUID(), 
        type: 'draw', 
        pageIndex, 
        paths: currentPath, 
        color: activeTool === 'sign' ? '#f472b6' : drawColor, 
        lineWidth: activeTool === 'sign' ? 2 : drawWidth,
      });
    }
    setDrawing(false); 
    setCurrentPath([]); 
    setDragInfo(null);
    setRotatingId(null);
  }, [drawing, currentPath, pageIndex, activeTool, onAddAnnotation, drawColor, drawWidth]);

  const isTextSelectable = activeTool === 'select' || activeTool === 'text' || activeTool === 'edit-text';
  const isImageSelectable = activeTool === 'select' || activeTool === 'image';

  return (
    <div className={cn(
      "pdf-canvas-container flex-1 overflow-auto scrollbar-thin bg-rose-50/40 p-10 transition-colors duration-500 relative",
      (activeTool === 'draw' || activeTool === 'sign' || drawing) && "select-none"
    )}>
      
      {activeTool === 'image' && (
        <div className="sticky top-4 left-1/2 -translate-x-1/2 mx-auto w-max bg-white/95 backdrop-blur-sm border-2 border-pink-300 text-pink-600 px-6 py-3 rounded-full shadow-[0_10px_40px_-10px_rgba(244,114,182,0.4)] z-[200] flex items-center gap-3 animate-in slide-in-from-top-4 fade-in duration-300 pointer-events-none">
          <span className="text-2xl animate-bounce">≽^•⩊•^≼</span>
          <span className="font-bold text-sm">Miaau! Clica em qualquer lugar da página para escolher a tua imagem!</span>
        </div>
      )}

      {/* ✨ CORREÇÃO 2: translateZ(0) e backfaceVisibility forçam a aceleração de hardware e removem o blur na rotação */}
      <div className="relative shadow-[0_20px_50px_-12px_rgba(244,114,182,0.15)] rounded-2xl mx-auto transition-all duration-300 mt-4" 
           style={{ 
             width: canvasSize.width, 
             height: canvasSize.height, 
             transform: `rotate(${rotation}deg) translateZ(0)`,
             backfaceVisibility: 'hidden',
             WebkitFontSmoothing: 'antialiased' as const
           }}>
        <canvas ref={canvasRef} className="rounded-2xl bg-white" />
        <div
          ref={overlayRef}
          className={cn(
            'absolute inset-0',
            (activeTool === 'draw' || activeTool === 'sign') && 'cursor-crosshair',
            (activeTool === 'text' || activeTool === 'edit-text') && 'cursor-text',
            activeTool === 'image' && 'cursor-cell',
            rotatingId && 'cursor-grabbing'
          )}
          onClick={(e) => {
            if (editingText) {
              const currentAnn = annotations.find(a => a.id === editingText) as TextAnnotation;
              if (currentAnn && (!currentAnn.text || !currentAnn.text.trim()) && !currentAnn.backgroundColor) {
                onRemoveAnnotation(editingText);
              }
              setEditingText(null);
              return;
            }
            if (selectedElement) { setSelectedElement(null); return; }

            if (activeTool === 'text' || activeTool === 'edit-text') {
              const pos = getRelativePos(e);
              const id = crypto.randomUUID();
              onAddAnnotation({
                id, type: 'text', pageIndex, x: pos.x, y: pos.y, text: '', fontSize: 16, color: '#4c1d95',
                backgroundColor: activeTool === 'edit-text' ? '#ffffff' : undefined,
                fontFamily: 'Helvetica', rotation: -rotation, fontWeight: 'normal',
                width: 120, height: 30
              });
              setEditingText(id);
            } else if (activeTool === 'image') {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.onchange = async () => {
                if (!input.files?.[0]) return;
                const reader = new FileReader();
                reader.onload = () => {
                  const id = crypto.randomUUID();
                  onAddAnnotation({ id, type: 'image', pageIndex, x: getRelativePos(e).x, y: getRelativePos(e).y, width: 150, height: 150, dataUrl: reader.result as string, rotation: -rotation });
                  setSelectedElement(id);
                };
                reader.readAsDataURL(input.files[0]);
              };
              input.click();
            }
          }}
          onMouseDown={(e) => {
            if (activeTool === 'draw' || activeTool === 'sign') {
              e.preventDefault(); 
              setDrawing(true);
              const pos = getRelativePos(e);

              if (activeTool === 'draw' && drawColor === 'eraser') {
                const radius = Math.max(drawWidth, 15) / scale;
                annotations.forEach(a => {
                  if (a.type === 'draw' && a.pageIndex === pageIndex) {
                    let modified = false;
                    const newPaths = a.paths.map(p => {
                      if (p.erased) return p;
                      const dx = p.x - pos.x;
                      const dy = p.y - pos.y;
                      if (Math.sqrt(dx*dx + dy*dy) <= radius) {
                        modified = true;
                        return { ...p, erased: true };
                      }
                      return p;
                    });
                    if (modified) onUpdateAnnotation(a.id, { paths: newPaths }, true);
                  }
                });
              } else {
                setCurrentPath([pos]);
              }
            }
          }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div className={cn(
            "absolute inset-0 z-10", 
            (drawing || activeTool === 'draw' || activeTool === 'sign') && "pointer-events-none"
          )}>
            {annotations.filter((a): a is ImageAnnotation | TextAnnotation => (a.type === 'image' || a.type === 'text') && a.pageIndex === pageIndex).map((ann) => {
              const isSelected = selectedElement === ann.id || editingText === ann.id;

              return (
                <div
                  key={ann.id}
                  className="absolute"
                  style={{
                    left: ann.x * scale, top: ann.y * scale,
                    zIndex: isSelected ? 50 : 10,
                    transform: `rotate(${ann.rotation || 0}deg)`,
                    transformOrigin: 'center center'
                  }}
                >
                  {editingText === ann.id && ann.type === 'text' && (
                    <img
                      src="gatinho-text.png"
                      alt="Gatinho"
                      className="absolute -top-[48px] left-0 w-24 h-auto z-[60] pointer-events-none drop-shadow-md animate-in fade-in slide-in-from-bottom-4 duration-300"
                    />
                  )}

                  {isSelected && (
                    <>
                      <div
                        className={cn("absolute left-1/2 -top-10 -translate-x-1/2 flex flex-col items-center cursor-alias group", (activeTool === 'draw' || activeTool === 'sign') ? "pointer-events-none" : "pointer-events-auto")}
                        onMouseDown={(e) => { e.stopPropagation(); setRotatingId(ann.id); }}
                      >
                        <div className="w-0.5 h-4 bg-pink-300 group-hover:bg-pink-400 transition-colors rounded-full" />
                        <div className="w-5 h-5 bg-white border-2 border-pink-400 rounded-full shadow-sm flex items-center justify-center group-hover:scale-110 group-hover:bg-pink-50 transition-all">
                          <div className="w-1.5 h-1.5 bg-pink-400 rounded-full" />
                        </div>
                      </div>

                      <div
                        className={cn("absolute left-full ml-4 top-0 flex items-center gap-2 bg-white shadow-[0_8px_30px_rgb(244,114,182,0.12)] border border-pink-100 p-1.5 rounded-2xl z-50", (activeTool === 'draw' || activeTool === 'sign') ? "pointer-events-none" : "pointer-events-auto")}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {ann.type === 'text' && activeTool !== 'select' && (
                          <div className="flex items-center gap-2 border-r border-pink-100 pr-2 mr-1">
                            <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-pink-200 shadow-sm hover:scale-110 transition-transform flex items-center justify-center bg-white relative">
                              <input
                                type="color"
                                value={ann.color}
                                onChange={(e) => onUpdateAnnotation(ann.id, { color: e.target.value })}
                                className="absolute w-[200%] h-[200%] cursor-pointer border-none p-0 bg-transparent"
                                style={{ backgroundColor: 'transparent' }}
                              />
                            </div>
                            <input
                              type="number"
                              min="8"
                              max="72"
                              value={ann.fontSize}
                              onChange={(e) => onUpdateAnnotation(ann.id, { fontSize: parseInt(e.target.value) })}
                              className="w-11 h-7 text-[13px] font-medium border-pink-200 text-pink-700 border-2 border-pink-100 rounded-full text-center outline-none focus:border-pink-300 transition-all bg-white"
                            />
                            <button onClick={() => onUpdateAnnotation(ann.id, { fontWeight: ann.fontWeight === 'bold' ? 'normal' : 'bold' })}
                              className={cn("w-7 h-7 flex items-center justify-center rounded-lg border transition-all",
                                ann.fontWeight === 'bold' ? "bg-pink-100 border-pink-300 text-pink-700" : "bg-white border-pink-300 text-pink-500 hover:bg-pink-50")}>
                              <Bold className="w-3.5 h-3.5" />
                            </button>
                            <select value={ann.fontFamily || 'Helvetica'} onChange={(e) => onUpdateAnnotation(ann.id, { fontFamily: e.target.value })}
                              className="h-8 text-xs border-2 border-pink-200 rounded-xl bg-white text-pink-900 font-bold px-2 outline-none appearance-none">
                              <optgroup label="☆ PADRÃO PDF ☆">
                                <option value="Helvetica">Helvetica / Arial</option>
                                <option value="Times New Roman">Times New Roman</option>
                                <option value="Courier">Courier</option>
                              </optgroup>
                              <optgroup label="☆ GOOGLE FONTS ☆">
                                <option value="Roboto">Roboto</option>
                                <option value="Montserrat">Montserrat</option>
                                <option value="Oswald">Oswald</option>
                                <option value="Comic Neue">Comic Neue</option>
                              </optgroup>
                            </select>
                          </div>
                        )}
                        <button onClick={() => { onRemoveAnnotation(ann.id); setSelectedElement(null); setEditingText(null); }} className="w-8 h-8 flex items-center justify-center hover:bg-rose-100 rounded-xl text-rose-500 hover:text-rose-700 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </>
                  )}
                  
                  {ann.type === 'image' ? (
                    <div className={cn("relative block rounded-xl transition-all", 
                        (!isImageSelectable) ? "pointer-events-none" : "pointer-events-auto cursor-move",
                        selectedElement === ann.id ? "border-2 border-pink-400 border-dashed bg-pink-400/10" : "border-2 border-transparent hover:border-pink-300/40")}
                      style={{ resize: selectedElement === ann.id ? 'both' : 'none', overflow: 'hidden', width: `${ann.width * scale}px`, height: `${ann.height * scale}px` }}
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        if (!isImageSelectable) return;
                        if (activeTool === 'select' || activeTool === 'image') setSelectedElement(ann.id); 
                      }}
                      onMouseDown={(e) => {
                        if (!isImageSelectable) return;
                        if (activeTool === 'select' || activeTool === 'image') {
                          e.stopPropagation();
                          if (activeTool === 'select') setSelectedElement(ann.id);
                          
                          const target = e.currentTarget as HTMLDivElement;
                          const rect = target.getBoundingClientRect();
                          const isResizing = selectedElement === ann.id && 
                            (e.clientX - rect.left) > rect.width - 20 && 
                            (e.clientY - rect.top) > rect.height - 20;

                          if (!isResizing) {
                            setDragInfo({ id: ann.id, offsetX: getRelativePos(e).x - ann.x, offsetY: getRelativePos(e).y - ann.y });
                          }
                        }
                      }}
                      onMouseUp={(e) => { if (selectedElement === ann.id) { const target = e.currentTarget as HTMLDivElement; onUpdateAnnotation(ann.id, { width: target.offsetWidth / scale, height: target.offsetHeight / scale }); } }} >
                      <img src={ann.dataUrl} alt="ann" className="w-full h-full object-fill pointer-events-none rounded-lg" draggable={false} />
                    </div>
                  ) : (
                    <div className={cn("transition-all", (!isTextSelectable) ? "pointer-events-none" : "pointer-events-auto")} onMouseDown={(e) => { if (!isTextSelectable) return; if (activeTool === 'select' && editingText !== ann.id) { e.stopPropagation(); setDragInfo({ id: ann.id, offsetX: getRelativePos(e).x - ann.x, offsetY: getRelativePos(e).y - ann.y }); } }}>
                      {editingText === ann.id ? (
                        <textarea value={ann.text} onChange={(e) => onUpdateAnnotation(ann.id, { text: e.target.value }, true)}
                          onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}
                          onMouseUp={(e) => {
                            e.stopPropagation();
                            const target = e.target as HTMLTextAreaElement;
                            if (target.offsetWidth && target.offsetHeight) onUpdateAnnotation(ann.id, { width: target.offsetWidth / scale, height: target.offsetHeight / scale });
                          }}
                          className={cn("rounded-xl px-0 py-0 outline-none block backdrop-blur-sm transition-all border-2 font-medium", (!isTextSelectable) ? "pointer-events-none" : "pointer-events-auto", ann.backgroundColor ? "border-pink-500 bg-white shadow-lg" : "border-pink-400 bg-white/90 shadow-md")}
                          style={{ resize: 'both', whiteSpace: 'pre', overflow: 'hidden', fontSize: ann.fontSize * scale, fontFamily: ann.fontFamily || 'Helvetica', fontWeight: ann.fontWeight || 'normal', color: ann.color, width: ann.width ? `${ann.width * scale}px` : '120px', height: ann.height ? `${ann.height * scale}px` : '30px', lineHeight: '1.1' }}
                          autoFocus onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); setEditingText(null); } }}
                        />
                      ) : (
                        <div className={cn("whitespace-pre block px-0 py-0 transition-all rounded-xl border-2 font-medium", activeTool === 'select' ? "cursor-move" : "cursor-text",
                          (!isTextSelectable) ? "pointer-events-none" : "pointer-events-auto",
                          ann.backgroundColor ? (selectedElement === ann.id && activeTool === 'select' ? "bg-white border-pink-500 border-dashed shadow-md" : "bg-white border-transparent") : (selectedElement === ann.id && activeTool === 'select' ? "border-pink-500 border-dashed bg-pink-400/20" : "border-transparent hover:border-pink-400 hover:bg-pink-50/50")
                        )}
                          style={{
                            whiteSpace: 'pre',
                            fontSize: ann.fontSize * scale,
                            color: ann.color,
                            fontFamily: ann.fontFamily || 'Helvetica',
                            fontWeight: ann.fontWeight || 'normal',
                            width: ann.width ? `${ann.width * scale}px` : 'fit-content',
                            height: ann.height ? `${ann.height * scale}px` : 'auto',
                            minWidth: ann.backgroundColor ? '20px' : 'auto',
                            minHeight: ann.backgroundColor ? '20px' : 'auto',
                            lineHeight: '1.1'
                          }}
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            if (!isTextSelectable) return;
                            if (activeTool !== 'select') { setEditingText(ann.id); setSelectedElement(null); } 
                            else { setSelectedElement(ann.id); } 
                          }} >
                          {ann.text || (ann.backgroundColor ? '' : (activeTool === 'select' ? '' : 'Clica para digitar'))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <svg className="absolute inset-0 w-full h-full pointer-events-none z-[100]">
            {annotations.filter((a): a is DrawAnnotation => a.type === 'draw' && a.pageIndex === pageIndex).map((d) => {
              let dString = '';
              let isStart = true;
              d.paths.forEach((p) => {
                if (p.erased) {
                  isStart = true;
                } else {
                  if (isStart) {
                    dString += `M ${p.x * scale} ${p.y * scale} `;
                    isStart = false;
                  } else {
                    dString += `L ${p.x * scale} ${p.y * scale} `;
                  }
                }
              });

              if (!dString.trim()) return null; 

              return (
                <path 
                  key={d.id} 
                  d={dString}
                  fill="none" 
                  stroke={d.color} 
                  strokeWidth={d.lineWidth * scale} 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className={cn("transition-opacity", (activeTool === 'draw' || activeTool === 'sign') ? "pointer-events-none" : "cursor-pointer pointer-events-auto hover:opacity-80")}
                />
              );
            })}
            
            {drawing && currentPath.length > 1 && drawColor !== 'eraser' && (
              <polyline
                points={currentPath.map((p) => `${p.x * scale},${p.y * scale}`).join(' ')}
                fill="none"
                stroke={activeTool === 'sign' ? '#f472b6' : drawColor}
                strokeWidth={drawWidth * scale}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}