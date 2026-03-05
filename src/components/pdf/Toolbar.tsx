import { useState } from 'react';
import { MousePointer2, Type, Pencil, Eraser, Image, Download, Undo, Redo, ZoomIn, ZoomOut, Trash2, FileEdit, HelpCircle } from 'lucide-react';
import type { Tool } from '@/types/pdf-edit';
import { cn } from '@/lib/utils';
import { CatTutorial } from './CatTutorial';

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
  { id: 'edit-text', icon: FileEdit, label: 'Corretivo' },
  { id: 'draw', icon: Pencil, label: 'Desenhar' },
  { id: 'image', icon: Image, label: 'Imagem' },
];

export function Toolbar({
  activeTool, onToolChange, onDownload, hasAnnotations, drawColor, onDrawColorChange,
  drawWidth, onDrawWidthChange, zoom, onZoomIn, onZoomOut, canUndo, canRedo, onUndo, onRedo, onClearAll
}: ToolbarProps) {
  const [showTutorial, setShowTutorial] = useState(false);

  return (
    <div className="flex items-center justify-between border-b border-pink-100 bg-white/90 backdrop-blur-md px-5 py-2.5 flex-wrap gap-2 relative z-20 shadow-sm">
      
      {/* Ferramentas Principais */}
      <div className="flex items-center gap-1.5">
        {tools.map(({ id, icon: Icon, label }) => {
          const isActive = activeTool === id;
          return (
            <button 
              key={id} 
              id={`btn-tool-${id}`}
              onClick={() => onToolChange(id)} 
              title={label}
              className={cn(
                'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-all active:scale-95 hover-wiggle',
                isActive 
                  ? 'bg-pink-400 text-white shadow-sm' 
                  : 'text-pink-400 hover:bg-pink-50 hover:text-pink-600'
              )}
            >
              <Icon className={cn("h-4 w-4", isActive ? "stroke-[2.5]" : "stroke-2")} />
              <span className="hidden xl:inline">{label}</span>
            </button>
          );
        })}
        
        {/* Controles Dinâmicos do Lápis */}
        {activeTool === 'draw' && onDrawWidthChange && (
          <div className="flex items-center gap-2 ml-1 pl-3 border-l-2 border-pink-100 animate-in fade-in slide-in-from-left-2 duration-200">
            
            <button 
              id="btn-tool-eraser"
              onClick={() => onDrawColorChange?.(drawColor === 'eraser' ? '#f472b6' : 'eraser')}
              className={cn(
                "p-2 rounded-xl border-2 transition-all active:scale-95",
                drawColor === 'eraser' 
                  ? "bg-pink-100 border-pink-400 text-pink-600" 
                  : "bg-white border-pink-100 text-pink-400 hover:bg-pink-50 hover:border-pink-200"
              )}
              title={drawColor === 'eraser' ? "Usando Borracha" : "Usar Borracha"}
            >
              <Eraser className="h-4 w-4" />
            </button>

            {/* ✨ Seletor de Cor Totalmente Preenchido */}
            {drawColor !== 'eraser' && onDrawColorChange && (
              <div 
                className="relative w-8 h-8 rounded-full border-2 border-pink-200 shadow-sm hover:scale-105 transition-transform overflow-hidden shrink-0 cursor-pointer"
                style={{ backgroundColor: drawColor === 'eraser' ? '#f472b6' : drawColor }}
                title="Escolher Cor"
              >
                <input 
                  type="color" 
                  value={drawColor === 'eraser' ? '#f472b6' : drawColor} 
                  onChange={(e) => onDrawColorChange(e.target.value)} 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                />
              </div>
            )}
            
            <div className="flex flex-col ml-1 w-24">
              <span className="text-[10px] text-pink-500 font-bold mb-0.5 uppercase tracking-wider">Espessura: {drawWidth}px</span>
              <input 
                type="range" min="1" max="50" 
                value={drawWidth} 
                onChange={(e) => onDrawWidthChange(Number(e.target.value))} 
                className="cursor-pointer h-1.5 accent-pink-400 bg-pink-100 rounded-lg appearance-none outline-none" 
              />
            </div>
          </div>
        )}
      </div>

      {/* Navegação (Zoom e Histórico) */}
      <div className="flex items-center gap-1 border-l-2 border-r-2 border-pink-100 px-3">
        <button onClick={onUndo} disabled={!canUndo} className="p-2 rounded-xl text-pink-400 hover:text-pink-600 hover:bg-pink-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors hover-wiggle" title="Desfazer"><Undo className="h-4 w-4" /></button>
        <button onClick={onRedo} disabled={!canRedo} className="p-2 rounded-xl text-pink-400 hover:text-pink-600 hover:bg-pink-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors hover-wiggle" title="Refazer"><Redo className="h-4 w-4" /></button>
        
        <div className="w-0.5 h-5 bg-pink-100 mx-1 rounded-full" />
        
        <button onClick={onZoomOut} className="p-2 rounded-xl text-pink-400 hover:text-pink-600 hover:bg-pink-50 transition-colors hover-wiggle" title="Menos Zoom"><ZoomOut className="h-4 w-4" /></button>
        <span className="text-sm font-bold w-12 text-center text-pink-600">{Math.round(zoom * 100)}%</span>
        <button onClick={onZoomIn} className="p-2 rounded-xl text-pink-400 hover:text-pink-600 hover:bg-pink-50 transition-colors hover-wiggle" title="Mais Zoom"><ZoomIn className="h-4 w-4" /></button>
      </div>

      {/* Ações (Ajuda, Limpar e Baixar) */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowTutorial(true)}
          title="Ajuda / Tutorial"
          className="p-2 rounded-xl text-pink-400 hover:text-pink-600 hover:bg-pink-50 transition-colors hover-wiggle"
        >
          <HelpCircle className="h-5 w-5" />
        </button>

        {hasAnnotations && (
          <button 
            onClick={onClearAll} 
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors hover-wiggle active:scale-95"
          >
            <Trash2 className="h-4 w-4" /><span className="hidden sm:inline">Limpar</span>
          </button>
        )}
        
        <button 
          onClick={onDownload} 
          className="flex items-center gap-1.5 rounded-xl bg-pink-500 px-5 py-2 text-sm font-bold text-white hover:bg-pink-600 transition-all shadow-sm hover:shadow-md hover-wiggle active:scale-95"
        >
          <Download className="h-4 w-4" /><span>Baixar PDF</span>
        </button>
      </div>

      <CatTutorial isActive={showTutorial} onClose={() => setShowTutorial(false)} />
    </div>
  );
}