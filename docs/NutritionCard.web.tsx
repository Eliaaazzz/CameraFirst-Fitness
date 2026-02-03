import React from "react";
import { motion } from "framer-motion";
import { MoreHorizontal } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

// Shadcn/ui primitives – adjust the import paths to match your design system
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Macro = {
  current: number;
  target: number;
};

export type NutritionCardProps = {
  calories: Macro;
  macros: {
    protein: Macro;
    carbs: Macro;
    fat: Macro;
  };
  onEdit?: () => void;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MACRO_COLORS = {
  protein: {
    bar: "bg-sky-500",
    text: "text-sky-600",
  },
  fat: {
    bar: "bg-amber-500",
    text: "text-amber-600",
  },
  carbs: {
    bar: "bg-rose-500",
    text: "text-rose-600",
  },
} as const;

// Lightweight class combiner (avoids pulling in clsx/cn helpers)
function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NutritionCard({ calories, macros, onEdit }: NutritionCardProps) {
  const consumed = Math.min(calories.current, calories.target);
  const remaining = Math.max(calories.target - calories.current, 0);

  const gaugeData = [
    { name: "consumed", value: consumed },
    { name: "remaining", value: Math.max(calories.target - consumed, 0) },
  ];

  const macroEntries: Array<{
    key: keyof typeof macros;
    label: string;
    data: Macro;
  }> = [
    { key: "protein", label: "Protein", data: macros.protein },
    { key: "fat", label: "Fat", data: macros.fat },
    { key: "carbs", label: "Carbs", data: macros.carbs },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="w-full"
    >
      <Card className="border border-slate-200/80 bg-white shadow-[0_12px_40px_-22px_rgba(15,23,42,0.35)] rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold text-slate-900">Calories</CardTitle>
          <Button
            size="icon"
            variant="ghost"
            onClick={onEdit}
            className="h-9 w-9 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            aria-label="Edit calories goal"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Semi-circle gauge */}
          <div className="relative flex items-end justify-center">
            <div className="w-full max-w-[360px]">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <defs>
                    <linearGradient id="calorieGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#FDBA74" />
                      <stop offset="100%" stopColor="#F97316" />
                    </linearGradient>
                  </defs>
                  <Pie
                    data={gaugeData}
                    dataKey="value"
                    cx="50%"
                    cy="100%"
                    startAngle={180}
                    endAngle={0}
                    innerRadius="70%"
                    outerRadius="100%"
                    stroke="none"
                    paddingAngle={1}
                    isAnimationActive
                    animationDuration={900}
                    animationEasing="ease-out"
                  >
                    <Cell fill="url(#calorieGradient)" />
                    <Cell fill="#E5E7EB" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-end pb-6">
              <span className="text-4xl font-semibold leading-tight text-slate-900 tabular-nums">
                {remaining}
              </span>
              <span className="text-xs font-medium text-slate-500">kcal left</span>
            </div>
          </div>

          <div className="mt-3 text-center text-xs text-slate-500">
            of {calories.target} kcal
          </div>

          {/* Macros */}
          <div className="mt-6 grid grid-cols-3 gap-4">
            {macroEntries.map(({ key, label, data }) => {
              const percent = data.target > 0 ? Math.min((data.current / data.target) * 100, 100) : 0;
              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span className={cx("font-medium", MACRO_COLORS[key].text)}>{label}</span>
                    <span className="tabular-nums text-slate-500">{data.current}/{data.target}g</span>
                  </div>
                  <Progress
                    value={percent}
                    className="h-2 overflow-hidden rounded-full bg-slate-100"
                    indicatorClassName={cx("rounded-full", MACRO_COLORS[key].bar)}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Example data
// ---------------------------------------------------------------------------

export const sampleNutrition = {
  calories: { current: 1200, target: 2200 },
  macros: {
    protein: { current: 45, target: 140 },
    carbs: { current: 120, target: 300 },
    fat: { current: 30, target: 80 },
  },
};

// Example usage
// <NutritionCard calories={sampleNutrition.calories} macros={sampleNutrition.macros} />

