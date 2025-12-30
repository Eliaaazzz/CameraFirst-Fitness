#!/usr/bin/env python3
"""
AURA FITNESS - 20个高质量商用食谱数据 (V2.0 修复版)
==========================================
修复重点：
1. 补全步骤中提到的所有食材/调料
2. 统一生熟口径 (Cooked vs Raw)
3. 统一计量单位 (全部转为 g/ml)
"""

import csv
import json
import os

recipes_data = [
    # --- 早餐 (Breakfast) ---
    {
        "id": 1,
        "title": "High-Protein Overnight Oats",
        "calories": 380, "protein": 28, "carbs": 45, "fat": 8,
        "prep_time": 5, "cook_time": 0, "difficulty": "Easy",
        "image_url": "https://images.unsplash.com/photo-1517673400267-0251440c45dc?auto=format&fit=crop&w=800&q=80",
        "steps": ["Mix oats, protein powder, and chia seeds in a jar.", "Add almond milk and stir well.", "Refrigerate overnight.", "Top with berries before eating."],
        "ingredients": [("Rolled Oats", 50, "g"), ("Whey Protein", 30, "g"), ("Almond Milk", 200, "ml"), ("Chia Seeds", 10, "g"), ("Mixed Berries", 50, "g")]
    },
    {
        "id": 2,
        "title": "Spinach & Egg White Frittata",
        "calories": 250, "protein": 30, "carbs": 5, "fat": 10,
        "prep_time": 10, "cook_time": 15, "difficulty": "Easy",
        "image_url": "https://images.unsplash.com/photo-1587132137056-bfbf0166836e?auto=format&fit=crop&w=800&q=80",
        "steps": ["Whisk egg whites with salt and pepper.", "Sauté spinach in a non-stick pan.", "Pour egg whites over spinach.", "Cover and cook until set."],
        "ingredients": [("Egg Whites", 200, "g"), ("Fresh Spinach", 100, "g"), ("Cherry Tomatoes", 50, "g"), ("Feta Cheese", 20, "g"), ("Salt", 1, "g"), ("Black Pepper", 1, "g")]
    },
    {
        "id": 3,
        "title": "Greek Yogurt Power Bowl",
        "calories": 350, "protein": 22, "carbs": 38, "fat": 11,
        "prep_time": 5, "cook_time": 0, "difficulty": "Easy",
        "image_url": "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80",
        "steps": ["Scoop yogurt into a bowl.", "Top with granola, banana slices, and honey.", "Sprinkle with crushed walnuts."],
        "ingredients": [("Greek Yogurt (0% Fat)", 200, "g"), ("Banana", 100, "g"), ("Honey", 15, "g"), ("Walnuts", 10, "g"), ("Granola (Low Sugar)", 30, "g")]
    },
    {
        "id": 4,
        "title": "Avocado Toast with Poached Egg",
        "calories": 400, "protein": 18, "carbs": 35, "fat": 22,
        "prep_time": 5, "cook_time": 5, "difficulty": "Medium",
        "image_url": "https://images.unsplash.com/photo-1525351484163-7529414395d8?auto=format&fit=crop&w=800&q=80",
        "steps": ["Toast the whole grain bread.", "Mash avocado with lime juice and spread on toast.", "Poach the egg in simmering water for 3 minutes.", "Place egg on toast and season."],
        "ingredients": [("Whole Grain Bread", 70, "g"), ("Avocado", 80, "g"), ("Egg (Large)", 50, "g"), ("Lime Juice", 5, "ml")]
    },
    {
        "id": 5,
        "title": "Protein Banana Pancakes",
        "calories": 450, "protein": 35, "carbs": 50, "fat": 10,
        "prep_time": 10, "cook_time": 10, "difficulty": "Medium",
        "image_url": "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=800&q=80",
        "steps": ["Mash banana and mix with eggs and protein powder.", "Heat a pan with cooking spray.", "Pour batter and cook 2 mins per side.", "Serve with sugar-free syrup."],
        "ingredients": [("Banana", 120, "g"), ("Eggs", 100, "g"), ("Whey Protein", 30, "g"), ("Rolled Oats", 30, "g"), ("Cooking Spray", 1, "g")]
    },

    # --- 午餐/晚餐 (Lunch/Dinner - Chicken & Turkey) ---
    {
        "id": 6,
        "title": "Lemon Herb Grilled Chicken",
        "calories": 420, "protein": 45, "carbs": 30, "fat": 12,
        "prep_time": 15, "cook_time": 15, "difficulty": "Medium",
        "image_url": "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=800&q=80",
        "steps": ["Marinate chicken with lemon, garlic, and herbs.", "Grill for 6-8 mins per side.", "Serve with steamed quinoa and broccoli."],
        "ingredients": [("Chicken Breast (Raw)", 200, "g"), ("Cooked Quinoa", 150, "g"), ("Broccoli", 100, "g"), ("Lemon Juice", 15, "ml"), ("Garlic Minced", 5, "g"), ("Dried Mixed Herbs", 2, "g")]
    },
    {
        "id": 7,
        "title": "Chicken Burrito Bowl",
        "calories": 550, "protein": 40, "carbs": 65, "fat": 15,
        "prep_time": 20, "cook_time": 15, "difficulty": "Medium",
        "image_url": "https://images.unsplash.com/photo-1543339308-43e59d6b73a6?auto=format&fit=crop&w=800&q=80",
        "steps": ["Cook brown rice.", "Grill chicken strips with taco seasoning.", "Assemble bowl with rice, beans, corn, and chicken.", "Top with salsa."],
        "ingredients": [("Chicken Breast (Raw)", 150, "g"), ("Cooked Brown Rice", 150, "g"), ("Black Beans (Canned/Drained)", 50, "g"), ("Corn (Canned/Drained)", 50, "g"), ("Salsa", 30, "g"), ("Taco Seasoning", 5, "g")]
    },
    {
        "id": 8,
        "title": "Turkey Chili",
        "calories": 380, "protein": 35, "carbs": 40, "fat": 10,
        "prep_time": 15, "cook_time": 30, "difficulty": "Medium",
        "image_url": "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=800&q=80",
        "steps": ["Sauté onions and garlic.", "Add ground turkey and brown.", "Add tomatoes, beans, and chili powder.", "Simmer for 20 minutes."],
        "ingredients": [("Ground Turkey (Lean)", 150, "g"), ("Kidney Beans (Canned/Drained)", 100, "g"), ("Canned Tomatoes", 200, "g"), ("Onion", 50, "g"), ("Garlic Minced", 5, "g"), ("Chili Powder", 3, "g")]
    },
    {
        "id": 9,
        "title": "Pesto Chicken Zoodles",
        "calories": 350, "protein": 38, "carbs": 12, "fat": 18,
        "prep_time": 15, "cook_time": 10, "difficulty": "Easy",
        "image_url": "https://images.unsplash.com/photo-1551248429-40975aa4de74?auto=format&fit=crop&w=800&q=80",
        "steps": ["Spiralize zucchini into noodles.", "Cook chicken pieces in a pan.", "Add zucchini noodles and toss for 2 mins.", "Stir in pesto sauce."],
        "ingredients": [("Chicken Breast (Raw)", 150, "g"), ("Zucchini", 200, "g"), ("Basil Pesto", 30, "g"), ("Cherry Tomatoes", 50, "g")]
    },

    # --- 午餐/晚餐 (Lunch/Dinner - Beef & Red Meat) ---
    {
        "id": 10,
        "title": "Lean Beef Stir-Fry",
        "calories": 480, "protein": 42, "carbs": 50, "fat": 14,
        "prep_time": 15, "cook_time": 10, "difficulty": "Medium",
        "image_url": "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=800&q=80",
        "steps": ["Slice beef thinly.", "Stir-fry beef in hot wok for 2 mins.", "Add peppers and snap peas.", "Toss with soy sauce and ginger."],
        "ingredients": [("Lean Beef Steak", 150, "g"), ("Bell Pepper", 100, "g"), ("Snap Peas", 50, "g"), ("Soy Sauce", 15, "ml"), ("Cooked White Rice", 150, "g"), ("Ginger Minced", 5, "g")]
    },
    {
        "id": 11,
        "title": "Steak & Sweet Potato",
        "calories": 520, "protein": 45, "carbs": 40, "fat": 20,
        "prep_time": 10, "cook_time": 20, "difficulty": "Medium",
        "image_url": "https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=800&q=80",
        "steps": ["Season steak with salt and pepper.", "Roast sweet potato cubes in oven.", "Sear steak in pan to desired doneness.", "Serve with steamed green beans."],
        "ingredients": [("Sirloin Steak", 180, "g"), ("Sweet Potato", 150, "g"), ("Green Beans", 100, "g"), ("Olive Oil", 5, "ml"), ("Salt", 1, "g"), ("Black Pepper", 1, "g")]
    },
    {
        "id": 12,
        "title": "Beef & Broccoli Bowl",
        "calories": 410, "protein": 38, "carbs": 35, "fat": 15,
        "prep_time": 10, "cook_time": 15, "difficulty": "Easy",
        "image_url": "https://images.unsplash.com/photo-1541544744-378c545f1bfa?auto=format&fit=crop&w=800&q=80",
        "steps": ["Steam broccoli florets.", "Brown ground beef with garlic and ginger.", "Mix beef and broccoli with oyster sauce.", "Serve over rice."],
        "ingredients": [("Ground Beef (Lean)", 150, "g"), ("Broccoli", 150, "g"), ("Oyster Sauce", 15, "ml"), ("Cooked White Rice", 100, "g"), ("Garlic Minced", 5, "g"), ("Ginger Minced", 5, "g")]
    },

    # --- 海鲜 (Seafood) ---
    {
        "id": 13,
        "title": "Salmon & Asparagus",
        "calories": 480, "protein": 35, "carbs": 10, "fat": 32,
        "prep_time": 5, "cook_time": 15, "difficulty": "Medium",
        "image_url": "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80",
        "steps": ["Place salmon and asparagus on a baking sheet.", "Drizzle with olive oil and lemon.", "Bake at 200°C for 12-15 mins."],
        "ingredients": [("Salmon Fillet", 180, "g"), ("Asparagus", 100, "g"), ("Lemon Juice", 10, "ml"), ("Olive Oil", 10, "ml")]
    },
    {
        "id": 14,
        "title": "Shrimp & Quinoa Bowl",
        "calories": 380, "protein": 30, "carbs": 45, "fat": 8,
        "prep_time": 15, "cook_time": 10, "difficulty": "Easy",
        "image_url": "https://images.unsplash.com/photo-1555126634-323283e090fa?auto=format&fit=crop&w=800&q=80",
        "steps": ["Cook quinoa according to package.", "Sauté shrimp with garlic and paprika.", "Mix shrimp, quinoa, and chopped cucumber.", "Dress with lime juice."],
        "ingredients": [("Shrimp (Raw)", 150, "g"), ("Cooked Quinoa", 150, "g"), ("Cucumber", 80, "g"), ("Garlic Minced", 5, "g"), ("Paprika", 2, "g"), ("Lime Juice", 10, "ml")]
    },
    {
        "id": 15,
        "title": "Baked Cod with Veggies",
        "calories": 300, "protein": 35, "carbs": 20, "fat": 5,
        "prep_time": 10, "cook_time": 15, "difficulty": "Easy",
        "image_url": "https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=800&q=80",
        "steps": ["Season cod with herbs.", "Place on baking tray with cherry tomatoes and zucchini.", "Bake at 190°C for 15 mins."],
        "ingredients": [("Cod Fillet", 180, "g"), ("Cherry Tomatoes", 100, "g"), ("Zucchini", 150, "g"), ("Dried Mixed Herbs", 2, "g")]
    },
    {
        "id": 16,
        "title": "Tuna Salad Lettuce Wraps",
        "calories": 280, "protein": 35, "carbs": 5, "fat": 12,
        "prep_time": 10, "cook_time": 0, "difficulty": "Easy",
        "image_url": "https://images.unsplash.com/photo-1547496502-ffa2264a36b5?auto=format&fit=crop&w=800&q=80",
        "steps": ["Drain canned tuna.", "Mix tuna with yogurt, mustard, and celery.", "Scoop mixture into lettuce leaves.", "Sprinkle with black pepper."],
        "ingredients": [("Canned Tuna (Drained)", 120, "g"), ("Greek Yogurt", 30, "g"), ("Celery", 40, "g"), ("Lettuce Leaves", 40, "g"), ("Dijon Mustard", 5, "g"), ("Black Pepper", 1, "g")]
    },

    # --- 素食/轻食 (Vegetarian/Light) ---
    {
        "id": 17,
        "title": "Tofu Scramble",
        "calories": 310, "protein": 22, "carbs": 12, "fat": 18,
        "prep_time": 10, "cook_time": 10, "difficulty": "Easy",
        "image_url": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80",
        "steps": ["Crumble tofu.", "Sauté with turmeric, nutritional yeast, and onions.", "Add kale and cook until wilted."],
        "ingredients": [("Firm Tofu", 200, "g"), ("Kale", 50, "g"), ("Onion", 40, "g"), ("Nutritional Yeast", 10, "g"), ("Turmeric Powder", 2, "g")]
    },
    {
        "id": 18,
        "title": "Chickpea & Spinach Curry",
        "calories": 420, "protein": 18, "carbs": 60, "fat": 12,
        "prep_time": 10, "cook_time": 20, "difficulty": "Medium",
        "image_url": "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=800&q=80",
        "steps": ["Sauté onions and curry paste.", "Add coconut milk and chickpeas.", "Simmer for 15 mins.", "Stir in spinach."],
        "ingredients": [("Chickpeas (Canned/Drained)", 200, "g"), ("Coconut Milk (Light)", 100, "ml"), ("Spinach", 50, "g"), ("Red Curry Paste", 15, "g"), ("Onion", 50, "g")]
    },
    {
        "id": 19,
        "title": "Lentil Soup",
        "calories": 350, "protein": 20, "carbs": 55, "fat": 4,
        "prep_time": 15, "cook_time": 30, "difficulty": "Medium",
        "image_url": "https://images.unsplash.com/photo-1547592166-23acbe3a624b?auto=format&fit=crop&w=800&q=80",
        "steps": ["Sauté carrots, celery, and onions.", "Add lentils and vegetable broth.", "Simmer for 30 mins until lentils are soft.", "Blend partially for texture."],
        "ingredients": [("Dried Lentils", 100, "g"), ("Carrot", 80, "g"), ("Celery", 40, "g"), ("Onion", 50, "g"), ("Vegetable Broth", 500, "ml")]
    },
    {
        "id": 20,
        "title": "Cottage Cheese & Fruit Bowl",
        "calories": 250, "protein": 28, "carbs": 25, "fat": 4,
        "prep_time": 3, "cook_time": 0, "difficulty": "Easy",
        "image_url": "https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?auto=format&fit=crop&w=800&q=80",
        "steps": ["Serve cottage cheese in a bowl.", "Top with sliced peaches or berries.", "Drizzle slightly with honey."],
        "ingredients": [("Low-Fat Cottage Cheese", 200, "g"), ("Peach (Sliced)", 100, "g"), ("Honey", 5, "ml")]
    }
]

