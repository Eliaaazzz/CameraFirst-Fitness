#!/usr/bin/env node
/**
 * import-spoonacular-recipes.mjs
 * 
 * 从 Spoonacular API 导入真实 recipe 数据到 PostgreSQL
 * 每个食材类别搜索一个 recipe，包含完整营养信息
 * 
 * 环境变量:
 *   SPOONACULAR_API_KEY - Spoonacular API key
 *   POSTGRES_* - PostgreSQL 连接信息
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import pg from 'pg';

dotenv.config({ path: resolve('..', '.env'), override: true });

const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY;

const pool = new pg.Pool({
  host: process.env.PGHOST || process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.PGPORT || process.env.POSTGRES_PORT || '5432'),
  database: process.env.PGDATABASE || process.env.POSTGRES_DB || 'fitness_mvp',
  user: process.env.PGUSER || process.env.POSTGRES_USER || 'fitnessuser',
  password: process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD,
});

// ============================================================
// 食材类别列表 (每个类别搜一个 recipe)
// ============================================================
const INGREDIENT_QUERIES = [
  // 🥩 动物性蛋白
  { query: 'chicken breast', category: 'animal-protein', tags: ['high-protein'] },
  { query: 'turkey', category: 'animal-protein', tags: ['high-protein', 'lean'] },
  { query: 'egg whites', category: 'animal-protein', tags: ['high-protein'] },
  { query: 'salmon', category: 'animal-protein', tags: ['high-protein', 'omega-3'] },
  { query: 'tuna', category: 'animal-protein', tags: ['high-protein'] },
  { query: 'lean beef', category: 'animal-protein', tags: ['high-protein'] },
  { query: 'pork tenderloin', category: 'animal-protein', tags: ['high-protein', 'lean'] },
  { query: 'shrimp', category: 'animal-protein', tags: ['high-protein', 'low-fat'] },
  { query: 'greek yogurt', category: 'animal-protein', tags: ['high-protein', 'probiotic'] },
  { query: 'cottage cheese', category: 'animal-protein', tags: ['high-protein'] },
  
  // 🌱 植物性蛋白
  { query: 'tofu', category: 'plant-protein', tags: ['vegan', 'high-protein'] },
  { query: 'tempeh', category: 'plant-protein', tags: ['vegan', 'high-protein'] },
  { query: 'edamame', category: 'plant-protein', tags: ['vegan', 'high-protein'] },
  { query: 'black beans', category: 'plant-protein', tags: ['vegan', 'high-fiber'] },
  { query: 'chickpeas', category: 'plant-protein', tags: ['vegan', 'high-fiber'] },
  { query: 'lentils', category: 'plant-protein', tags: ['vegan', 'high-fiber'] },
  { query: 'seitan', category: 'plant-protein', tags: ['vegan', 'high-protein'] },
  
  // 🍚 优质碳水
  { query: 'oatmeal', category: 'healthy-carbs', tags: ['whole-grain', 'high-fiber'] },
  { query: 'brown rice', category: 'healthy-carbs', tags: ['whole-grain'] },
  { query: 'quinoa', category: 'healthy-carbs', tags: ['whole-grain', 'high-protein'] },
  { query: 'whole wheat pasta', category: 'healthy-carbs', tags: ['whole-grain'] },
  { query: 'sweet potato', category: 'healthy-carbs', tags: ['high-fiber'] },
  { query: 'potato', category: 'healthy-carbs', tags: ['gluten-free'] },
  { query: 'banana smoothie', category: 'healthy-carbs', tags: ['quick-energy'] },
  
  // 🥑 健康脂肪
  { query: 'avocado', category: 'healthy-fats', tags: ['keto', 'healthy-fat'] },
  { query: 'almonds', category: 'healthy-fats', tags: ['nuts', 'healthy-fat'] },
  { query: 'olive oil salad', category: 'healthy-fats', tags: ['mediterranean'] },
  { query: 'peanut butter', category: 'healthy-fats', tags: ['healthy-fat'] },
  { query: 'chia seeds', category: 'healthy-fats', tags: ['omega-3', 'high-fiber'] },
  { query: 'dark chocolate', category: 'healthy-fats', tags: ['antioxidant'] },
  
  // 🥦 高纤维蔬菜
  { query: 'broccoli', category: 'vegetables', tags: ['low-carb', 'high-fiber'] },
  { query: 'spinach', category: 'vegetables', tags: ['iron', 'low-carb'] },
  { query: 'kale', category: 'vegetables', tags: ['superfood', 'low-carb'] },
  { query: 'cauliflower', category: 'vegetables', tags: ['low-carb', 'keto'] },
  { query: 'asparagus', category: 'vegetables', tags: ['low-carb'] },
  { query: 'bell pepper', category: 'vegetables', tags: ['vitamin-c'] },
  
  // 🍎 水果
  { query: 'apple', category: 'fruits', tags: ['high-fiber'] },
  { query: 'blueberry', category: 'fruits', tags: ['antioxidant'] },
  { query: 'strawberry', category: 'fruits', tags: ['vitamin-c'] },
  { query: 'orange', category: 'fruits', tags: ['vitamin-c'] },
  { query: 'kiwi', category: 'fruits', tags: ['vitamin-c'] },
  { query: 'mango', category: 'fruits', tags: ['vitamin-a'] },
  
  // 💧 补水电解质
  { query: 'coconut water smoothie', category: 'hydration', tags: ['electrolytes'] },
];

// ============================================================
// Spoonacular API Functions
// ============================================================

async function searchRecipe(query) {
  const url = `https://api.spoonacular.com/recipes/complexSearch?apiKey=${SPOONACULAR_API_KEY}&query=${encodeURIComponent(query)}&number=1&addRecipeNutrition=true&addRecipeInformation=true&fillIngredients=true`;
  
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Spoonacular search failed: ${res.status} ${res.statusText}`);
  }
  
  const data = await res.json();
  if (!data.results || data.results.length === 0) {
    return null;
  }
  
  return data.results[0];
}

async function getRecipeDetails(id) {
  const url = `https://api.spoonacular.com/recipes/${id}/information?apiKey=${SPOONACULAR_API_KEY}&includeNutrition=true`;
  
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Spoonacular details failed: ${res.status}`);
  }
  
  return await res.json();
}

// ============================================================
// Data Transformation
// ============================================================

function extractNutrition(nutrition) {
  if (!nutrition || !nutrition.nutrients) return null;
  
  const nutrients = nutrition.nutrients;
  const findNutrient = (name) => {
    const n = nutrients.find(x => x.name.toLowerCase() === name.toLowerCase());
    return n ? Math.round(n.amount) : 0;
  };
  
  return {
    calories: findNutrient('Calories'),
    protein: findNutrient('Protein'),
    carbs: findNutrient('Carbohydrates'),
    fat: findNutrient('Fat'),
    fiber: findNutrient('Fiber'),
    sugar: findNutrient('Sugar'),
    sodium: findNutrient('Sodium'),
    cholesterol: findNutrient('Cholesterol'),
    saturatedFat: findNutrient('Saturated Fat'),
    vitaminA: findNutrient('Vitamin A'),
    vitaminC: findNutrient('Vitamin C'),
    calcium: findNutrient('Calcium'),
    iron: findNutrient('Iron'),
  };
}

function extractSteps(analyzedInstructions) {
  if (!analyzedInstructions || analyzedInstructions.length === 0) {
    return [];
  }
  
  return analyzedInstructions[0].steps?.map(step => ({
    number: step.number,
    instruction: step.step,
  })) || [];
}

function getDifficulty(readyInMinutes, steps) {
  if (readyInMinutes <= 15 && steps.length <= 5) return 'Easy';
  if (readyInMinutes <= 30 && steps.length <= 10) return 'Medium';
  return 'Hard';
}

// ============================================================
// Database Functions
// ============================================================

async function addSpoonacularIdColumn(client) {
  await client.query('ALTER TABLE recipe ADD COLUMN IF NOT EXISTS spoonacular_id INTEGER UNIQUE');
  console.log('   ✓ spoonacular_id column ready');
}

async function insertRecipe(client, recipe, tags) {
  const nutrition = extractNutrition(recipe.nutrition);
  const steps = extractSteps(recipe.analyzedInstructions);
  const difficulty = getDifficulty(recipe.readyInMinutes || 30, steps);
  
  const sql = `
    INSERT INTO recipe (
      id, title, image_url, time_minutes, difficulty, 
      nutrition_summary, steps, swaps, dietary_tags, spoonacular_id, created_at
    ) VALUES (
      gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()
    )
    ON CONFLICT (spoonacular_id) DO UPDATE SET
      title = EXCLUDED.title,
      image_url = EXCLUDED.image_url,
      time_minutes = EXCLUDED.time_minutes,
      nutrition_summary = EXCLUDED.nutrition_summary,
      steps = EXCLUDED.steps,
      dietary_tags = EXCLUDED.dietary_tags
    RETURNING id, title
  `;
  
  const values = [
    recipe.title,
    recipe.image,
    recipe.readyInMinutes || 30,
    difficulty,
    JSON.stringify(nutrition),
    JSON.stringify(steps.length > 0 ? steps : [{ number: 1, instruction: recipe.instructions || 'Follow recipe instructions.' }]),
    JSON.stringify([]), // swaps - empty for now
    tags,
    recipe.id, // spoonacular_id
  ];
  
  return await client.query(sql, values);
}

// ============================================================
// Main Import Function
// ============================================================

async function main() {
  if (!SPOONACULAR_API_KEY) {
    console.error('❌ SPOONACULAR_API_KEY not found in .env');
    process.exit(1);
  }
  
  console.log('═'.repeat(70));
  console.log('🍽️  Spoonacular Recipe Importer');
  console.log('═'.repeat(70));
  console.log(`📋 Total ingredients to search: ${INGREDIENT_QUERIES.length}`);
  console.log('');
  
  const client = await pool.connect();
  
  try {
    // Ensure spoonacular_id column exists
    console.log('📦 Preparing database...');
    await addSpoonacularIdColumn(client);
    
    let imported = 0;
    let failed = 0;
    const seenIds = new Set();
    
    console.log('\n🚀 Starting import...\n');
    
    for (const item of INGREDIENT_QUERIES) {
      process.stdout.write(`  [${item.query.padEnd(25)}] `);
      
      try {
        const recipe = await searchRecipe(item.query);
        
        if (!recipe) {
          console.log('⚠️  No results');
          failed++;
          continue;
        }
        
        // Skip duplicates
        if (seenIds.has(recipe.id)) {
          console.log('⏭️  Duplicate, skipping');
          continue;
        }
        seenIds.add(recipe.id);
        
        // Get full details if nutrition not included
        let fullRecipe = recipe;
        if (!recipe.nutrition) {
          fullRecipe = await getRecipeDetails(recipe.id);
        }
        
        // Insert into DB
        const result = await insertRecipe(client, fullRecipe, item.tags);
        
        const nutrition = extractNutrition(fullRecipe.nutrition);
        console.log(`✅ ${fullRecipe.title.slice(0, 35).padEnd(35)} | ${nutrition?.calories || '?'} cal | ${nutrition?.protein || '?'}g protein`);
        imported++;
        
        // Rate limiting - Spoonacular has limits
        await new Promise(r => setTimeout(r, 500));
        
      } catch (err) {
        console.log(`❌ Error: ${err.message.slice(0, 40)}`);
        failed++;
      }
    }
    
    // Summary
    console.log('\n' + '═'.repeat(70));
    console.log('📊 Import Summary');
    console.log('═'.repeat(70));
    console.log(`   ✅ Imported: ${imported}`);
    console.log(`   ❌ Failed:   ${failed}`);
    console.log(`   ⏭️  Skipped:  ${INGREDIENT_QUERIES.length - imported - failed} (duplicates)`);
    
    // Show sample data
    const sample = await client.query(`
      SELECT title, spoonacular_id, time_minutes, difficulty, 
             nutrition_summary->>'calories' as calories,
             nutrition_summary->>'protein' as protein,
             nutrition_summary->>'carbs' as carbs,
             nutrition_summary->>'fat' as fat
      FROM recipe 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.log('\n📋 Sample imported recipes:');
    sample.rows.forEach(r => {
      console.log(`   • ${r.title}`);
      console.log(`     ID: ${r.spoonacular_id} | ${r.time_minutes}min | ${r.difficulty}`);
      console.log(`     Nutrition: ${r.calories} cal, ${r.protein}g P, ${r.carbs}g C, ${r.fat}g F`);
    });
    
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
