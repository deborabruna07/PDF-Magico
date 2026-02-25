export type Tool = 'select' | 'text' | 'draw' | 'image' | 'sign' | 'edit-text' | 'shape';

export interface TextAnnotation {
  id: string;
  type: 'text';
  pageIndex: number;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
  backgroundColor?: string;
  width?: number;
  height?: number;
  fontFamily?: string;
  rotation?: number; // ADICIONADO: Rotação em graus (0, 90, 180, 270)
}

export interface DrawAnnotation {
  id: string;
  type: 'draw';
  pageIndex: number;
  paths: { x: number; y: number }[];
  color: string;
  lineWidth: number;
  // Nota: Desenhos livres geralmente não rotacionam individualmente, 
  // mas acompanham a rotação da página.
}

export interface ImageAnnotation {
  id: string;
  type: 'image';
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  dataUrl: string;
  rotation?: number; // ADICIONADO: Rotação em graus
}

// Se você seguiu o passo anterior das formas:
export interface ShapeAnnotation {
  id: string;
  type: 'shape';
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  shapeType: 'rectangle' | 'arrow' | 'circle';
  color: string;
  lineWidth: number;
  rotation?: number; // ADICIONADO: Para formas também
}

export type Annotation = TextAnnotation | DrawAnnotation | ImageAnnotation | ShapeAnnotation;

export interface PDFPageData {
  pageIndex: number;
  removed: boolean;
  rotation?: number; // Rotação da página inteira
}