def generate_csv_files():
    print("Generating Commercial-Ready CSV files...")

    script_dir = os.path.dirname(os.path.abspath(__file__))

    # 1. 生成 recipes.csv
    recipes_path = os.path.join(script_dir, 'recipes_v2.csv')
    with open(recipes_path, mode='w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file)
        writer.writerow(['id', 'title', 'image_url', 'calories', 'protein', 'carbs', 'fat', 'prep_time', 'cook_time', 'difficulty', 'steps'])

        for r in recipes_data:
            steps_json = json.dumps(r['steps'])
            writer.writerow([
                r['id'], r['title'], r['image_url'],
                r['calories'], r['protein'], r['carbs'], r['fat'],
                r['prep_time'], r['cook_time'], r['difficulty'],
                steps_json
            ])

    # 2. 生成 recipe_ingredients.csv
    ingredients_path = os.path.join(script_dir, 'recipe_ingredients_v2.csv')
    with open(ingredients_path, mode='w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file)
        writer.writerow(['recipe_id', 'name', 'amount', 'unit'])

        for r in recipes_data:
            for ing in r['ingredients']:
                writer.writerow([r['id'], ing[0], ing[1], ing[2]])

    print(f"✅ Success! Generated valid data for {len(recipes_data)} recipes.")
    print(f"Files created:")
    print(f"  - {recipes_path}")
    print(f"  - {ingredients_path}")

if __name__ == "__main__":
    generate_csv_files()
