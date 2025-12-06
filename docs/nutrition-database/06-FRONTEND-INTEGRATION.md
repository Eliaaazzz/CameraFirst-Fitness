# Frontend Integration: Food Search & Database Usage

> Version: 1.0.0  
> Date: 2025-12-06  
> Target: AuraFitness React Native Frontend

---

## I. Overview

This document covers how to integrate food database search into AuraFitness frontend. Currently, the app only uses image-based food recognition. Now we'll add:

1. **Pre-image:** Option to search/select foods from database before taking photo
2. **Post-image:** Use database to verify/enhance AI detection results

**Workflow:**
```
User selects meal type
    ├─ Option 1: Search food database
    │   ├─ Search → Select → Log meal
    │   └─ End (quick path)
    │
    └─ Option 2: Take food photo
        ├─ AI analyzes image
        ├─ Cross-checks with database
        ├─ Shows options to refine
        └─ Log meal
```

---

## II. API Additions

### 2.1 New Endpoints

Add to existing `/api/v1/foods` endpoints:

```
GET /foods/search?query=apple&limit=10
  Returns: List<FoodSearchResponse>
  
GET /foods/{id}
  Returns: FoodSearchResponse (with full nutrition)
```

**Response:**
```typescript
interface FoodSearchResponse {
  id: number;
  fdcId: string;
  nameEn: string;
  nameZh?: string;
  category: string;
  foodState: string;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    qualityScore: number;  // 0-1
  };
}
```

---

## III. Frontend Components

### 3.1 Hook: Food Search

Create `hooks/useFoodSearch.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/apiClient';

export interface FoodSearchResponse {
  id: number;
  fdcId: string;
  nameEn: string;
  nameZh?: string;
  category: string;
  foodState: string;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    qualityScore: number;
  };
}

export const useFoodSearch = (query: string, limit: number = 10) => {
  return useQuery({
    queryKey: ['foodSearch', query, limit],
    queryFn: async () => {
      if (!query || query.trim().length < 2) {
        return { foods: [] };
      }
      
      const response = await apiClient.get('/api/v1/foods/search', {
        params: { query, limit }
      });
      
      return response.data;
    },
    enabled: query.trim().length >= 2,
    staleTime: 5 * 60 * 1000,      // 5 minutes
    cacheTime: 30 * 60 * 1000,     // 30 minutes
  });
};

export const useFoodDetail = (foodId: number | null) => {
  return useQuery({
    queryKey: ['foodDetail', foodId],
    queryFn: async () => {
      if (!foodId) return null;
      
      const response = await apiClient.get(`/api/v1/foods/${foodId}`);
      return response.data;
    },
    enabled: !!foodId,
    staleTime: 1 * 60 * 60 * 1000, // 1 hour
    cacheTime: 24 * 60 * 60 * 1000, // 24 hours
  });
};
```

### 3.2 Component: Food Search Screen

Create `screens/FoodSearchScreen.tsx`:

