'use client';

import {useEffect, useRef, useState} from 'react';
import {supabase} from '../../../lib/supabase';
import styles from '../../user-dashboard.module.css';

let cachedPdf = null;
let cachedSource = '';

async function getPdf(source) {
  if (cachedPdf && cachedSource === source) return cachedPdf;

  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';
  const {data: {session}} = await supabase.auth.getSession();
  const response = await fetch(source, {
    headers: {
      Accept: 'application/json',
      ...(session?.access_token ? {Authorization: `Bearer ${session.access_token}`} : {}),
    },
  });
  if (!response.ok) throw new Error('Data buku tidak dapat dimuat.');
  const {data: encodedPdf} = await response.json();
  const binary = window.atob(encodedPdf);
  const pdfData = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) pdfData[index] = binary.charCodeAt(index);

  cachedSource = source;
  cachedPdf = pdfjs.getDocument({
    data: pdfData,
    wasmUrl: '/pdfjs/wasm/',
    cMapUrl: '/pdfjs/cmaps/',
    cMapPacked: true,
    useWasm: true,
  }).promise;
  return cachedPdf;
}

export default function PdfCanvasPage({source, pageNumber, title, onBlank}) {
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);
  const previousPageRef = useRef(pageNumber);
  const hasPageRef = useRef(false);
  const [state, setState] = useState('loading');
  const [hasPage, setHasPage] = useState(false);
  const [transition, setTransition] = useState('ready');

  useEffect(() => {
    let active = true;

    async function renderPage() {
      const direction = pageNumber >= previousPageRef.current ? 'next' : 'previous';
      previousPageRef.current = pageNumber;
      setState('loading');
      if (hasPageRef.current) setTransition(direction === 'next' ? 'loadingNext' : 'loadingPrevious');
      try {
        renderTaskRef.current?.cancel();
        const document = await getPdf(source);
        const page = await document.getPage(pageNumber);
        if (!active) return;

        const baseViewport = page.getViewport({scale: 1});
        const targetWidth = Math.min(1180, Math.max(720, canvasRef.current?.parentElement?.clientWidth || 900));
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.6);
        const scale = (targetWidth / baseViewport.width) * pixelRatio;
        const viewport = page.getViewport({scale});
        const pendingCanvas = window.document.createElement('canvas');
        const context = pendingCanvas.getContext('2d', {alpha: false});
        pendingCanvas.width = Math.ceil(viewport.width);
        pendingCanvas.height = Math.ceil(viewport.height);
        context.fillStyle = '#fff';
        context.fillRect(0, 0, pendingCanvas.width, pendingCanvas.height);

        const renderTask = page.render({canvasContext: context, viewport});
        renderTaskRef.current = renderTask;
        await renderTask.promise;
        if (!active) return;

        const pixels = context.getImageData(0, 0, pendingCanvas.width, pendingCanvas.height).data;
        let ink = 0;
        let samples = 0;
        for (let pixel = 0; pixel < pixels.length; pixel += 64) {
          const luminance = pixels[pixel] * .2126 + pixels[pixel + 1] * .7152 + pixels[pixel + 2] * .0722;
          if (luminance < 242) ink += 1;
          samples += 1;
        }
        const isBlank = samples > 0 && ink / samples < .006;
        if (isBlank) {
          setState('blank');
          onBlank?.(pageNumber);
          return;
        }

        const canvas = canvasRef.current;
        const visibleContext = canvas.getContext('2d', {alpha: false});
        setTransition(direction === 'next' ? 'enterNext' : 'enterPrevious');
        canvas.width = pendingCanvas.width;
        canvas.height = pendingCanvas.height;
        canvas.style.aspectRatio = `${viewport.width} / ${viewport.height}`;
        visibleContext.drawImage(pendingCanvas, 0, 0);
        hasPageRef.current = true;
        setHasPage(true);
        setState('ready');
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            if (active) setTransition('ready');
          });
        });
      } catch (error) {
        if (error?.name !== 'RenderingCancelledException' && active) setState('error');
      }
    }

    renderPage();
    return () => {
      active = false;
      renderTaskRef.current?.cancel();
    };
  }, [onBlank, pageNumber, source]);

  const transitionClass = transition === 'enterNext'
    ? styles.novelCanvasEnterNext
    : transition === 'enterPrevious'
      ? styles.novelCanvasEnterPrevious
      : transition === 'loadingNext'
        ? styles.novelCanvasLoadingNext
        : transition === 'loadingPrevious'
          ? styles.novelCanvasLoadingPrevious
          : styles.novelCanvasReady;

  return (
    <div className={styles.novelCanvasWrap} aria-busy={state === 'loading'}>
      {state === 'loading' && !hasPage ? <span className={styles.novelCanvasStatus}>Menyiapkan halaman...</span> : null}
      {state === 'loading' && hasPage ? <span className={styles.novelCanvasLoadingBadge}>Membuka halaman...</span> : null}
      {state === 'blank' ? <span className={styles.novelCanvasStatus}>Melewati halaman kosong...</span> : null}
      {state === 'error' ? <span className={`${styles.novelCanvasStatus} ${styles.novelCanvasError}`}>Halaman gagal dimuat. Coba buka kembali buku.</span> : null}
      <canvas className={transitionClass} ref={canvasRef} aria-label={`${title}, halaman ${pageNumber}`} />
    </div>
  );
}
