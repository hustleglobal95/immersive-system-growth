'use client';
import { useEffect, useRef, useState } from 'react';

export function AmbientSound() {
  const [enabled,setEnabled]=useState(false);
  const context=useRef<AudioContext|null>(null);
  useEffect(()=>()=>{void context.current?.close();},[]);
  async function toggle(){
    if(context.current){await context.current.close();context.current=null;setEnabled(false);return;}
    const audio=new AudioContext();context.current=audio;
    const gain=audio.createGain();gain.gain.setValueAtTime(0,audio.currentTime);gain.gain.linearRampToValueAtTime(.025,audio.currentTime+2);gain.connect(audio.destination);
    [55,82.41,110,164.81].forEach((frequency,i)=>{const oscillator=audio.createOscillator();oscillator.type='sine';oscillator.frequency.value=frequency;oscillator.detune.value=i%2?3:-3;oscillator.connect(gain);oscillator.start();});
    await audio.resume();setEnabled(true);
  }
  return <button className="heliot-sound" onClick={()=>void toggle()} aria-pressed={enabled} aria-label={enabled?'Mute atmosphere':'Enable atmosphere'}><svg aria-hidden="true" width="26" height="16" viewBox="0 0 26 16" fill="none" stroke="currentColor"><path d={enabled?'M2 6V10M7 3V13M12 1V15M17 4V12M22 6V10':'M2 7V9M7 7V9M12 7V9M17 7V9M22 7V9'}/></svg><span>Sound {enabled?'on':'off'}</span></button>;
}
