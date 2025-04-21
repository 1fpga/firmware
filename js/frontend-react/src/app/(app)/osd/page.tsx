'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { Root, createRoot } from 'react-dom/client';

import { useOneFpga, useView } from '@/hooks';

export default function OsdPage() {
  const { started } = useOneFpga();
  const view = useView('osd');
  const viewRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    let root: Root;
    const id = setTimeout(() => {
      if (!viewRef.current) {
        throw new Error('Could not find DOM element for OSD');
      }

      root = createRoot(viewRef.current);
      queueMicrotask(() => {
        root.render(view?.render());
      });
    }, 0);

    return () => {
      clearTimeout(id);
      queueMicrotask(() => {
        root?.unmount();
      });
    };
  });

  useEffect(() => {
    if (!started) {
      router.replace('/');
    }
  });

  return <div ref={viewRef} />;
}
