import { useCallback } from 'react';
import { usePDFDocument } from '@/hooks/usePDFDocument';
import { UploadScreen } from './UploadScreen';
import { Toolbar } from './Toolbar';
import { PageThumbnails } from './PageThumbnails';
import { PDFCanvas } from './PDFCanvas';
import { exportPDF } from '@/lib/pdf-export';
import { Loader2 } from 'lucide-react';

export function PDFEditor() {
  const {
    pdfDoc,
    pdfBytes,
    fileName,
    pages,
    activePages,
    currentPage,
    setCurrentPage,
    annotations,
    activeTool,
    setActiveTool,
    loading,
    loadPDF,
    removePage,
    restorePage,
    addAnnotation,
    removeAnnotation,
  } = usePDFDocument();

  const handleDownload = useCallback(async () => {
    if (!pdfBytes) return;
    try {
      const result = await exportPDF(pdfBytes, pages, annotations);
      const blob = new Blob([result as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName.replace('.pdf', '-editado.pdf');
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed:', e);
    }
  }, [pdfBytes, pages, annotations, fileName]);

  const handleReset = useCallback(() => {
    // Reload the same file
    if (pdfBytes) {
      const file = new File([pdfBytes], fileName, { type: 'application/pdf' });
      loadPDF(file);
    }
  }, [pdfBytes, fileName, loadPDF]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando PDF...</p>
        </div>
      </div>
    );
  }

  if (!pdfDoc) {
    return <UploadScreen onFileSelect={loadPDF} />;
  }

  // Make sure currentPage is not removed
  const isCurrentRemoved = pages.find((p) => p.pageIndex === currentPage)?.removed;
  const displayPage = isCurrentRemoved
    ? activePages[0]?.pageIndex ?? 0
    : currentPage;

  return (
    <div className="flex h-screen flex-col bg-background">
      <Toolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        onDownload={handleDownload}
        onReset={handleReset}
        hasAnnotations={annotations.length > 0}
      />
      <div className="flex flex-1 overflow-hidden">
        <PageThumbnails
          pdfDoc={pdfDoc}
          pages={pages}
          currentPage={displayPage}
          onPageSelect={setCurrentPage}
          onRemovePage={removePage}
          onRestorePage={restorePage}
        />
        <PDFCanvas
          pdfDoc={pdfDoc}
          pageIndex={displayPage}
          activeTool={activeTool}
          annotations={annotations}
          onAddAnnotation={addAnnotation}
          onRemoveAnnotation={removeAnnotation}
        />
      </div>
    </div>
  );
}
