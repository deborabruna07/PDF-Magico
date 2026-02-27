import { UploadCloud, Sparkles, FileHeart } from 'lucide-react';
import { useRef } from 'react';

interface UploadScreenProps {
  onFileSelect: (file: File) => void;
}

export function UploadScreen({ onFileSelect }: UploadScreenProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file); 
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === 'application/pdf') {
      onFileSelect(file);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-rose-50/50 relative overflow-hidden"
         style={{ backgroundImage: 'radial-gradient(#fbcfe8 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}>
      
      {/* Container relativo para posicionar o gatinho em relação à caixa */}
      <div className="relative w-full max-w-2xl mx-4">
        
        {/* ✨ GATINHO: Posicionado exatamente em cima da borda rosa */}
        <img 
          src="gatinho.png" 
          alt="Gatinho fofo"
          className="absolute -top-[150px] left-1/2 -translate-x-1/2 w-48 h-auto z-30 pointer-events-none drop-shadow-md"
        />

        {/* 📦 PAINEL CENTRAL: Com a borda rosa simples solicitada */}
        <div className="relative z-20 bg-white/90 backdrop-blur-md p-10 rounded-[2rem] shadow-[0_10px_40px_-10px_rgba(244,114,182,0.2)] border-4 border-pink-200 flex flex-col items-center text-center transition-all duration-300">
          
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-8 h-8 text-pink-400" />
            <h1 className="text-4xl font-bold text-pink-500 text-glow">Bem-vinda ao PDF Mágico!</h1>
            <Sparkles className="w-8 h-8 text-pink-400" />
          </div>
          
          <p className="text-pink-600/80 mb-8 font-medium text-lg">
            Traga o seu documento e vamos deixá-lo perfeito.
          </p>

          {/* CAIXA PONTILHADA INTERNA (Seu layout original mantido) */}
          <div 
            onClick={handleClick}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="group w-full border-4 border-dashed border-pink-200 bg-pink-50/30 hover:bg-pink-50/80 hover:border-pink-300 rounded-3xl p-14 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 shadow-[inset_0_0_20px_rgba(244,114,182,0.15)] hover:shadow-[inset_0_0_40px_rgba(244,114,182,0.35)]"
          >
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange} 
              onClick={(e) => e.stopPropagation()}
              accept="application/pdf" 
              className="hidden" 
            />
            
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-pink-200 rounded-full blur-xl opacity-40 group-hover:opacity-70 transition-opacity"></div>
              <UploadCloud className="w-20 h-20 text-pink-400 relative z-10 group-hover:scale-110 transition-transform" />
            </div>
            
            <h3 className="text-2xl font-bold text-pink-800 mb-2">
              Clique para escolher um PDF
            </h3>
            <p className="text-pink-500/80 font-medium flex items-center gap-2">
              <FileHeart className="w-4 h-4" />
              Ou arraste o ficheiro até aqui
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}