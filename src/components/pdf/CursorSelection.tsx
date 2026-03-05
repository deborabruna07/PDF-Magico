import { Sparkles } from 'lucide-react';

const PAWS = [
  { id: 1, name: 'Branquinha', src: './patinha 1.png' },
  { id: 2, name: 'Malhada', src: './patinha 2.png' },
  { id: 3, name: 'Tigrada', src: './patinha 3.png' },
  { id: 4, name: 'Rosinha', src: './patinha 4.png' },
  { id: 5, name: 'Pretinha', src: './patinha 5.png' },
  { id: 6, name: 'Caramelo', src: './patinha 6.png' },
  { id: 7, name: 'Tricolor', src: './patinha 7.png' },
  { id: 8, name: 'Noturna', src: './patinha 8.png' },
  { id: 9, name: 'Siamesa', src: './patinha 9.png' },
  { id: 10, name: 'Cinzinha', src: './patinha 10.png' },
];

interface CursorSelectionProps {
  onSelect: (cursorSrc: string) => void;
}

export function CursorSelection({ onSelect }: CursorSelectionProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-rose-50/50 relative overflow-hidden"
         style={{ backgroundImage: 'radial-gradient(#fbcfe8 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}>
      
      <div className="bg-white/80 backdrop-blur-md p-10 rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(244,114,182,0.3)] max-w-3xl w-full mx-4 border-2 border-pink-100 animate-in zoom-in-95 duration-500 flex flex-col items-center">
        
        <div className="flex items-center gap-3 mb-2 animate-float">
          <Sparkles className="w-8 h-8 text-pink-400" />
          <h1 className="text-3xl font-bold text-pink-500 text-glow text-center">Escolha a sua Patinha!</h1>
          <Sparkles className="w-8 h-8 text-pink-400" />
        </div>
        
        <p className="text-pink-600/80 mb-8 font-medium text-center">
          Quem vai te ajudar na edição de PDFs hoje?
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-6 w-full">
          {PAWS.map((paw) => (
            <button
              key={paw.id}
              onClick={() => onSelect(paw.src)}
              className="group flex flex-col items-center gap-3 p-4 rounded-2xl border-2 border-transparent hover:border-pink-300 hover:bg-pink-50 transition-all hover-wiggle glow-pink"
            >
              <div className="w-16 h-16 flex items-center justify-center bg-white rounded-full shadow-sm group-hover:shadow-md transition-shadow">
                <img src={paw.src} alt={paw.name} className="w-10 h-10 object-contain group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-sm font-bold text-pink-900/70 group-hover:text-pink-500 transition-colors">
                {paw.name}
              </span>
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}