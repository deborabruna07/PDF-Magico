import { useCallback, useRef } from 'react';
import { Upload, FileText } from 'lucide-react';

interface UploadScreenProps {
  onFileSelect: (file: File) => void;
}

export function UploadScreen({ onFileSelect }: UploadScreenProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file?.type === 'application/pdf') onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect]
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div
        className="flex w-full max-w-lg flex-col items-center gap-6 rounded-2xl border-2 border-dashed border-primary/30 bg-card p-12 text-center transition-colors hover:border-primary/60 cursor-pointer animate-fade-in"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
          <Upload className="h-10 w-10 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Editor de PDF</h1>
          <p className="mt-2 text-muted-foreground">
            Arraste seu PDF aqui ou clique para selecionar
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-2 text-sm text-muted-foreground">
          <FileText className="h-4 w-4" />
          <span>Suporta arquivos .pdf</span>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={handleChange}
        />
      </div>
    </div>
  );
}