```typescript
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useFoodSearch, FoodSearchResponse } from '../hooks/useFoodSearch';
import { useDebounce } from '../hooks/useDebounce';

interface FoodSearchScreenProps {
  onFoodSelected: (food: FoodSearchResponse) => void;
  onCancel: () => void;
}

export const FoodSearchScreen: React.FC<FoodSearchScreenProps> = ({
  onFoodSelected,
  onCancel,
}) => {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  
  const { data, isLoading, error } = useFoodSearch(debouncedQuery);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Search Foods</Text>
        <TouchableOpacity onPress={onCancel}>
          <Text style={styles.cancelBtn}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchBox}>
        <TextInput
          placeholder="Search foods (e.g., apple, chicken, rice)"
          value={query}
          onChangeText={setQuery}
          style={styles.input}
          placeholderTextColor="#999"
          editable={!isLoading}
        />
        {isLoading && <ActivityIndicator size="small" color="#007AFF" />}
      </View>

      {/* Results */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Search failed. Please try again.</Text>
        </View>
      )}

      {!isLoading && query.trim().length >= 2 && (!data?.foods || data.foods.length === 0) && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No foods found for "{query}"</Text>
        </View>
      )}

      <FlatList
        data={data?.foods || []}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <FoodListItem food={item} onSelect={() => onFoodSelected(item)} />
        )}
        scrollEnabled={true}
        showsVerticalScrollIndicator={true}
      />
    </View>
  );
};

const FoodListItem: React.FC<{
  food: FoodSearchResponse;
  onSelect: () => void;
}> = ({ food, onSelect }) => {
  const qualityBadge = getQualityBadge(food.nutrition.qualityScore);

  return (
    <TouchableOpacity onPress={onSelect} style={styles.listItem}>
      <View style={styles.itemContent}>
        <View style={styles.itemHeader}>
          <Text style={styles.foodName}>{food.nameEn}</Text>
          <Text style={[styles.qualityBadge, { color: qualityBadge.color }]}>
            {qualityBadge.text}
          </Text>
        </View>

        {food.nameZh && <Text style={styles.foodNameZh}>{food.nameZh}</Text>}

        <View style={styles.metaRow}>
          {food.category && <Text style={styles.meta}>{food.category}</Text>}
          {food.foodState && <Text style={styles.meta}>{food.foodState}</Text>}
        </View>

        <View style={styles.nutritionRow}>
          <NutritionBadge label="Kcal" value={food.nutrition.calories} />
          <NutritionBadge label="P" value={food.nutrition.protein} unit="g" />
          <NutritionBadge label="C" value={food.nutrition.carbs} unit="g" />
          <NutritionBadge label="F" value={food.nutrition.fat} unit="g" />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const NutritionBadge: React.FC<{
  label: string;
  value: number;
  unit?: string;
}> = ({ label, value, unit = '' }) => (
  <View style={styles.nutritionBadge}>
    <Text style={styles.badgeLabel}>{label}</Text>
    <Text style={styles.badgeValue}>
      {Math.round(value)}
      {unit}
    </Text>
  </View>
);

function getQualityBadge(score: number) {
  if (score >= 0.9) return { text: 'A', color: '#34C759' };
  if (score >= 0.8) return { text: 'B', color: '#34C759' };
  if (score >= 0.7) return { text: 'C', color: '#FF9500' };
  if (score >= 0.6) return { text: 'D', color: '#FF9500' };
  return { text: 'F', color: '#FF3B30' };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  cancelBtn: {
    fontSize: 16,
    color: '#007AFF',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  input: {
    flex: 1,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  errorContainer: {
    padding: 16,
    alignItems: 'center',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
  },
  listItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  itemContent: {
    gap: 8,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  foodName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  foodNameZh: {
    fontSize: 14,
    color: '#666',
  },
  qualityBadge: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
  },
  meta: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  nutritionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  nutritionBadge: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignItems: 'center',
  },
  badgeLabel: {
    fontSize: 10,
    color: '#666',
    fontWeight: '600',
  },
  badgeValue: {
    fontSize: 12,
    fontWeight: '700',
  },
});
```

### 3.3 Hook: Debounce (helper)

Create `hooks/useDebounce.ts`:

```typescript
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}
```

---

## IV. Update Meal Logging Flow

### 4.1 Enhanced Meal Type Selection

Update `ReviewMealScreen.tsx` to offer food search option:

```typescript
// In ReviewMealScreen or a parent component

const [showFoodSearch, setShowFoodSearch] = useState(false);

if (showFoodSearch) {
  return (
    <FoodSearchScreen
      onFoodSelected={(food) => {
        // Convert food to meal item
        const mealItem: DetectedFood = {
          id: food.id.toString(),
          name: food.nameEn,
          amount: 100,  // Default to 100g
          unit: 'g',
          calories: food.nutrition.calories,
          protein: food.nutrition.protein,
          carbs: food.nutrition.carbs,
          fat: food.nutrition.fat,
          confidence: 1.0,  // Database = high confidence
        };

        // Close search, add to meal
        setShowFoodSearch(false);
        // ... add to meal items ...
      }}
      onCancel={() => setShowFoodSearch(false)}
    />
  );
}

// In UI, add option:
<TouchableOpacity
  style={styles.button}
  onPress={() => setShowFoodSearch(true)}
>
  <Text style={styles.buttonText}>Search Food Database</Text>
</TouchableOpacity>
```

### 4.2 Update API Client for New Endpoint

Ensure `nutritionApi.ts` has food search:

```typescript
// In nutritionApi.ts

export const searchFoods = async (query: string, limit: number = 10) => {
  return await api.get(`/api/v1/foods/search`, {
    params: { query, limit }
  });
};

export const getFoodById = async (foodId: number) => {
  return await api.get(`/api/v1/foods/${foodId}`);
};
```

---

## V. Edge Cases

### 5.1 Quantity & Portion Adjustment

Allow users to adjust portion size when selecting from database:

```typescript
interface FoodPortionRequest {
  foodId: number;
  quantity: number;
  unit: 'g' | 'oz' | 'cup' | 'piece';
}

// Helper to scale nutrition
function scaleNutrition(food: FoodSearchResponse, amount: number): DetectedFood {
  const factor = amount / 100;  // USDA data is per 100g
  
  return {
    id: food.id.toString(),
    name: food.nameEn,
    amount,
    unit: 'g',
    calories: Math.round(food.nutrition.calories * factor),
    protein: food.nutrition.protein * factor,
    carbs: food.nutrition.carbs * factor,
    fat: food.nutrition.fat * factor,
    confidence: 1.0,
  };
}
```

### 5.2 Offline Support

Cache recently used foods:

