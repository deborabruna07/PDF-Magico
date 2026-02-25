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
  
  // NOVO: Sistema de Histórico para Desfazer/Refazer
  const [history, setHistory] = useState<Annotation[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  const annotations = history[historyIndex] || [];
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

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
      setPages(Array.from({ length: doc.numPages }, (_, i) => ({ pageIndex: i, removed: false, rotation: 0 })));
      setCurrentPage(0);
      setHistory([[]]); // Reinicia o histórico ao carregar novo PDF
      setHistoryIndex(0);
      setActiveTool('select');
    } catch (e) {
      console.error('Failed to load PDF:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const pushState = useCallback((newAnnotations: Annotation[]) => {
    setHistory(prev => {
      const nextHistory = prev.slice(0, historyIndex + 1);
      nextHistory.push(newAnnotations);
      return nextHistory;
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const removePage = useCallback((pageIndex: number) => {
    setPages((prev) => {
      const updated = prev.map((p) => p.pageIndex === pageIndex ? { ...p, removed: true } : p);
      const remaining = updated.filter((p) => !p.removed);
      if (remaining.length === 0) return prev; 
      return updated;
    });
    pushState(annotations.filter((a) => a.pageIndex !== pageIndex));
  }, [annotations, pushState]);

  const restorePage = useCallback((pageIndex: number) => {
    setPages((prev) => prev.map((p) => p.pageIndex === pageIndex ? { ...p, removed: false } : p));
  }, []);

  // Rotação de Página
  const rotatePage = useCallback((pageIndex: number) => {
    setPages((prev) =>
      prev.map((p) =>
        p.pageIndex === pageIndex
          ? { ...p, rotation: ((p.rotation || 0) + 90) % 360 }
          : p
      )
    );
  }, []);

  const addAnnotation = useCallback((annotation: Annotation) => {
    pushState([...annotations, annotation]);
  }, [annotations, pushState]);

  // Adicionámos um parâmetro "replaceHistory" para evitar que cada letra digitada crie um passo no histórico
  const updateAnnotation = useCallback((id: string, updates: Partial<Annotation>, replaceHistory = false) => {
    const newAnnotations = annotations.map((a) => (a.id === id ? ({ ...a, ...updates } as Annotation) : a));
    if (replaceHistory) {
      setHistory(prev => {
        const nextHistory = [...prev];
        nextHistory[historyIndex] = newAnnotations;
        return nextHistory;
      });
    } else {
      pushState(newAnnotations);
    }
  }, [annotations, pushState, historyIndex]);

  const removeAnnotation = useCallback((id: string) => {
    pushState(annotations.filter((a) => a.id !== id));
  }, [annotations, pushState]);

  const undo = useCallback(() => setHistoryIndex(prev => Math.max(0, prev - 1)), []);
  const redo = useCallback(() => setHistoryIndex(prev => Math.min(history.length - 1, prev + 1)), [history.length]);
  const clearAnnotations = useCallback(() => pushState([]), [pushState]);

  const activePages = pages.filter((p) => !p.removed);

  // RETURN FINAL CORRIGIDO COM O rotatePage
  return {
    pdfDoc, pdfBytes, fileName, pages, activePages, currentPage, setCurrentPage, annotations,
    activeTool, setActiveTool, loading, loadPDF, removePage, restorePage, rotatePage,
    addAnnotation, updateAnnotation, removeAnnotation, 
    undo, redo, canUndo, canRedo, clearAnnotations
  };
}