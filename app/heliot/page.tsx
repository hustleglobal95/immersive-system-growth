import type { Metadata } from 'next';
import { HeliotExperience } from '@/src/experiences/heliot/HeliotExperience';
import { architecturalFont, editorialFont } from '@/src/design/fonts';
import './heliot.css';
import './observatory.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://heliot-optical-study.kevin-gonzal-7061.chatgpt.site'),
  title: 'HELIOT — Observatory for the unseen',
  description: 'An imagined architecture shaped by light. Explore a bronze observatory, its structural anatomy, and an interactive light laboratory.',
  openGraph: { title: 'HELIOT — Observatory for the unseen', description: 'A field study in light.', images: ['/models/heliot/observatory-landscape.webp'] },
};
export default function HeliotPage() { return <div className={`${architecturalFont.variable} ${editorialFont.variable}`}><HeliotExperience /></div>; }
