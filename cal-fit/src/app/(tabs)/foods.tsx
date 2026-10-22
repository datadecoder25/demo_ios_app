import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chips } from '@/components/kit';
import { COMMON_FOODS, draftFromCommon, FOOD_CATEGORIES, FoodCategory } from '@/components/foods/commonFoods';
import { searchFoods } from '@/components/foods/searchFoods';
import { draftFromSearch, FoodDraft, FoodSearchResult } from '@/components/foods/types';
import { useRecentFoods } from '@/components/foods/useRecentFoods';
import { colors, fonts, radius, screenPadding, shadow, type } from '@/constants/design';

const SEARCH_DEBOUNCE_MS = 350;
const MIN_QUERY = 2;

interface SearchState {
  query: string;
  foods: FoodSearchResult[];
  error: string | null;
}

function openLogFood(draft?: FoodDraft) {
  router.push(draft ? { pathname: '/log-food', params: { food: JSON.stringify(draft) } } : '/log-food');
}

function FoodRow({
  title,
  subtitle,
  emoji,
  tint,
  onPress,
  last,
}: {
  title: string;
  subtitle: string;
  emoji?: string;
  tint?: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Log ${title}`}
      style={({ pressed }) => [styles.row, !last && styles.rowBorder, pressed && styles.pressed]}
    >
      <View style={[styles.thumb, { backgroundColor: tint ?? colors.primaryTint }]}>
        {emoji ? <Text style={styles.emoji}>{emoji}</Text> : <Ionicons name="nutrition-outline" size={22} color={colors.primary} />}
      </View>
      <View style={styles.rowText}>
        <Text style={styles.name} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <View style={styles.add}>
        <Ionicons name="add" size={24} color={colors.primary} />
      </View>
    </Pressable>
  );
}

function servingMeta(draft: FoodDraft) {
  return `${Math.round(draft.nutrients.calories)} kcal  •  ${Math.round(draft.nutrients.protein)}g protein  •  ${draft.servingLabel}`;
}

export default function FoodsScreen() {
  const [category, setCategory] = useState<FoodCategory>('breakfast');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState<SearchState>({ query: '', foods: [], error: null });
  const [retryCount, setRetryCount] = useState(0);
  const recent = useRecentFoods();

  const trimmed = query.trim();
  const isSearching = trimmed.length >= MIN_QUERY;
  const isLoading = isSearching && search.query !== trimmed;

  // Debounced search; results are tagged with their query so stale responses are ignored.
  useEffect(() => {
    if (trimmed.length < MIN_QUERY) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const foods = await searchFoods(trimmed, controller.signal);
        setSearch({ query: trimmed, foods, error: null });
      } catch (error) {
        if (controller.signal.aborted) return;
        setSearch({
          query: trimmed,
          foods: [],
          error: error instanceof Error ? error.message : 'Food search failed. Please try again.',
        });
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, retryCount]);

  function retry() {
    setSearch(s => ({ ...s, query: '' }));
    setRetryCount(c => c + 1);
  }

  const customRow = (
    <Pressable
      onPress={() => openLogFood()}
      accessibilityRole="button"
      style={({ pressed }) => [styles.customRow, pressed && styles.pressed]}
    >
      <View style={styles.customIcon}>
        <Ionicons name="create-outline" size={20} color={colors.primary} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.name}>Create custom food</Text>
        <Text style={styles.meta}>Enter calories and macros yourself</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );

  const common = COMMON_FOODS[category];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Foods</Text>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search foods and brands"
            placeholderTextColor={colors.textMuted}
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Search foods"
            style={styles.searchInput}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        {isSearching ? (
          <>
            <Text style={styles.sectionTitle}>Results</Text>
            {isLoading ? (
              <View style={styles.state}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.stateText}>Searching…</Text>
              </View>
            ) : search.error ? (
              <View style={styles.state}>
                <Ionicons name="cloud-offline-outline" size={28} color={colors.textMuted} />
                <Text style={styles.stateText}>{search.error}</Text>
                <Pressable onPress={retry} accessibilityRole="button" hitSlop={8}>
                  <Text style={styles.link}>Try again</Text>
                </Pressable>
              </View>
            ) : search.foods.length === 0 ? (
              <View style={styles.state}>
                <Ionicons name="search-outline" size={28} color={colors.textMuted} />
                <Text style={styles.stateText}>No foods found for “{trimmed}”. Try another name or create it yourself.</Text>
              </View>
            ) : (
              <View style={styles.list}>
                {search.foods.map((food, i) => {
                  const draft = draftFromSearch(food);
                  return (
                    <FoodRow
                      key={food.id}
                      title={food.name}
                      subtitle={`${food.brand ? `${food.brand}  •  ` : ''}${servingMeta(draft)}`}
                      onPress={() => openLogFood(draft)}
                      last={i === search.foods.length - 1}
                    />
                  );
                })}
              </View>
            )}
            {!isLoading && <Text style={styles.credit}>Product data from Open Food Facts</Text>}
            {customRow}
          </>
        ) : (
          <>
            {customRow}

            {recent.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Recent</Text>
                <View style={styles.list}>
                  {recent.map((draft, i) => (
                    <FoodRow
                      key={draft.name}
                      title={draft.name}
                      subtitle={servingMeta(draft)}
                      emoji="🕘"
                      tint={colors.background}
                      onPress={() => openLogFood(draft)}
                      last={i === recent.length - 1}
                    />
                  ))}
                </View>
              </>
            )}

            <Text style={styles.sectionTitle}>Common foods</Text>
            <Text style={styles.hint}>Typical values per serving. Search above for exact products.</Text>
            <Chips options={FOOD_CATEGORIES} value={category} onChange={setCategory} />
            <View style={styles.list}>
              {common.map((food, i) => (
                <FoodRow
                  key={food.id}
                  title={food.name}
                  subtitle={`${food.calories} kcal  •  ${food.protein}g protein`}
                  emoji={food.emoji}
                  tint={food.tint}
                  onPress={() => openLogFood(draftFromCommon(food))}
                  last={i === common.length - 1}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingHorizontal: screenPadding,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 12,
  },
  title: {
    ...type.title,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    paddingHorizontal: 14,
    marginTop: 4,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.navy,
  },
  sectionTitle: {
    ...type.subheading,
    marginTop: 8,
  },
  hint: {
    ...type.caption,
    marginTop: -6,
  },
  list: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pressed: {
    opacity: 0.7,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 24,
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
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderStyle: 'dashed',
  },
  customIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  state: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 28,
    paddingHorizontal: 20,
  },
  stateText: {
    ...type.body,
    fontSize: 14,
    textAlign: 'center',
  },
  link: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.primary,
  },
  credit: {
    ...type.caption,
    textAlign: 'center',
  },
});
