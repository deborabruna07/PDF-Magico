import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CatTutorialProps {
  isActive: boolean;
  onClose: () => void;
}

const TUTORIAL_STEPS = [
  {
    id: 'intro',
    target: null, 
    title: 'Bem-vinda(o) ao PDF Mágico! ^. .^₎Ⳋ',
    text: 'Miau! Eu sou o seu assistente felino. Que tal um tour rápido para aprender a usar todas as minhas ferramentas mágicas?',
    image: '/gatinho-acenando.png'
  },
  {
    id: 'tool-select',
    target: '#btn-tool-select',
    title: 'Ferramenta Selecionar',
    text: 'Use a patinha para mover, redimensionar ou até apagar as anotações que você já fez na página!',
    image: '/gatinho-apontando.png'
  },
  {
    id: 'tool-text',
    target: '#btn-tool-text',
    title: 'Caixa de Texto',
    text: 'Precisa escrever? Selecione esta opção, depois clique em qualquer lugar da página e comece a digitar!',
    image: '/gatinho-escrevendo.png'
  },
  {
    id: 'tool-edit-text',
    target: '#btn-tool-edit-text',
    title: 'Corretivo Mágico',
    text: 'Ops, tem algo errado no PDF original? Use isso para criar uma caixa branca corretiva por cima e reescrever o que quiser!',
    image: '/gatinho-corrigindo.png'
  },
  {
    id: 'tool-draw',
    target: '#btn-tool-draw',
    title: 'Lápis Mágico',
    text: 'Solte a criatividade! Rabisque, circule ou desenhe livremente pelo PDF.',
    image: '/gatinho-pintando.png'
  },
  {
    id: 'tool-eraser',
    target: '#btn-tool-draw', 
    title: 'Borracha',
    text: 'Dica de ouro: Quando você clica no Lápis Mágico, a ferramenta da Borracha aparece logo ali ao lado para apagar seus errinhos!',
    image: '/gatinho-apagando.png'
  },
  {
    id: 'tool-image',
    target: '#btn-tool-image',
    title: 'Imagens e Figurinhas',
    text: 'Cole suas imagens favoritas no PDF. É só selecionar a ferramenta e clicar onde quer colocar a imagem!',
    image: '/gatinho-imagem.png' 
  },
  {
    id: 'outro',
    target: null,
    title: 'Tudo Pronto! ⋆˚✿˖°',
    text: 'Agora você já sabe todos os meus segredos! Divirta-se editando seus PDFs e me chame se precisar de novo clicando no botão de ajuda!',
    image: '/gatinho-comemorando.png'
  }
];

