export type Tool = 'select' | 'text' | 'draw' | 'image' | 'sign';

export interface TextAnnotation {
  id: string;
  type: 'text';
  pageIndex: number;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
}

export interface DrawAnnotation {
  id: string;
  type: 'draw';
  pageIndex: number;
  paths: { x: number; y: number }[];
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
}

export type Annotation = TextAnnotation | DrawAnnotation | ImageAnnotation;

export interface PDFPageData {
  pageIndex: number;
  removed: boolean;
}
