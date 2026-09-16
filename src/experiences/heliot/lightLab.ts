import { create } from 'zustand';

export const useLightLab = create<{ aperture: number; setAperture: (value: number) => void }>(set => ({
  aperture: 1.4,
  setAperture: aperture => set({ aperture }),
}));

export const apertureRadius = (aperture: number) => .84 * 1.4 / aperture;
