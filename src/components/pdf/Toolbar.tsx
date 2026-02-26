import { MousePointer2, Type, Pencil, Image, Download, Undo, Redo, ZoomIn, ZoomOut, Trash2, FileEdit } from 'lucide-react';
import type { Tool } from '@/types/pdf-editor';
import { cn } from '@/lib/utils';

interface ToolbarProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  onDownload: () => void;
  hasAnnotations: boolean;
  drawColor?: string;
  onDrawColorChange?: (color: string) => void;
  drawWidth?: number;
  onDrawWidthChange?: (width: number) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClearAll: () => void;
}

const tools: { id: Tool; icon: React.ElementType; label: string }[] = [
  { id: 'select', icon: MousePointer2, label: 'Selecionar' },
  { id: 'text', icon: Type, label: 'Adicionar Texto' },
  { id: 'edit-text', icon: FileEdit, label: 'Editar Texto' },
  { id: 'draw', icon: Pencil, label: 'Desenhar' },
  { id: 'image', icon: Image, label: 'Imagem' },
];

export function Toolbar({
  activeTool, onToolChange, onDownload, hasAnnotations, drawColor, onDrawColorChange,
  drawWidth, onDrawWidthChange, zoom, onZoomIn, onZoomOut, canUndo, canRedo, onUndo, onRedo, onClearAll
}: ToolbarProps) {
  return (
    <div className="flex items-center justify-between border-b border-pink-100 bg-white/70 backdrop-blur-md px-4 py-2 flex-wrap gap-2 relative z-20 shadow-sm">
      <div className="flex items-center gap-1">
        {tools.map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => onToolChange(id)} title={label}
            className={cn('flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover-wiggle',
              activeTool === id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}>
            <Icon className="h-4 w-4" /><span className="hidden xl:inline">{label}</span>
          </button>
        ))}
        
        {activeTool === 'draw' && onDrawColorChange && onDrawWidthChange && (
          <div className="flex items-center gap-2 ml-2 pl-2 border-l border-border animate-in fade-in zoom-in duration-200">
            <input type="color" value={drawColor || '#f472b6'} onChange={(e) => onDrawColorChange(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 p-0 hover:scale-105 transition-transform" title="Cor do Traço" />
            <div className="flex flex-col ml-2 w-24">
              <span className="text-[10px] text-muted-foreground leading-none mb-1">Espessura: {drawWidth}px</span>
              <input type="range" min="1" max="24" value={drawWidth} onChange={(e) => onDrawWidthChange(Number(e.target.value))} className="cursor-pointer" />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 border-l border-r border-border px-2">
        <button onClick={onUndo} disabled={!canUndo} className="p-2 rounded hover:bg-muted disabled:opacity-30 hover-wiggle" title="Desfazer"><Undo className="h-4 w-4" /></button>
        <button onClick={onRedo} disabled={!canRedo} className="p-2 rounded hover:bg-muted disabled:opacity-30 hover-wiggle" title="Refazer"><Redo className="h-4 w-4" /></button>
        <div className="w-px h-6 bg-border mx-1" />
        <button onClick={onZoomOut} className="p-2 rounded hover:bg-muted hover-wiggle" title="Menos Zoom"><ZoomOut className="h-4 w-4" /></button>
        <span className="text-sm font-medium w-12 text-center text-primary">{Math.round(zoom * 100)}%</span>
        <button onClick={onZoomIn} className="p-2 rounded hover:bg-muted hover-wiggle" title="Mais Zoom"><ZoomIn className="h-4 w-4" /></button>
      </div>

      <div className="flex items-center gap-2">
        {hasAnnotations && (
          <button 
            onClick={onClearAll} 
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-400 hover:text-red-500 hover:bg-red-50 transition-colors hover-wiggle"
          >
            <Trash2 className="h-4 w-4" /><span className="hidden sm:inline">Limpar Tudo</span>
          </button>
        )}
        <button onClick={onDownload} className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all glow-pink hover-wiggle">
          <Download className="h-4 w-4" /><span>Baixar PDF</span>
        </button>
      </div>
    </div>
  );
}