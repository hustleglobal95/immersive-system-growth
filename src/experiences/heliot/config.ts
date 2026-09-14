import raw from './experience.json';
import { parseExperience } from '@/src/lib/configSchema';

export const heliotExperience = parseExperience(raw);
export const finishes = [
  { id: 'bronze', name: 'Bronze', color: '#987347', tint: '#ffffff', strength: 0 },
  { id: 'titanium', name: 'Titanium', color: '#a79c89', tint: '#d8c8ac', strength: .58 },
] as const;
export const apertures = [1.4, 2, 2.8, 4, 5.6, 8] as const;
export function relativeLight(aperture: number) { return Math.round((1.4 / aperture) ** 2 * 100); }
