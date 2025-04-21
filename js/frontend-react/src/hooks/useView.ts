import { ReactNode } from "react";
import { createGlobalStore } from "@/utils/client";

export interface ViewRenderer {
  render(): ReactNode;

  unmount(): void;
}

export interface View {
  render: () => ReactNode;
}

export interface ViewContent {
  osd?: View;
}

const viewStore = createGlobalStore<ViewContent>({});

export function useView(name: keyof ViewContent) {
  return viewStore.use()[name];
}

export function createView(name: keyof ViewContent, render: () => ReactNode) {
  viewStore.set((old) => {
    return {
      ...old,
      [name]: { render },
    };
  });
}
