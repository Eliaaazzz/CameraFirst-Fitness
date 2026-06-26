package com.fitnessapp.backend.coach.knowledge;

import java.util.List;

/**
 * Curated, source-attributed nutrition/health facts that ground the Coach agent's answers.
 *
 * <p>These are deliberately general, authoritative statements (dietary-guideline / public-health level)
 * — NOT individualized medical advice. Each becomes one retrievable, citable row. Keep each
 * {@code content} a self-contained sentence or two so it embeds and grounds cleanly.</p>
 */
public final class NutritionKnowledgeCorpus {

    private NutritionKnowledgeCorpus() {}

    /** One curated fact: an authority, a short title, the citable claim, a source URL, and topic tags. */
    public record Doc(String source, String title, String content, String url, String tags) {}

    public static List<Doc> docs() {
        return List.of(
            new Doc("USDA / IOM DRI", "Protein RDA for adults",
                "The Recommended Dietary Allowance for protein is 0.8 grams per kilogram of body weight per day for the average sedentary adult.",
                "https://www.nationalacademies.org/our-work/dietary-reference-intakes-tables-and-application",
                "protein,rda,macros"),
            new Doc("ISSN", "Protein intake for resistance training",
                "For people doing resistance training to build or maintain muscle, evidence supports 1.4 to 2.0 grams of protein per kilogram of body weight per day, above the sedentary RDA.",
                "https://jissn.biomedcentral.com/articles/10.1186/s12970-017-0177-8",
                "protein,muscle,training"),
            new Doc("Research consensus", "Per-meal protein for muscle synthesis",
                "Muscle protein synthesis is maximized by spreading protein across the day at roughly 0.4 grams per kilogram of body weight per meal over three to four meals, rather than one large dose.",
                "https://jissn.biomedcentral.com/articles/10.1186/s12970-018-0215-1",
                "protein,muscle,timing"),
            new Doc("WHO", "Added/free sugar limit",
                "The World Health Organization recommends reducing free sugars to less than 10% of total energy intake, with a further reduction below 5% for additional health benefits.",
                "https://www.who.int/news-room/fact-sheets/detail/healthy-diet",
                "sugar,added-sugar"),
            new Doc("IOM DRI", "Dietary fiber target",
                "Adequate fiber intake is about 25 grams per day for adult women and 38 grams per day for adult men, roughly 14 grams per 1000 kcal.",
                "https://www.nationalacademies.org/our-work/dietary-reference-intakes-tables-and-application",
                "fiber,carbs"),
            new Doc("FDA / Dietary Guidelines", "Sodium upper limit",
                "Dietary guidance recommends limiting sodium to less than 2300 milligrams per day for adults, equivalent to about one teaspoon of salt.",
                "https://www.dietaryguidelines.gov",
                "sodium,salt,blood-pressure"),
            new Doc("Dietary Guidelines 2020-2025", "Saturated fat limit",
                "Dietary guidance recommends limiting saturated fat to less than 10% of total daily calories, replacing it with unsaturated fats.",
                "https://www.dietaryguidelines.gov",
                "fat,saturated-fat,heart"),
            new Doc("WHO", "Industrial trans fat",
                "The World Health Organization calls for elimination of industrially produced trans fats, recommending intake below 1% of total energy.",
                "https://www.who.int/news-room/fact-sheets/detail/healthy-diet",
                "fat,trans-fat,heart"),
            new Doc("IOM DRI", "Total water intake",
                "Adequate total water intake (from drinks and food) is about 2.7 liters per day for women and 3.7 liters per day for men, varying with activity and climate.",
                "https://www.nationalacademies.org/our-work/dietary-reference-intakes-tables-and-application",
                "hydration,water"),
            new Doc("Nutrition science", "Glycemic index definition",
                "The glycemic index ranks carbohydrate-containing foods from 0 to 100 by how much they raise blood glucose after eating, relative to a reference such as pure glucose.",
                "https://www.health.harvard.edu/diseases-and-conditions/glycemic-index-and-glycemic-load-for-100-foods",
                "gi,carbs,blood-sugar"),
            new Doc("Nutrition science", "Glycemic load definition",
                "Glycemic load accounts for both the glycemic index and the amount of carbohydrate in a serving: GL = (GI x grams of available carbohydrate) / 100.",
                "https://www.health.harvard.edu/diseases-and-conditions/glycemic-index-and-glycemic-load-for-100-foods",
                "gl,gi,carbs,blood-sugar"),
            new Doc("ADA", "Carbohydrate approach in type 2 diabetes",
                "The American Diabetes Association states there is no single ideal macronutrient split for type 2 diabetes; emphasis is on carbohydrate quality, consistent carbohydrate intake, and an individualized eating pattern.",
                "https://diabetesjournals.org/care/issue/47/Supplement_1",
                "t2d,diabetes,carbs"),
            new Doc("WHO", "Fruit and vegetable intake",
                "Eating at least 400 grams (about five portions) of fruits and vegetables per day reduces the risk of noncommunicable diseases.",
                "https://www.who.int/news-room/fact-sheets/detail/healthy-diet",
                "fruit,vegetables,fiber"),
            new Doc("Dietary Guidelines", "Whole grains",
                "Dietary guidance recommends making at least half of grain intake whole grains, which retain bran and germ and more fiber than refined grains.",
                "https://www.dietaryguidelines.gov",
                "grains,fiber,carbs"),
            new Doc("Research consensus", "Protein and satiety",
                "Per calorie, protein is the most satiating macronutrient, which is one reason higher-protein diets can support appetite control during fat loss.",
                "https://pubmed.ncbi.nlm.nih.gov/25926512/",
                "protein,satiety,fat-loss"),
            new Doc("Energy balance", "Fat loss and energy deficit",
                "Fat loss requires a sustained energy deficit; a deficit of roughly 3500 kcal corresponds approximately to 0.45 kg (1 pound) of body fat, though real-world rates vary with water, glycogen and adaptation.",
                "https://www.niddk.nih.gov/health-information/weight-management",
                "fat-loss,calories,deficit"),
            new Doc("Dietary Guidelines", "Alcohol moderation",
                "If alcohol is consumed, dietary guidance recommends limiting intake to one drink or less per day for women and two drinks or less per day for men.",
                "https://www.dietaryguidelines.gov",
                "alcohol"),
            new Doc("WHO", "BMI as a screening tool",
                "Body mass index categorizes adults as underweight below 18.5, normal weight 18.5 to 24.9, overweight 25 to 29.9, and obese 30 or above; it is a population screening tool and does not directly measure body fat.",
                "https://www.who.int/health-topics/obesity",
                "bmi,weight"),
            new Doc("Dietary Guidelines", "Potassium intake",
                "Potassium is an under-consumed nutrient; guidance targets roughly 2600 to 3400 milligrams per day for adults, with fruits, vegetables and legumes as key sources.",
                "https://www.dietaryguidelines.gov",
                "potassium,minerals,blood-pressure"),
            new Doc("IOM DRI", "Calcium for adults",
                "The Recommended Dietary Allowance for calcium is about 1000 milligrams per day for adults aged 19 to 50.",
                "https://ods.od.nih.gov/factsheets/Calcium-HealthProfessional/",
                "calcium,minerals,bone"),
            new Doc("IOM DRI", "Vitamin D for adults",
                "The Recommended Dietary Allowance for vitamin D is 600 IU (15 micrograms) per day for adults up to age 70.",
                "https://ods.od.nih.gov/factsheets/VitaminD-HealthProfessional/",
                "vitamin-d,micronutrients"),
            new Doc("Research consensus", "Meal timing versus total intake",
                "For body-weight management, total daily energy and diet quality matter more than the specific timing of meals such as whether or not breakfast is eaten.",
                "https://pubmed.ncbi.nlm.nih.gov/31021400/",
                "timing,breakfast,weight"),
            new Doc("WHO 2023", "Non-sugar sweeteners for weight",
                "A 2023 WHO guideline advises against using non-sugar sweeteners for long-term weight control, as they were not found to confer lasting benefit for body fat in adults or children.",
                "https://www.who.int/news/item/15-05-2023-who-advises-not-to-use-non-sugar-sweeteners-for-weight-control-in-newly-released-guideline",
                "sweeteners,sugar,weight"),
            new Doc("Research consensus", "Ultra-processed foods",
                "Higher intake of ultra-processed foods is associated with greater total energy intake and weight gain in controlled and observational studies.",
                "https://pubmed.ncbi.nlm.nih.gov/31105044/",
                "ultra-processed,weight,calories")
        );
    }
}