```typescript
// hooks/useFoodCache.ts
export const useFoodCache = () => {
  const cacheKey = 'recentFoods';
  
  const addToCache = async (food: FoodSearchResponse) => {
    const cached = await AsyncStorage.getItem(cacheKey);
    const foods = cached ? JSON.parse(cached) : [];
    
    // Remove duplicate, add to top
    const updated = [food, ...foods.filter(f => f.id !== food.id)].slice(0, 10);
    
    await AsyncStorage.setItem(cacheKey, JSON.stringify(updated));
  };
  
  const getCache = async () => {
    const cached = await AsyncStorage.getItem(cacheKey);
    return cached ? JSON.parse(cached) : [];
  };
  
  return { addToCache, getCache };
};
```

---

## VI. Testing

### 6.1 Component Test

```typescript
// __tests__/screens/FoodSearchScreen.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { FoodSearchScreen } from '../../screens/FoodSearchScreen';

jest.mock('../../hooks/useFoodSearch', () => ({
  useFoodSearch: () => ({
    data: {
      foods: [
        {
          id: 1,
          fdcId: '123456',
          nameEn: 'Apple',
          category: 'FRUIT',
          foodState: 'RAW',
          nutrition: {
            calories: 52,
            protein: 0.26,
            carbs: 13.81,
            fat: 0.17,
            qualityScore: 0.95,
          },
        },
      ],
    },
    isLoading: false,
    error: null,
  }),
}));

describe('FoodSearchScreen', () => {
  it('renders search input', () => {
    const mockOnSelect = jest.fn();
    render(
      <FoodSearchScreen
        onFoodSelected={mockOnSelect}
        onCancel={() => {}}
      />
    );

    const input = screen.getByPlaceholderText(/search foods/i);
    expect(input).toBeTruthy();
  });

  it('displays food results', async () => {
    const mockOnSelect = jest.fn();
    render(
      <FoodSearchScreen
        onFoodSelected={mockOnSelect}
        onCancel={() => {}}
      />
    );

    const input = screen.getByPlaceholderText(/search foods/i);
    fireEvent.changeText(input, 'apple');

    await waitFor(() => {
      const apple = screen.getByText('Apple');
      expect(apple).toBeTruthy();
    });
  });

  it('calls onFoodSelected when food is tapped', async () => {
    const mockOnSelect = jest.fn();
    render(
      <FoodSearchScreen
        onFoodSelected={mockOnSelect}
        onCancel={() => {}}
      />
    );

    const input = screen.getByPlaceholderText(/search foods/i);
    fireEvent.changeText(input, 'apple');

    await waitFor(() => {
      const apple = screen.getByText('Apple');
      fireEvent.press(apple);
      expect(mockOnSelect).toHaveBeenCalled();
    });
  });
});
```

---

## VII. Integration Steps

1. **Add FoodSearchScreen component** to your screens folder
2. **Add useFoodSearch hook** to your hooks folder
3. **Update ReviewMealScreen** to show "Search Database" option
4. **Update nutritionApi.ts** to expose search endpoints
5. **Test with backend running** (get list of foods from `GET /api/v1/foods/search?query=apple`)
6. **Add to navigation** (optional: tab or modal)

---

## VIII. Performance Considerations

- Search debounce: 300ms (prevents excessive requests)
- Cache: 5 min stale time, 30 min cache time
- Result limit: 10 by default
- Request timeout: 10 seconds

---

## IX. Next Steps

After frontend is working:
1. Add food quantity/portion UI refinement
2. Add recent foods quick access
3. Add favorite foods functionality
4. Integrate with barcode scanning (optional)



## IV. Environment & Configuration

- API_BASE_URL (omit /api/v1 to avoid double prefix), API_KEY, API_TIMEOUT, FEATURE_FLAGS (e.g., enableFoodDbSearch, enableImageRecognition).
- Image upload field: `image`; endpoint `/api/v1/nutrition/analyze`; Content-Type multipart/form-data.
- Default user: use `default-user` when not logged in; switch to the real userId after authentication.

## V. Error / Empty / Loading States

- Empty or <2 character search: do not request; show a hint.
- No results: show a "not found" empty state; on errors show "search failed, please retry".
- Vision failure: show a toast/dialog, keep the picker open for retry, and log the error.
- Nutrition cards: use skeleton loading; on backend 500 show "temporarily unavailable" and allow manual refresh.

## VI. Caching & Expiry

- React Query: search results staleTime=5m, cacheTime=30m; food detail staleTime=1h, cacheTime=24h.
- Nutrition summary: daily/weekly summary cached 5m; invalidate when returning to the page to avoid stale data.

## VII. Analytics / Logging

- Tracking: search count, empty-result rate, vision success/failure reasons, manual quantity edits.
- Logging: API error codes, network timeouts, and validation failures for debugging.
