export type Tool = 'select' | 'text' | 'draw' | 'image' | 'sign' | 'edit-text' | 'shape' | 'eraser';

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
  rotation?: number; 
}

export interface DrawAnnotation {
  id: string;
  type: 'draw';
  pageIndex: number;
  paths: { x: number; y: number; erased?: boolean }[];
  color: string;
  lineWidth: number;
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
  rotation?: number; 
}

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
  rotation?: number; 
}

export type Annotation = TextAnnotation | DrawAnnotation | ImageAnnotation | ShapeAnnotation;

export interface PDFPageData {
  pageIndex: number;
  removed: boolean;
  rotation?: number; 
}