import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chips } from '@/components/kit';
import { FOOD_CATEGORIES, FoodCategory, SAMPLE_FOODS, SampleFood } from '@/components/foods/sampleFoods';
import { colors, fonts, radius, screenPadding, shadow, type } from '@/constants/design';
import { useUser } from '@/contexts/UserContext';
import { Alert } from '@/lib/alert';
import { mealApi } from '@/lib/db';

export default function FoodsScreen() {
  const { user } = useUser();
  const [category, setCategory] = useState<FoodCategory>('breakfast');
  const [addingId, setAddingId] = useState<string | null>(null);

  async function addFood(food: SampleFood) {
    if (!user || addingId) return;

    setAddingId(food.id);
    const { data, error } = await mealApi.create({
      user_id: user.id,
      photo_url: null,
      is_manual: true,
      manual_name: food.name,
      analysis_json: {
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        fiber: food.fiber,
      },
    });
    setAddingId(null);

    if (error || !data?.[0]) {
      Alert.alert('Error', 'Could not add this food. Please try again.');
      return;
    }
    Alert.alert('Added', `${food.name} was added to today's diary.`);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.inner}>
        <Text style={styles.title}>Foods</Text>
        <View style={styles.chips}>
          <Chips options={FOOD_CATEGORIES} value={category} onChange={setCategory} />
        </View>

        <FlatList
          data={SAMPLE_FOODS[category]}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={[styles.thumb, { backgroundColor: item.tint }]}>
                <Text style={styles.emoji}>{item.emoji}</Text>
              </View>
              <View style={styles.rowText}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>
                  {item.calories} kcal  •  {item.protein}g protein
                </Text>
              </View>
              <Pressable
                onPress={() => addFood(item)}
                disabled={!!addingId}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={`Add ${item.name} to diary`}
                style={styles.add}
              >
                {addingId === item.id ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="add" size={24} color={colors.primary} />
                )}
              </Pressable>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inner: {
    flex: 1,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  title: {
    ...type.title,
    paddingHorizontal: screenPadding,
    paddingTop: 16,
  },
  chips: {
    paddingHorizontal: screenPadding,
    paddingTop: 14,
    paddingBottom: 6,
  },
  list: {
    marginHorizontal: screenPadding,
    marginTop: 10,
    marginBottom: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 26,
  },
  rowText: {
    flex: 1,
  },
  name: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.navy,
  },
  meta: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 3,
  },
  add: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
