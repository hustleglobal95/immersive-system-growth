import type { Metadata } from 'next';
import { HeliotExperience } from '@/src/experiences/heliot/HeliotExperience';
import { architecturalFont, editorialFont } from '@/src/design/fonts';
import './heliot.css';

export const metadata: Metadata = {
  title: 'HELIOT — The Anatomy of Light',
  description: 'A continuous, ten-act interactive study of an original optical instrument. Explore its material, optical path and precision assembly.',
  openGraph: { title: 'HELIOT — The Anatomy of Light', description: 'An instrument for looking closer.' },
};
export default function HeliotPage() { return <div className={`${architecturalFont.variable} ${editorialFont.variable}`}><HeliotExperience /></div>; }
