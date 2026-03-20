import React from 'react';

interface BrutalistSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}

const BrutalistSlider: React.FC<BrutalistSliderProps> = ({ 
  label, 
  value, 
  min, 
  max, 
  step = 1, 
  onChange 
}) => {
  return (
    <div className="flex flex-col gap-2 font-mono uppercase">
      <div className="flex justify-between text-xs font-bold tracking-wider">
        <label>{label}</label>
        <span>{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-4 bg-white border-2 border-black appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:bg-black
          [&::-webkit-slider-thumb]:border-2
          [&::-webkit-slider-thumb]:border-black
          [&::-webkit-slider-thumb]:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]
          hover:[&::-webkit-slider-thumb]:bg-gray-800"
      />
    </div>
  );
};

export default BrutalistSlider;