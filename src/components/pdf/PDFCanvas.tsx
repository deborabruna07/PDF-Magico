import { useEffect, useRef, useState, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
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
}

export function PDFCanvas({
  pdfDoc, pageIndex, activeTool, annotations, onAddAnnotation, onRemoveAnnotation, onUpdateAnnotation,
  drawColor = '#2563eb', drawWidth = 3, userZoom = 1
}: PDFCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [drawing, setDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  
  const [editingText, setEditingText] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [dragInfo, setDragInfo] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);

  // Renderiza a página
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

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      setCanvasSize({ width: viewport.width, height: viewport.height });
      setScale(finalScale);

      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
    })();
    return () => { cancelled = true; };
  }, [pdfDoc, pageIndex, userZoom]);

  const pageAnnotations = annotations.filter((a) => a.pageIndex === pageIndex);

  const getRelativePos = useCallback((e: React.MouseEvent) => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale };
  }, [scale]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (editingText) {
      const currentAnn = annotations.find(a => a.id === editingText) as TextAnnotation;
      if (currentAnn && (!currentAnn.text || !currentAnn.text.trim()) && !currentAnn.backgroundColor) {
        onRemoveAnnotation(editingText);
      }
      setEditingText(null); 
      return; 
    }

    if (selectedImage) {
      setSelectedImage(null);
      return;
    }

    if (activeTool === 'text' || activeTool === 'edit-text') {
      const pos = getRelativePos(e);
      const id = crypto.randomUUID();
      onAddAnnotation({
        id, type: 'text', pageIndex, x: pos.x, y: pos.y, text: '', fontSize: 16, color: '#1a1a2e',
        backgroundColor: activeTool === 'edit-text' ? '#ffffff' : undefined,
        fontFamily: 'Helvetica', 
      });
      setEditingText(id);
    } else if (activeTool === 'image') {
      const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*';
      input.onchange = async () => {
        if (!input.files?.[0]) return;
        const reader = new FileReader();
        reader.onload = () => {
          const id = crypto.randomUUID();
          onAddAnnotation({ id, type: 'image', pageIndex, x: getRelativePos(e).x, y: getRelativePos(e).y, width: 150, height: 150, dataUrl: reader.result as string });
          setSelectedImage(id);
        };
        reader.readAsDataURL(input.files[0]);
      };
      input.click();
    }
  }, [activeTool, pageIndex, getRelativePos, onAddAnnotation, editingText, selectedImage, annotations, onRemoveAnnotation]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (activeTool === 'draw' || activeTool === 'sign') { setDrawing(true); setCurrentPath([getRelativePos(e)]); }
  }, [activeTool, getRelativePos]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (drawing) setCurrentPath((prev) => [...prev, getRelativePos(e)]);
    else if (dragInfo) onUpdateAnnotation(dragInfo.id, { x: getRelativePos(e).x - dragInfo.offsetX, y: getRelativePos(e).y - dragInfo.offsetY }, true);
  }, [drawing, dragInfo, getRelativePos, onUpdateAnnotation]);

  const handleMouseUp = useCallback(() => {
    if (drawing && currentPath.length > 1) {
      onAddAnnotation({
        id: crypto.randomUUID(), type: 'draw', pageIndex, paths: currentPath, 
        color: activeTool === 'sign' ? '#1a1a2e' : drawColor,
        lineWidth: activeTool === 'sign' ? 2 : drawWidth,
      });
    }
    setDrawing(false); setCurrentPath([]); setDragInfo(null);
  }, [drawing, currentPath, pageIndex, activeTool, onAddAnnotation, drawColor, drawWidth]);

  return (
    <div className="pdf-canvas-container flex-1 overflow-auto bg-canvas-bg p-10">
      <div className="relative shadow-xl rounded-sm mx-auto" style={{ width: canvasSize.width, height: canvasSize.height }}>
        <canvas ref={canvasRef} className="rounded-sm bg-canvas-page" />
        <div ref={overlayRef} className={cn('absolute inset-0', (activeTool === 'draw' || activeTool === 'sign') && 'cursor-crosshair', (activeTool === 'text' || activeTool === 'edit-text') && 'cursor-text', activeTool === 'image' && 'cursor-cell')} onClick={handleClick} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
          
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {pageAnnotations.filter((a): a is DrawAnnotation => a.type === 'draw').map((d) => (
              <g key={d.id} onClick={() => activeTool === 'select' && onRemoveAnnotation(d.id)} className="cursor-pointer pointer-events-auto">
                <polyline points={d.paths.map((p) => `${p.x * scale},${p.y * scale}`).join(' ')} fill="none" stroke={d.color} strokeWidth={d.lineWidth || 3} strokeLinecap="round" strokeLinejoin="round" />
              </g>
            ))}
            {drawing && currentPath.length > 1 && (
              <polyline points={currentPath.map((p) => `${p.x * scale},${p.y * scale}`).join(' ')} fill="none" stroke={activeTool === 'sign' ? '#1a1a2e' : drawColor} strokeWidth={activeTool === 'sign' ? 2 : drawWidth} strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>

          {/* IMAGENS */}
          {pageAnnotations.filter((a): a is ImageAnnotation => a.type === 'image').map((ann) => (
            <div key={ann.id} className="absolute group" style={{ left: ann.x * scale, top: ann.y * scale, zIndex: selectedImage === ann.id ? 50 : 10 }} onClick={(e) => { e.stopPropagation(); if (activeTool === 'select') { setSelectedImage(ann.id); setEditingText(null); } }} onMouseDown={(e) => { if (activeTool === 'select') { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); const isResizeClick = (e.clientX - rect.left) > (rect.width - 30) && (e.clientY - rect.top) > (rect.height - 30); setSelectedImage(ann.id); setEditingText(null); if (!isResizeClick) { setDragInfo({ id: ann.id, offsetX: getRelativePos(e).x - ann.x, offsetY: getRelativePos(e).y - ann.y }); } } }}>
              {selectedImage === ann.id && (
                <div className="absolute bottom-full left-0 mb-2 flex items-center gap-2 bg-white shadow-xl border border-gray-200 p-2 rounded-lg z-50 pointer-events-auto" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => { onRemoveAnnotation(ann.id); setSelectedImage(null); }} className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors flex items-center justify-center font-medium text-sm" title="Apagar Imagem"><Trash2 className="w-4 h-4 mr-1" /> Apagar</button>
                </div>
              )}
              <div className={cn("relative block", selectedImage === ann.id ? "border-2 border-primary border-dashed shadow-sm bg-primary/10" : "border-2 border-transparent hover:border-primary/50", activeTool === 'select' ? "cursor-move" : "cursor-default")} style={{ resize: selectedImage === ann.id ? 'both' : 'none', overflow: 'hidden', width: `${ann.width * scale}px`, height: `${ann.height * scale}px`, minWidth: '30px', minHeight: '30px' }} onMouseUp={(e) => { if (selectedImage === ann.id) { const target = e.currentTarget as HTMLDivElement; onUpdateAnnotation(ann.id, { width: target.offsetWidth / scale, height: target.offsetHeight / scale }); } }}>
                <img src={ann.dataUrl} alt="annotation" className="w-full h-full object-fill pointer-events-none" draggable={false} />
                {selectedImage === ann.id && <div className="absolute bottom-0 right-0 w-5 h-5 bg-primary/60 rounded-tl-full pointer-events-none" title="Puxe aqui para redimensionar" />}
              </div>
            </div>
          ))}

          {/* TEXTOS */}
          {pageAnnotations.filter((a): a is TextAnnotation => a.type === 'text').map((ann) => (
            <div key={ann.id} className="absolute group" style={{ left: ann.x * scale, top: ann.y * scale, zIndex: editingText === ann.id ? 50 : 10 }} onMouseDown={(e) => { if (activeTool === 'select' && editingText !== ann.id) { e.stopPropagation(); setDragInfo({ id: ann.id, offsetX: getRelativePos(e).x - ann.x, offsetY: getRelativePos(e).y - ann.y }); } }}>
              {editingText === ann.id ? (
                <div className="relative">
                  <div className="absolute bottom-full left-0 mb-2 flex items-center gap-2 bg-white shadow-xl border border-gray-200 p-2 rounded-lg z-50 pointer-events-auto" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                    
                    <input type="color" value={ann.color} onChange={(e) => onUpdateAnnotation(ann.id, { color: e.target.value })} className="w-7 h-7 cursor-pointer rounded border-0 p-0" title="Cor do Texto" />
                    
                    {/* CORREÇÃO: min-w-[140px] para caber o nome todo da fonte sem cortar */}
                    <select 
                      value={ann.fontFamily || 'Helvetica'} 
                      onChange={(e) => onUpdateAnnotation(ann.id, { fontFamily: e.target.value })}
                      className="h-7 border border-gray-200 rounded px-1.5 text-sm bg-gray-100 outline-none cursor-pointer min-w-[140px]"
                      title="Tipo de Letra"
                    >
                      <optgroup label="Padrão PDF">
                        <option value="Helvetica" style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>Helvetica / Arial</option>
                        <option value="Times New Roman" style={{ fontFamily: '"Times New Roman", Times, serif' }}>Times New Roman</option>
                        <option value="Courier" style={{ fontFamily: 'Courier, monospace' }}>Courier</option>
                      </optgroup>
                      <optgroup label="Google Fontes">
                        <option value="Roboto">Roboto</option>
                        <option value="Montserrat">Montserrat</option>
                        <option value="Oswald">Oswald (Estilo Impact)</option>
                        <option value="Comic Neue">Comic Neue (Estilo Comic Sans)</option>
                      </optgroup>
                      </select>

                    <div className="flex items-center bg-gray-100 rounded px-2 h-7 border border-gray-200">
                      <input type="number" value={ann.fontSize} onChange={(e) => onUpdateAnnotation(ann.id, { fontSize: Number(e.target.value) })} className="w-12 bg-transparent border-none outline-none text-sm text-black text-center font-medium" title="Tamanho da Fonte" min="8" max="100" />
                      <span className="text-xs text-gray-500 font-medium">px</span>
                    </div>
                    
                    <div className="w-px h-5 bg-gray-300 mx-1" />
                    <button onClick={() => { onRemoveAnnotation(ann.id); setEditingText(null); }} className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors flex items-center justify-center" title="Apagar"><Trash2 className="w-4 h-4" /></button>
                  </div>

                  {/* CORREÇÃO: lineHeight e padding para a letra não cortar em baixo */}
                  <textarea 
                    value={ann.text} 
                    onChange={(e) => onUpdateAnnotation(ann.id, { text: e.target.value }, true)} 
                    onMouseUp={(e) => { const t = e.target as HTMLTextAreaElement; onUpdateAnnotation(ann.id, { width: t.offsetWidth / scale, height: t.offsetHeight / scale }); }} 
                    className={cn("border-2 border-primary/50 shadow-sm rounded px-1 py-0.5 outline-none text-foreground block", ann.backgroundColor ? "bg-white" : "bg-transparent")} 
                    style={{ 
                      resize: 'both', maxWidth: 'none', overflow: 'hidden', 
                      lineHeight: '1.25', // Impede o corte inferior
                      paddingBottom: '4px', // Espaço extra
                      fontSize: ann.fontSize * scale, 
                      fontFamily: ann.fontFamily || 'Helvetica',
                      color: ann.color, 
                      minHeight: '20px', minWidth: '20px', 
                      width: ann.width ? `${ann.width * scale}px` : '120px', 
                      height: ann.height ? `${ann.height * scale}px` : '40px' 
                    }} 
                    autoFocus 
                    onClick={(e) => e.stopPropagation()} 
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); setEditingText(null); if (!ann.text.trim() && !ann.backgroundColor) onRemoveAnnotation(ann.id); } }} 
                  />
                </div>
              ) : (
                <div 
                  className={cn("whitespace-pre-wrap block px-1 py-0.5", ann.backgroundColor ? "" : "hover:bg-primary/10", activeTool === 'select' ? "cursor-move" : "cursor-text")} 
                  style={{ 
                    lineHeight: '1.25', // Impede o corte inferior
                    paddingBottom: '4px', // Espaço extra
                    fontSize: ann.fontSize * scale,
                    color: ann.color,
                    fontFamily: ann.fontFamily || 'Helvetica',
                    backgroundColor: ann.backgroundColor ? ann.backgroundColor : 'transparent',
                    minWidth: '20px', minHeight: '20px', 
                    width: ann.width ? `${ann.width * scale}px` : '120px', 
                    height: ann.height ? `${ann.height * scale}px` : '40px', 
                    overflow: 'hidden', wordBreak: 'break-word' 
                  }} 
                  onClick={(e) => { e.stopPropagation(); if (activeTool !== 'select') { if (editingText) { const prevAnn = annotations.find(a => a.id === editingText) as TextAnnotation; if (prevAnn && (!prevAnn.text || !prevAnn.text.trim()) && !prevAnn.backgroundColor) onRemoveAnnotation(editingText); } setEditingText(ann.id); } }}
                >
                  {ann.text}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}