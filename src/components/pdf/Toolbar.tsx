import { MousePointer2, Type, Pencil, Image, Download, Undo2 } from 'lucide-react';
import type { Tool } from '@/types/pdf-editor';
import { cn } from '@/lib/utils';

interface ToolbarProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  onDownload: () => void;
  onReset: () => void;
  hasAnnotations: boolean;
}

const tools: { id: Tool; icon: React.ElementType; label: string }[] = [
  { id: 'select', icon: MousePointer2, label: 'Selecionar' },
  { id: 'text', icon: Type, label: 'Texto' },
  { id: 'draw', icon: Pencil, label: 'Desenhar' },
  { id: 'image', icon: Image, label: 'Imagem' },
];

export function Toolbar({ activeTool, onToolChange, onDownload, onReset, hasAnnotations }: ToolbarProps) {
  return (
    <div className="flex items-center justify-between border-b border-toolbar-border bg-toolbar-bg px-4 py-2">
      <div className="flex items-center gap-1">
        {tools.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => onToolChange(id)}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              activeTool === id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
            title={label}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        {hasAnnotations && (
          <button
            onClick={onReset}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Desfazer tudo"
          >
            <Undo2 className="h-4 w-4" />
            <span className="hidden sm:inline">Limpar</span>
          </button>
        )}
        <button
          onClick={onDownload}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Download className="h-4 w-4" />
          <span>Baixar PDF</span>
        </button>
      </div>
    </div>
  );
}
