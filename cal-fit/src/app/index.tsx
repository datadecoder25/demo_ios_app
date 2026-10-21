import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View, Text, RefreshControl, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useUser } from '@/contexts/UserContext';
import { mealApi } from '@/lib/db';

interface MealItem {
  id: string;
  user_id: string;
  photo_url: string | null;
  analysis_json: any | null;
  created_at: string;
  is_manual: boolean;
  manual_name: string | null;
}

export default function HomeScreen() {
  const { user } = useUser();
  const [meals, setMeals] = useState<MealItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadMeals();
    }
  }, [user]);

  async function loadMeals() {
    if (!user) return;

    setIsLoading(true);
    const { data, error } = await mealApi.getByUserId(user.id);
    
    if (data) {
      setMeals(data);
    }
    setIsLoading(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadMeals();
    setRefreshing(false);
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>CalFit</Text>
        <Text style={styles.subtitle}>
          {user?.email || "Welcome!"}
        </Text>
      </View>
      
      <View style={styles.addMealButtonContainer}>
        <Text 
          style={styles.addMealButton}
          onPress={() => router.push('/camera')}
        >
          + Log New Meal
        </Text>
      </View>
      
      <FlatList
        data={meals}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>
                {item.is_manual ? item.manual_name : 'AI-Analyzed Meal'}
              </Text>
              <Text style={styles.cardSubtitle}>{formatDate(item.created_at)}</Text>
            </View>
            
            {item.analysis_json && (
              <View style={styles.macrosContainer}>
                <View style={styles.macroItem}>
                  <Text style={styles.macroLabel}>Calories</Text>
                  <Text style={styles.macroValue}>{Math.round(item.analysis_json.calories)}</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={styles.macroLabel}>Protein</Text>
                  <Text style={styles.macroValue}>{item.analysis_json.protein}g</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={styles.macroLabel}>Carbs</Text>
                  <Text style={styles.macroValue}>{item.analysis_json.carbs}g</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={styles.macroLabel}>Fat</Text>
                  <Text style={styles.macroValue}>{item.analysis_json.fat}g</Text>
                </View>
              </View>
            )}
            
            {item.is_manual && !item.analysis_json && (
              <View style={styles.manualEntryBadge}>
                <Text style={styles.manualEntryText}>Manual Entry</Text>
              </View>
            )}
          </View>
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No meals logged yet. Start tracking your nutrition!
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#208AEF',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
  },
  addMealButtonContainer: {
    padding: 16,
  },
  addMealButton: {
    backgroundColor: '#208AEF',
    color: '#fff',
    padding: 16,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    marginBottom: 16,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  macrosContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  macroItem: {
    alignItems: 'center',
  },
  macroLabel: {
    fontSize: 10,
    color: '#666',
  },
  macroValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  manualEntryBadge: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  manualEntryText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    opacity: 0.7,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