export function CatTutorial({ isActive, onClose }: CatTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [hole, setHole] = useState({ x: 0, y: 0, w: 0, h: 0, active: false });
  const [popoverState, setPopoverState] = useState({
    top: 0,
    left: 0,
    arrowLeft: 160, 
    align: 'center',
    isNearRight: false,
    isNearBottom: false,
  });
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive) {
      setCurrentStep(0);
      return;
    }

    const updatePosition = () => {
      const step = TUTORIAL_STEPS[currentStep];
      const padding = 20; 
      const gapToTarget = 15; 

      if (!step.target) {
        setHole({ x: window.innerWidth / 2, y: window.innerHeight / 2, w: 0, h: 0, active: false });
        setPopoverState({ top: window.innerHeight / 2, left: window.innerWidth / 2, arrowLeft: 160, align: 'center', isNearRight: false, isNearBottom: false });
        return;
      }

      const targetEl = document.querySelector(step.target);
      const popoverEl = popoverRef.current;

      if (targetEl && popoverEl) {
        const targetRect = targetEl.getBoundingClientRect();
        
        setHole({
          x: targetRect.left - 6,
          y: targetRect.top - 6,
          w: targetRect.width + 12,
          h: targetRect.height + 12,
          active: true
        });

        const targetCenter = targetRect.left + targetRect.width / 2;
        const popoverHalfWidth = 160; 
        const popoverHeight = popoverEl.getBoundingClientRect().height || 250; 
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let popoverCenter = targetCenter;
        popoverCenter = Math.max(popoverHalfWidth + padding, Math.min(viewportWidth - popoverHalfWidth - padding, popoverCenter));

        const popoverLeftEdge = popoverCenter - popoverHalfWidth;
        let arrowLeft = targetCenter - popoverLeftEdge;
        arrowLeft = Math.max(35, Math.min(320 - 35, arrowLeft));

        let top = targetRect.bottom + gapToTarget;
        let isNearBottom = false;

        if (top + popoverHeight + 80 > viewportHeight) {
          top = targetRect.top - popoverHeight - gapToTarget;
          isNearBottom = true;
        }

        setPopoverState({ top, left: popoverCenter, arrowLeft, align: 'target', isNearRight: popoverCenter > viewportWidth / 2, isNearBottom });
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    const timer = setTimeout(updatePosition, 100); 
    
    return () => {
      window.removeEventListener('resize', updatePosition);
      clearTimeout(timer);
    };
  }, [isActive, currentStep]);

  if (!isActive) return null;

  const stepData = TUTORIAL_STEPS[currentStep];
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;

  // ✨ O CONTEÚDO VISUAL COMPLETO
  const tutorialContent = (
    <div className="fixed inset-0 z-[100000] pointer-events-none">
      
      {/* Container que bloqueia cliques na página durante o tour */}
      <div className="absolute inset-0 pointer-events-auto animate-in fade-in duration-500">
        
        {/* O SVG que desenha a camada escura sobre a tela inteira e recorta o buraco */}
        <svg width="100%" height="100%" className="absolute inset-0 pointer-events-none">
          <defs>
            <mask id="spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect 
                x={hole.x} y={hole.y} width={hole.w} height={hole.h} rx="12" fill="black" 
                style={{ transition: 'all 0.5s ease-out' }} 
              />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(0, 0, 0, 0.70)" mask="url(#spotlight-mask)" />
        </svg>

        {/* Borda Rosa Brilhante ao redor da ferramenta ativa */}
        <div 
          className={cn(
            "absolute border-2 border-pink-400 rounded-xl shadow-[0_0_20px_rgba(244,114,182,0.8)] pointer-events-none transition-all duration-500 ease-out",
            hole.active ? "opacity-100 animate-pulse" : "opacity-0"
          )}
          style={{ top: hole.y, left: hole.x, width: hole.w, height: hole.h }}
        />
      </div>

      <div 
        ref={popoverRef}
        className={cn(
          "absolute transition-all duration-500 ease-out flex flex-col pointer-events-auto",
          popoverState.align === 'center' ? "-translate-x-1/2 -translate-y-1/2" : "-translate-x-1/2"
        )}
        style={{ top: popoverState.top, left: popoverState.left, opacity: popoverState.top === 0 ? 0 : 1 }}
      >
        
        {popoverState.align === 'target' && !popoverState.isNearBottom && (
          <div className="absolute -top-[16px] w-6 h-4 transition-all duration-300" style={{ left: popoverState.arrowLeft, marginLeft: '-12px' }}>
            <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[16px] border-b-pink-200 animate-bounce" />
          </div>
        )}

        {popoverState.align === 'target' && popoverState.isNearBottom && (
          <div className="absolute -bottom-[16px] w-6 h-4 transition-all duration-300" style={{ left: popoverState.arrowLeft, marginLeft: '-12px' }}>
            <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[16px] border-t-pink-200 animate-bounce" />
          </div>
        )}

        <div className="bg-white border border-pink-200 p-6 rounded-[2rem] w-[320px] relative z-10 glow-pink shadow-2xl">
          <button 
            onClick={onClose}
            className="absolute -top-3 -right-3 w-8 h-8 bg-pink-50 hover:bg-pink-100 text-pink-400 rounded-full flex items-center justify-center border border-pink-200 transition-colors shadow-sm"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-pink-400" />
            <h3 className="font-bold text-pink-600 text-lg">{stepData.title}</h3>
          </div>
          
          <p className="text-sm font-medium text-pink-900/80 mb-6 leading-relaxed">
            {stepData.text}
          </p>

          <div className="flex items-center justify-between mt-auto">
            <span className="text-xs font-bold text-pink-300">
              {currentStep + 1} de {TUTORIAL_STEPS.length}
            </span>
            
            <div className="flex gap-2">
              <button onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} disabled={currentStep === 0} className="w-8 h-8 flex items-center justify-center rounded-xl bg-pink-50 text-pink-500 hover:bg-pink-100 disabled:opacity-50 disabled:hover:bg-pink-50 transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={() => isLastStep ? onClose() : setCurrentStep(currentStep + 1)} className="flex items-center gap-1 px-4 py-2 rounded-xl bg-pink-500 text-white font-bold hover:bg-pink-600 shadow-md shadow-pink-200 transition-all active:scale-95">
                {isLastStep ? 'Começar!' : 'Próximo'} {!isLastStep && <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className={cn(
          "absolute w-32 h-32 pointer-events-none z-30 drop-shadow-xl animate-in fade-in zoom-in-50 duration-500", 
          "-bottom-20 -right-16", 
          popoverState.isNearRight && "-right-auto -left-16 scale-x-100", 
          popoverState.isNearBottom && "bottom-full mb-[-2rem] -right-16"
        )}>
          <img key={stepData.image} src={stepData.image} alt="Gatinho Tutorial" className="w-full h-full object-contain hover-wiggle" />
        </div>
      </div>
    </div>
  );

  // ✨ A MÁGICA FINAL: Teletransporta o código para fora da Toolbar, direto no corpo da página!
  return createPortal(tutorialContent, document.body);
}