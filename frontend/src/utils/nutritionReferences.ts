import type { GeneratedGoals } from '@/services/geminiApi';

export type NutritionReference = {
  id: 'dietaryGuidance' | 'fdaDailyValues' | 'driCalculator' | 'dietaryReferenceIntakes' | 'mifflinStJeor' | 'glycemicLoad';
  title: string;
  shortLabel: string;
  summary: string;
  url: string;
  domainLabel: string;
};

export const NUTRITION_REFERENCES: Record<NutritionReference['id'], NutritionReference> = {
  dietaryGuidance: {
    id: 'dietaryGuidance',
    title: 'USDA Dietary Guidance hub (current 2025-2030 guidance)',
    shortLabel: 'USDA Dietary Guidance',
    summary:
      'Current USDA hub for Dietary Guidelines, DRIs, and related nutrition guidance.',
    url: 'https://www.nal.usda.gov/human-nutrition-and-food-safety/dietary-guidance',
    domainLabel: 'nal.usda.gov',
  },
  fdaDailyValues: {
    id: 'fdaDailyValues',
    title: 'FDA Daily Values on the Nutrition Facts label',
    shortLabel: 'FDA Daily Values (2,000 kcal)',
    summary:
      'General nutrition reference values for a 2,000-calorie diet, including fat 78 g, protein 50 g, carbohydrate 275 g, fiber 28 g, and added sugars 50 g.',
    url: 'https://www.fda.gov/media/135301/download',
    domainLabel: 'fda.gov',
  },
  driCalculator: {
    id: 'driCalculator',
    title: 'USDA DRI Calculator for Healthcare Professionals',
    shortLabel: 'USDA DRI Calculator',
    summary:
      'Direct calorie and macronutrient reference tool based on age, sex, height, weight, and activity level.',
    url: 'https://www.nal.usda.gov/fnic/dri-calculator/',
    domainLabel: 'nal.usda.gov',
  },
  dietaryReferenceIntakes: {
    id: 'dietaryReferenceIntakes',
    title: 'National Academies Dietary Reference Intakes',
    shortLabel: 'Dietary Reference Intakes',
    summary:
      'Used for protein guidance and acceptable macronutrient distribution ranges.',
    url:
      'https://nap.nationalacademies.org/catalog/10490/dietary-reference-intakes-for-energy-carbohydrate-fiber-fat-fatty-acids-cholesterol-protein-and-amino-acids',
    domainLabel: 'nap.nationalacademies.org',
  },
  mifflinStJeor: {
    id: 'mifflinStJeor',
    title: 'Mifflin-St Jeor resting energy equation (PubMed)',
    shortLabel: 'Mifflin-St Jeor equation',
    summary:
      'Primary predictive equation referenced for estimating resting energy expenditure before applying activity and goal adjustments.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/2305711/',
    domainLabel: 'pubmed.ncbi.nlm.nih.gov',
  },
  glycemicLoad: {
    id: 'glycemicLoad',
    title: 'Harvard Health glycemic index and glycemic load guide',
    shortLabel: 'Harvard Health glycemic load guide',
    summary:
      'Used for the app’s simplified blood sugar impact explanation and glycemic load reference.',
    url: 'https://www.health.harvard.edu/diseases-and-conditions/glycemic-index-and-glycemic-load-for-100-foods',
    domainLabel: 'health.harvard.edu',
  },
};

export const ABOUT_NUTRITION_REFERENCE_ORDER: NutritionReference[] = [
  NUTRITION_REFERENCES.dietaryGuidance,
  NUTRITION_REFERENCES.fdaDailyValues,
  NUTRITION_REFERENCES.driCalculator,
  NUTRITION_REFERENCES.dietaryReferenceIntakes,
  NUTRITION_REFERENCES.mifflinStJeor,
  NUTRITION_REFERENCES.glycemicLoad,
];

export type NutritionTargetExplanation = {
  title: string;
  summary: string;
  calorieDetail: string;
  macroDetail: string;
  bloodSugarDetail: string;
  inputSummary?: string;
  references: NutritionReference[];
};

const GOAL_LABELS: Record<NonNullable<GeneratedGoals['goalType']>, string> = {
  fat_loss: 'fat-loss',
  muscle_gain: 'muscle-gain',
  diabetes_control: 'blood-sugar-support',
};

const SEX_LABELS = {
  male: 'male',
  female: 'female',
  prefer_not_to_say: 'sex not specified',
} as const;

const ACTIVITY_LABELS = {
  low: 'low activity',
  medium: 'medium activity',
  high: 'high activity',
} as const;

export function getNutritionTargetExplanation(goals?: GeneratedGoals | null): NutritionTargetExplanation {
  if (goals) {
    const params = goals.inputParameters;
    const inputParts = [
      params?.sex ? SEX_LABELS[params.sex] : null,
      params?.age ? `age ${params.age}` : 'age 30 default',
      params?.heightCm ? `${params.heightCm} cm` : null,
      params?.weightKg ? `${params.weightKg} kg` : null,
      params?.activityLevel ? ACTIVITY_LABELS[params.activityLevel] : 'medium activity default',
    ].filter(Boolean);

    const goalLabel = goals.goalType ? GOAL_LABELS[goals.goalType] : 'active';

    return {
      title: 'Current target source',
      summary: `These numbers come from your saved ${goalLabel} plan, not from a general-reference average.`,
      calorieDetail:
        goals.dailyCalories.rationale ||
        'Calories are set from your saved plan using your profile inputs and activity level.',
      macroDetail:
        goals.macros_grams.notes ||
        'Protein, carbs, and fat are derived from your calorie target and selected goal.',
      bloodSugarDetail:
        'Blood sugar estimate is a simplified net-carb plus protein model for context only, not a clinical measurement.',
      inputSummary: inputParts.length > 0 ? `Inputs used: ${inputParts.join(' · ')}` : undefined,
      references: [
        NUTRITION_REFERENCES.driCalculator,
        NUTRITION_REFERENCES.mifflinStJeor,
        NUTRITION_REFERENCES.dietaryReferenceIntakes,
        NUTRITION_REFERENCES.glycemicLoad,
      ],
    };
  }

  return {
    title: 'Fallback target source',
    summary:
      'If no active plan is saved, AuraFitness falls back to general-reference values for a 2,000-calorie diet instead of personalised goals.',
    calorieDetail:
      'Calories default to the FDA general nutrition reference of 2,000 kcal/day.',
    macroDetail:
      'Macros default to FDA Daily Values for general nutrition advice: protein 50 g, carbs 275 g, and fat 78 g.',
    bloodSugarDetail:
      'Blood sugar estimate is a simplified net-carb plus protein model for context only, not a clinical measurement.',
    inputSummary:
      'Fallback reference: FDA Daily Values for a 2,000-calorie diet, used only until you save a personalised goal.',
    references: [
      NUTRITION_REFERENCES.fdaDailyValues,
      NUTRITION_REFERENCES.dietaryGuidance,
      NUTRITION_REFERENCES.glycemicLoad,
    ],
  };
}
