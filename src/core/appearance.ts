import { create } from 'zustand';
export type ModelStyle = 'reference' | 'human';
function savedStyle(): ModelStyle {
  try {
    return localStorage.getItem('atlas-model-style') === 'human' ? 'human' : 'reference';
  } catch {
    return 'reference';
  }
}
export const useAppearance = create<{ style: ModelStyle; setStyle: (style: ModelStyle) => void }>(
  (set) => ({
    style: savedStyle(),
    setStyle: (style) => {
      set({ style });
      try {
        localStorage.setItem('atlas-model-style', style);
      } catch {}
    },
  }),
);
