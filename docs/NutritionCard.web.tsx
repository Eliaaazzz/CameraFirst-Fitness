import React from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Macro = {
  current: number;
  target: number;
};

export type NutritionRingsProps = {
  calories: Macro;
  macros: {
    protein: Macro;
    carbs: Macro;
    fat: Macro;
  };
};

// ---------------------------------------------------------------------------
// Constants & Utils
// ---------------------------------------------------------------------------

const COLORS = {
  protein: "#22C55E", // Green-500
  fat: "#EF4444",     // Red-500
  carbs: "#3B82F6",   // Blue-500
  track: "#E5E7EB",   // Gray-200
};

/**
 * Ring Component - Raw SVG for maximum control and responsiveness
 */
const Ring = ({ 
  radius, 
  percentage, 
  color, 
  strokeWidth = 24 
}: { 
  radius: number; 
  percentage: number; 
  color: string; 
  strokeWidth?: number 
}) => {
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(percentage, 100) / 100) * circumference;

  return (
    <g>
      {/* Track (Background) */}
      <circle
        cx="200"
        cy="200"
        r={radius}
        stroke={COLORS.track}
        strokeWidth={strokeWidth}
        fill="transparent"
        className="opacity-30"
      />
      {/* Progress Ring */}
      <circle
        cx="200"
        cy="200"
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="transparent"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 200 200)"
        className="transition-all duration-1000 ease-out"
      />
    </g>
  );
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function NutritionRings({ calories, macros }: NutritionRingsProps) {
  const macroData = [
    { label: "Protein", key: "protein", color: COLORS.protein, unit: "g" },
    { label: "Fat", key: "fat", color: COLORS.fat, unit: "g" },
    { label: "Carbs", key: "carbs", color: COLORS.carbs, unit: "g" },
  ];

  return (
    <div className="w-full bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm">
      {/* 1. Container: Flex with wrapping. Mobile: Col, Desktop: Row */}
      <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12">
        
        {/* 2. Chart Scaling (The Rings) */}
        <div className="relative w-full max-w-[280px] sm:max-w-[320px] aspect-square">
          <svg
            viewBox="0 0 400 400"
            className="w-full h-full drop-shadow-sm"
          >
            {/* Protein - Outer */}
            <Ring 
              radius={160} 
              percentage={(macros.protein.current / macros.protein.target) * 100} 
              color={COLORS.protein} 
            />
            {/* Fat - Middle */}
            <Ring 
              radius={125} 
              percentage={(macros.fat.current / macros.fat.target) * 100} 
              color={COLORS.fat} 
            />
            {/* Carbs - Inner */}
            <Ring 
              radius={90} 
              percentage={(macros.carbs.current / macros.carbs.target) * 100} 
              color={COLORS.carbs} 
            />
          </svg>

          {/* Center: Total Calories */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-4xl sm:text-5xl font-bold text-[#F97316] leading-none">
              {Math.round(calories.current)}
            </span>
            <span className="text-xs sm:text-sm font-medium text-[#06B6D4] mt-1 uppercase tracking-wider">
              kcal
            </span>
            {/* Blue Decorator Line */}
            <div className="mt-1 h-[2px] w-8 bg-[#06B6D4]/30 rounded-full" />
            <span className="text-[10px] sm:text-xs text-gray-400 mt-1 font-medium">
              of {calories.target}
            </span>
          </div>
        </div>

        {/* 3. Legend & Data Responsiveness */}
        <div className="flex flex-col gap-4 w-full lg:max-w-[240px]">
          {macroData.map((item) => {
            const data = macros[item.key as keyof typeof macros];
            const percent = Math.round((data.current / data.target) * 100);
            
            return (
              <div 
                key={item.key} 
                className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/50 border border-gray-50 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }} 
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-gray-800">
                      {item.label}
                    </span>
                    <span className="text-[10px] font-medium text-gray-400 uppercase">
                      {percent}% of goal
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-gray-900">
                    {Math.round(data.current)}
                  </span>
                  <span className="text-xs text-gray-400 font-medium ml-1">
                    /{data.target}{item.unit}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Example Usage
// ---------------------------------------------------------------------------

export const sampleData = {
  calories: { current: 1840, target: 2400 },
  macros: {
    protein: { current: 120, target: 160 },
    fat: { current: 45, target: 80 },
    carbs: { current: 210, target: 300 },
  },
};