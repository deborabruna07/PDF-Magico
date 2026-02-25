import { useState, useCallback } from 'react';
import { pdfjsLib } from '@/lib/pdf-worker';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { Annotation, PDFPageData, Tool } from '@/types/pdf-editor';

export function usePDFDocument() {
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState('');
  const [pages, setPages] = useState<PDFPageData[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [loading, setLoading] = useState(false);

  const loadPDF = useCallback(async (file: File) => {
    setLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      setPdfBytes(buffer);
      setFileName(file.name);
      const doc = await pdfjsLib.getDocument({ data: buffer.slice(0) }).promise;
      setPdfDoc(doc);
      setPages(
        Array.from({ length: doc.numPages }, (_, i) => ({
          pageIndex: i,
          removed: false,
        }))
      );
      setCurrentPage(0);
      setAnnotations([]);
      setActiveTool('select');
    } catch (e) {
      console.error('Failed to load PDF:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const removePage = useCallback((pageIndex: number) => {
    setPages((prev) => {
      const updated = prev.map((p) =>
        p.pageIndex === pageIndex ? { ...p, removed: true } : p
      );
      const remaining = updated.filter((p) => !p.removed);
      if (remaining.length === 0) return prev; // don't remove last page
      return updated;
    });
    setAnnotations((prev) => prev.filter((a) => a.pageIndex !== pageIndex));
  }, []);

  const restorePage = useCallback((pageIndex: number) => {
    setPages((prev) =>
      prev.map((p) =>
        p.pageIndex === pageIndex ? { ...p, removed: false } : p
      )
    );
  }, []);

  const addAnnotation = useCallback((annotation: Annotation) => {
    setAnnotations((prev) => [...prev, annotation]);
  }, []);

  const updateAnnotation = useCallback((id: string, updates: Partial<Annotation>) => {
    setAnnotations((prev) =>
      prev.map((a) => (a.id === id ? ({ ...a, ...updates } as Annotation) : a))
    );
  }, []);

  const removeAnnotation = useCallback((id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const activePages = pages.filter((p) => !p.removed);

  return {
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
    updateAnnotation,
    removeAnnotation,
  };
}
