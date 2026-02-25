import { useCallback, useState } from 'react';
import { usePDFDocument } from '@/hooks/usePDFDocument';
import { UploadScreen } from './UploadScreen';
import { Toolbar } from './Toolbar';
import { PageThumbnails } from './PageThumbnails';
import { PDFCanvas } from './PDFCanvas';
import { exportPDF } from '@/lib/pdf-export';
import { Loader2, FileDown, CheckCircle } from 'lucide-react';

export function PDFEditor() {
  const {
    pdfDoc, pdfBytes, fileName, pages, activePages, currentPage, setCurrentPage,
    annotations, activeTool, setActiveTool, loading, loadPDF, 
    removePage, restorePage, rotatePage, // <-- Adicionado rotatePage aqui
    addAnnotation, removeAnnotation, updateAnnotation,
    undo, redo, canUndo, canRedo, clearAnnotations
  } = usePDFDocument();

  // ESTADOS DE FERRAMENTAS
  const [drawColor, setDrawColor] = useState('#2563eb');
  const [drawWidth, setDrawWidth] = useState(3);
  const [userZoom, setUserZoom] = useState(1);

  // CONTROLE DO POPUP DE DOWNLOAD
  const [exportState, setExportState] = useState<'idle' | 'exporting' | 'success'>('idle');

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
      
      setTimeout(() => {
        setExportState('idle');
      }, 2500);

    } catch (e) {
      console.error('Export failed:', e);
      setExportState('idle');
    }
  }, [pdfBytes, pages, annotations, fileName]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Carregando PDF...</p>
        </div>
      </div>
    );
  }

  if (!pdfDoc) return <UploadScreen onFileSelect={loadPDF} />;

  const isCurrentRemoved = pages.find((p) => p.pageIndex === currentPage)?.removed;
  const displayPage = isCurrentRemoved ? activePages[0]?.pageIndex ?? 0 : currentPage;

  return (
    <div className="flex h-screen flex-col bg-background relative overflow-hidden">
      <Toolbar
        activeTool={activeTool} onToolChange={setActiveTool} onDownload={handleDownload}
        hasAnnotations={annotations.length > 0}
        drawColor={drawColor} onDrawColorChange={setDrawColor}
        drawWidth={drawWidth} onDrawWidthChange={setDrawWidth}
        zoom={userZoom} onZoomIn={() => setUserZoom(z => z + 0.25)} onZoomOut={() => setUserZoom(z => Math.max(0.5, z - 0.25))}
        canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo} onClearAll={clearAnnotations}
      />
      
      <div className="flex flex-1 overflow-hidden bg-slate-100/50">
        <PageThumbnails 
          pdfDoc={pdfDoc} 
          pages={pages} 
          currentPage={displayPage} 
          onPageSelect={setCurrentPage} 
          onRemovePage={removePage} 
          onRestorePage={restorePage}
          onRotatePage={rotatePage} // <-- Enviando para o componente de miniaturas
        />
        
        <PDFCanvas
          pdfDoc={pdfDoc} 
          pageIndex={displayPage} 
          activeTool={activeTool} 
          annotations={annotations}
          onAddAnnotation={addAnnotation} 
          onRemoveAnnotation={removeAnnotation} 
          onUpdateAnnotation={updateAnnotation}
          drawColor={drawColor} 
          drawWidth={drawWidth} 
          userZoom={userZoom}
        />
      </div>

      {/* POPUP DE DOWNLOAD */}
      {exportState !== 'idle' && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-background p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm w-full mx-4 border border-border animate-in zoom-in duration-300">
            {exportState === 'exporting' ? (
              <>
                <div className="relative flex items-center justify-center w-16 h-16 mb-4">
                  <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
                  <FileDown className="w-6 h-6 text-primary animate-pulse" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-foreground">Finalizando Arquivo...</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Estamos processando as suas edições para garantir a melhor qualidade.
                </p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 mb-4 flex items-center justify-center bg-green-100 rounded-full text-green-600">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-center text-foreground">Tudo Pronto!</h3>
                <p className="text-sm text-muted-foreground text-center">
                  O seu PDF foi editado e o download começou automaticamente.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}