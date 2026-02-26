import { useCallback, useState, useLayoutEffect } from 'react';
import { usePDFDocument } from '@/hooks/usePDFDocument';
import { UploadScreen } from './UploadScreen';
import { Toolbar } from './Toolbar';
import { PageThumbnails } from './PageThumbnails';
import { PDFCanvas } from './PDFCanvas';
import { exportPDF } from '@/lib/pdf-export';
import { Loader2, FileDown, CheckCircle, AlertTriangle } from 'lucide-react';
import { CursorSelection } from './CursorSelection';

export function PDFEditor() {
  const [selectedCursor, setSelectedCursor] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false); // ✨ Estado centralizado

  const {
    pdfDoc, pdfBytes, fileName, pages, activePages, currentPage, setCurrentPage,
    annotations, activeTool, setActiveTool, loading, loadPDF, 
    removePage, restorePage, rotatePage,
    addAnnotation, removeAnnotation, updateAnnotation,
    undo, redo, canUndo, canRedo, clearAnnotations
  } = usePDFDocument();

  const [drawColor, setDrawColor] = useState('#f472b6');
  const [drawWidth, setDrawWidth] = useState(3);
  const [userZoom, setUserZoom] = useState(1);
  const [exportState, setExportState] = useState<'idle' | 'exporting' | 'success'>('idle');

  useLayoutEffect(() => {
    if (!selectedCursor) return;
    const safeUrl = encodeURI(selectedCursor);
    const styleId = 'cat-paw-style';
    const oldStyle = document.getElementById(styleId);
    if (oldStyle) oldStyle.remove();

    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
      *, html, body { cursor: url('${safeUrl}') 16 16, auto !important; }
      a, button, [role="button"], input, select, textarea, .cursor-pointer, .cursor-text, .cursor-crosshair {
        cursor: url('${safeUrl}') 16 16, pointer !important;
      }
    `;
    document.head.appendChild(style);
    const img = new Image();
    img.src = safeUrl;

    return () => {
      const styleToRemove = document.getElementById(styleId);
      if (styleToRemove) styleToRemove.remove();
    };
  }, [selectedCursor]);

  const handleDownload = useCallback(async () => {
    if (!pdfBytes) return;
    setExportState('exporting');
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      const result = await exportPDF(pdfBytes, pages, annotations);
      const blob = new Blob([result as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName.replace('.pdf', '-editado.pdf');
      a.click();
      URL.revokeObjectURL(url);
      setExportState('success');
      setTimeout(() => setExportState('idle'), 2500);
    } catch (e) {
      console.error('Export failed:', e);
      setExportState('idle');
    }
  }, [pdfBytes, pages, annotations, fileName]);

  if (!selectedCursor) return <CursorSelection onSelect={setSelectedCursor} />;

  if (loading) {
    return (
      <div key="loading-screen" className="contents">
        <div className="flex min-h-screen items-center justify-center bg-background relative overflow-hidden"
             style={{ backgroundImage: 'radial-gradient(#fbcfe8 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}>
          <div className="flex flex-col items-center gap-3 glow-pink bg-white/50 backdrop-blur-sm p-8 rounded-[2rem]">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-medium text-primary text-glow">Carregando PDF...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!pdfDoc) {
    return (
      <div key="upload-screen" className="contents">
        <UploadScreen onFileSelect={loadPDF} />
      </div>
    );
  }

  const isCurrentRemoved = pages.find((p) => p.pageIndex === currentPage)?.removed;
  const displayPage = isCurrentRemoved ? activePages[0]?.pageIndex ?? 0 : currentPage;

  return (
    <div key="main-editor-screen" className="contents">
      {/* ✨ POPUP DEFINITIVO: Agora flutua sobre TUDO, sem cortes ✨ */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border-2 border-pink-100 max-w-sm w-full mx-4 animate-in zoom-in-95 duration-200 glow-pink">
            <div className="flex flex-col items-center text-center">
              <div className="p-3 bg-red-50 text-red-500 rounded-full mb-4 animate-bounce">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-pink-900 mb-2">Tem certeza? 🌸</h3>
              <p className="text-sm text-pink-600/80 mb-8 leading-relaxed font-medium">
                Esta ação irá apagar definitivamente <strong className="text-pink-700">todas</strong> as suas anotações. Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setShowClearConfirm(false)} 
                  className="flex-1 py-3 text-sm font-bold rounded-2xl border-2 border-pink-100 text-pink-400 hover:bg-pink-50 transition-all active:scale-95"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    clearAnnotations();
                    setShowClearConfirm(false);
                  }} 
                  className="flex-1 py-3 text-sm font-bold rounded-2xl bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-200 transition-all active:scale-95"
                >
                  Sim, limpar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex h-screen flex-col relative overflow-hidden bg-rose-50/30"
           style={{ backgroundImage: 'radial-gradient(#fbcfe8 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}>
        <div className="relative z-20 bg-white/70 backdrop-blur-md border-b border-pink-100 shadow-[0_4px_20px_rgb(244,114,182,0.05)]">
          <Toolbar
            activeTool={activeTool} onToolChange={setActiveTool} onDownload={handleDownload}
            hasAnnotations={annotations.length > 0}
            drawColor={drawColor} onDrawColorChange={setDrawColor}
            drawWidth={drawWidth} onDrawWidthChange={setDrawWidth}
            zoom={userZoom} onZoomIn={() => setUserZoom(z => z + 0.25)} onZoomOut={() => setUserZoom(z => Math.max(0.5, z - 0.25))}
            canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo} 
            onClearAll={() => setShowClearConfirm(true)} // Dispara o modal centralizado
          />
        </div>
        
        <div className="flex flex-1 overflow-hidden">
          <div className="z-10 bg-white/50 backdrop-blur-sm border-r border-pink-100 shadow-[4px_0_24px_rgb(244,114,182,0.05)] flex flex-col w-64 shrink-0">
            <PageThumbnails pdfDoc={pdfDoc} pages={pages} currentPage={displayPage} onPageSelect={setCurrentPage} onRemovePage={removePage} onRestorePage={restorePage} onRotatePage={rotatePage} />
          </div>
          <PDFCanvas
            pdfDoc={pdfDoc} pageIndex={displayPage} activeTool={activeTool} 
            annotations={annotations} onAddAnnotation={addAnnotation} 
            onRemoveAnnotation={removeAnnotation} onUpdateAnnotation={updateAnnotation}
            drawColor={drawColor} drawWidth={drawWidth} userZoom={userZoom}
          />
        </div>

        {exportState !== 'idle' && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-pink-50/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white/90 backdrop-blur-xl p-8 rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(244,114,182,0.4)] flex flex-col items-center max-w-sm w-full mx-4 border-2 border-pink-100 animate-in zoom-in-95 duration-500 glow-pink">
              {exportState === 'exporting' ? (
                <>
                  <div className="relative flex items-center justify-center w-20 h-20 mb-6">
                    <div className="absolute inset-0 border-4 border-pink-100 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-pink-400 rounded-full border-t-transparent animate-spin"></div>
                    <FileDown className="w-8 h-8 text-pink-400" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2 text-pink-900 text-glow">Finalizando...</h3>
                  <p className="text-sm text-pink-600/80 text-center font-medium">Deixando as suas edições perfeitas!</p>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 mb-6 flex items-center justify-center bg-gradient-to-tr from-pink-200 to-pink-100 rounded-full text-pink-500 shadow-inner scale-110 transition-transform duration-500">
                    <CheckCircle className="w-10 h-10 drop-shadow-sm" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2 text-center text-pink-900 text-glow">Tudo Prontinho! ✨</h3>
                  <p className="text-sm text-pink-600/80 text-center font-medium">O seu PDF lindo e editado começou a baixar.</p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}