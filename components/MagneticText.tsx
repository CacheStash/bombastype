import React, { useRef, useState, useEffect } from 'react';

interface MagneticTextProps {
  text: string;
  className?: string;
  baseWeight?: number;
  maxWeight?: number;
  range?: number;
}

const MagneticText: React.FC<MagneticTextProps> = ({ 
  text, 
  className = "", 
  baseWeight = 100, 
  maxWeight = 900, 
  range = 300 
}) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <h1 
        className={`${className} flex flex-wrap justify-center cursor-default`}
        // PENTING: Memaksa menggunakan font Roboto Flex agar efek 'wght' jalan
        style={{ fontFamily: '"Roboto Flex", sans-serif' }}
    >
      {text.split('').map((char, index) => (
        <Char 
          key={index} 
          char={char} 
          mousePos={mousePos} 
          baseWeight={baseWeight} 
          maxWeight={maxWeight}
          range={range}
        />
      ))}
    </h1>
  );
};

interface CharProps {
  char: string;
  mousePos: { x: number; y: number };
  baseWeight: number;
  maxWeight: number;
  range: number;
}

const Char: React.FC<CharProps> = ({ char, mousePos, baseWeight, maxWeight, range }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [weight, setWeight] = useState(baseWeight);

  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const charX = rect.left + rect.width / 2;
      const charY = rect.top + rect.height / 2;

      const dist = Math.sqrt(
        Math.pow(mousePos.x - charX, 2) + 
        Math.pow(mousePos.y - charY, 2)
      );

      if (dist < range) {
        const weightDiff = maxWeight - baseWeight;
        const proximity = 1 - (dist / range); 
        const ease = proximity * proximity; 
        const newWeight = baseWeight + (weightDiff * ease);
        setWeight(newWeight);
      } else {
        setWeight(baseWeight);
      }
    }
  }, [mousePos, baseWeight, maxWeight, range]);

  return (
    <span 
      ref={ref} 
      style={{ 
        fontVariationSettings: `'wght' ${weight}`,
        // Transisi cepat agar tidak patah-patah
        transition: 'font-variation-settings 0.1s linear',
        display: 'inline-block',
        minWidth: char === ' ' ? '0.5em' : 'auto'
      }}
    >
      {char}
    </span>
  );
};

export default MagneticText;