import { useState } from 'react';
import { MousePointer2, Type, Pencil, Image, Download, Undo, Redo, ZoomIn, ZoomOut, Trash2, FileEdit, AlertTriangle } from 'lucide-react';
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
  
  // NOVO: Estado para controlar a visibilidade do popup
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between border-b border-toolbar-border bg-toolbar-bg px-4 py-2 flex-wrap gap-2">
        <div className="flex items-center gap-1">
          {tools.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => onToolChange(id)} title={label}
              className={cn('flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                activeTool === id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}>
              <Icon className="h-4 w-4" /><span className="hidden xl:inline">{label}</span>
            </button>
          ))}
          
          {activeTool === 'draw' && onDrawColorChange && onDrawWidthChange && (
            <div className="flex items-center gap-2 ml-2 pl-2 border-l border-border">
              <input type="color" value={drawColor || '#2563eb'} onChange={(e) => onDrawColorChange(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 p-0" title="Cor do Traço" />
              <div className="flex flex-col ml-2 w-24">
                <span className="text-[10px] text-muted-foreground leading-none mb-1">Espessura: {drawWidth}px</span>
                <input type="range" min="1" max="24" value={drawWidth} onChange={(e) => onDrawWidthChange(Number(e.target.value))} className="cursor-pointer" />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 border-l border-r border-border px-2">
          <button onClick={onUndo} disabled={!canUndo} className="p-2 rounded hover:bg-muted disabled:opacity-30" title="Desfazer (Ctrl+Z)"><Undo className="h-4 w-4" /></button>
          <button onClick={onRedo} disabled={!canRedo} className="p-2 rounded hover:bg-muted disabled:opacity-30" title="Refazer (Ctrl+Y)"><Redo className="h-4 w-4" /></button>
          <div className="w-px h-6 bg-border mx-1" />
          <button onClick={onZoomOut} className="p-2 rounded hover:bg-muted" title="Menos Zoom"><ZoomOut className="h-4 w-4" /></button>
          <span className="text-sm font-medium w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={onZoomIn} className="p-2 rounded hover:bg-muted" title="Mais Zoom"><ZoomIn className="h-4 w-4" /></button>
        </div>

        <div className="flex items-center gap-2">
          {hasAnnotations && (
            <button 
              onClick={() => setShowClearConfirm(true)} // EM VEZ DE LIMPAR LOGO, ABRE O POPUP
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors" 
              title="Apagar todas as edições"
            >
              <Trash2 className="h-4 w-4" /><span className="hidden sm:inline">Limpar Tudo</span>
            </button>
          )}
          <button onClick={onDownload} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
            <Download className="h-4 w-4" /><span>Baixar PDF</span>
          </button>
        </div>
      </div>

      {/* POPUP DE CONFIRMAÇÃO */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-background p-6 rounded-xl shadow-2xl max-w-sm w-full mx-4 border border-border">
            
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-red-100 text-red-600 rounded-full">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold">Tem certeza?</h3>
            </div>
            
            <p className="text-sm text-muted-foreground mb-6">
              Esta ação irá apagar definitivamente <strong className="text-foreground">todas as anotações, desenhos e textos</strong> que adicionou. Esta ação não pode ser desfeita.
            </p>
            
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  onClearAll();
                  setShowClearConfirm(false);
                }}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Sim, limpar tudo
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}