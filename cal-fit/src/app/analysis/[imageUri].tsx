import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, Alert, ScrollView, Text, Pressable, ActivityIndicator, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCamera } from '@/contexts/CameraContext';
import { triggerAiAnalysis } from '@/lib/ai';
import { mealApi, imageCacheApi, creditTransactionApi } from '@/lib/db';

import { useUser } from '@/contexts/UserContext';

export default function AnalysisScreen() {
  const { user } = useUser();
  const { imageUri: uriParam } = useLocalSearchParams<{ imageUri?: string }>();
  
  const [analysis, setAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credits, setCredits] = useState(4);

  const processedImageUri = uriParam;

  const loadCredits = useCallback(async () => {
    if (!user) return;

    const { data } = await creditTransactionApi.getByUserId(user.id);
    if (data) {
      const totalCredits = data.reduce((sum: number, tx: any) => sum + tx.amount, 0);
      setCredits(totalCredits);
    }
  }, [user]);

  const analyzeMeal = useCallback(async () => {
    if (!processedImageUri || !user) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch(processedImageUri);
      const blob = await response.blob();
      const buffer = await blob.arrayBuffer();
      const hash = await crypto.subtle.digest('SHA-256', buffer);
      const hashHex = Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const { data: cached } = await imageCacheApi.getByHash(hashHex);
      if (cached && cached.length > 0) {
        setAnalysis(cached[0].analysis_json);
        setIsAnalyzing(false);
        return;
      }

      if (credits < 5) {
        setError('Not enough credits. Please purchase more credits to analyze this meal.');
        setIsAnalyzing(false);
        return;
      }

      const analysisResult = await triggerAiAnalysis(processedImageUri);

      await mealApi.create({
        user_id: user.id,
        photo_url: processedImageUri,
        analysis_json: analysisResult,
        is_manual: false,
      });

      await imageCacheApi.create(processedImageUri, hashHex, analysisResult);

      setAnalysis(analysisResult);
      setCredits(credits - 5);

    } catch (err) {
      console.error('Analysis error:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze meal. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [processedImageUri, user, credits]);

  const handleSave = useCallback(async () => {
    if (!analysis || !user) return;

    try {
      await mealApi.create({
        user_id: user.id,
        photo_url: processedImageUri,
        analysis_json: analysis,
        is_manual: false,
      });

      const response = await fetch(processedImageUri || '');
      const blob = await response.blob();
      const buffer = await blob.arrayBuffer();
      const hash = await crypto.subtle.digest('SHA-256', buffer);
      const hashHex = Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      await imageCacheApi.create(processedImageUri || '', hashHex, analysis);

      Alert.alert(
        'Saved!',
        'Your meal has been saved to your history.',
        [{ text: 'OK', onPress: () => router.replace('/home' as any) }]
      );
    } catch (err) {
      Alert.alert('Error', 'Failed to save meal. Please try again.');
    }
  }, [analysis, user, processedImageUri]);

  useEffect(() => {
    if (processedImageUri) {
      analyzeMeal();
    }
  }, [processedImageUri, analyzeMeal]);

  useEffect(() => {
    if (user) {
      loadCredits();
    }
  }, [user, loadCredits]);

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Analysis Failed</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            
            {credits < 5 && (
              <Pressable 
                style={styles.creditsChip}
                onPress={() => router.push('/profile' as any)}
              >
                <Text style={styles.creditsChipText}>Purchase Credits</Text>
              </Pressable>
            )}

            <Pressable 
              style={styles.retryButton}
              onPress={() => router.push('/camera' as any)}
            >
              <Text style={styles.retryButtonText}>Try Another Photo</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Analysis Results</Text>
          {processedImageUri && (
            <Text style={styles.image}>[Image]</Text>
          )}
        </View>

        {isAnalyzing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#208AEF" />
            <Text style={styles.loadingText}>Analyzing your meal...</Text>
          </View>
        ) : analysis ? (
          <View style={styles.resultsContainer}>
            <Text style={styles.subtitle}>Nutritional Information</Text>
            
            <View style={styles.macrosGrid}>
              <View style={styles.macroCard}>
                <Text style={styles.macroLabel}>Calories</Text>
                <Text style={styles.macroValue}>{analysis.calories.toFixed(0)}</Text>
                <Text style={styles.macroUnit}>kcal</Text>
              </View>
              
              <View style={styles.macroCard}>
                <Text style={styles.macroLabel}>Protein</Text>
                <Text style={styles.macroValue}>{analysis.protein.toFixed(1)}</Text>
                <Text style={styles.macroUnit}>g</Text>
              </View>
              
              <View style={styles.macroCard}>
                <Text style={styles.macroLabel}>Carbs</Text>
                <Text style={styles.macroValue}>{analysis.carbs.toFixed(1)}</Text>
                <Text style={styles.macroUnit}>g</Text>
              </View>
              
              <View style={styles.macroCard}>
                <Text style={styles.macroLabel}>Fat</Text>
                <Text style={styles.macroValue}>{analysis.fat.toFixed(1)}</Text>
                <Text style={styles.macroUnit}>g</Text>
              </View>
              
              {analysis.fiber !== undefined && (
                <View style={styles.macroCard}>
                  <Text style={styles.macroLabel}>Fiber</Text>
                  <Text style={styles.macroValue}>{analysis.fiber.toFixed(1)}</Text>
                  <Text style={styles.macroUnit}>g</Text>
                </View>
              )}
            </View>

            <View style={styles.editContainer}>
              <Text style={styles.editLabel}>Adjust values if needed:</Text>
              {['calories', 'protein', 'carbs', 'fat', 'fiber'].map((field) => (
                <View key={field} style={styles.editRow}>
                  <Text style={styles.editLabel}>
                    {field.charAt(0).toUpperCase() + field.slice(1)}
                  </Text>
                  <TextInput
                    style={styles.editInput}
                    value={String(analysis[field as keyof typeof analysis] || '')}
                    onChangeText={(value) => {
                      const numValue = parseFloat(value);
                      if (!isNaN(numValue)) {
                        setAnalysis((prev: any) => prev ? { ...prev, [field]: numValue } : null);
                      }
                    }}
                    keyboardType="decimal-pad"
                  />
                </View>
              ))}
            </View>

            {analysis.confidence && (
              <View style={styles.confidenceContainer}>
                <Text style={styles.subtitle}>Confidence Scores</Text>
                <View style={styles.confidenceGrid}>
                  {Object.entries(analysis.confidence).map(([key, value]) => (
                    <View key={key} style={styles.confidenceItem}>
                      <Text style={styles.confidenceLabel}>{key}</Text>
                      <Text style={styles.confidenceValue}>{((value as number) * 100).toFixed(0)}%</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <Pressable 
              style={styles.saveButton}
              onPress={handleSave}
            >
              <Text style={styles.saveButtonText}>Save to History</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No analysis results available.
            </Text>
            <Pressable 
              style={styles.emptyButton}
              onPress={() => router.push('/camera' as any)}
            >
              <Text style={styles.emptyButtonText}>Take Photo</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  image: {
    width: '100%',
    height: 200,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    textAlign: 'center',
    lineHeight: 200,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  resultsContainer: {
    gap: 24,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  macrosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  macroCard: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  macroLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  macroValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  macroUnit: {
    fontSize: 12,
    color: '#999',
  },
  editContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
  },
  editLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  editRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  editInput: {
    width: 80,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    padding: 8,
    textAlign: 'right',
  },
  confidenceContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
  },
  confidenceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  confidenceItem: {
    width: '48%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
  },
  confidenceLabel: {
    fontSize: 14,
    color: '#666',
  },
  confidenceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#208AEF',
  },
  saveButton: {
    backgroundColor: '#208AEF',
    paddingVertical: 16,
    borderRadius: 12,
  },
  saveButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorCard: {
    width: '100%',
    maxWidth: 400,
    padding: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  errorTitle: {
    color: '#f44336',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  errorMessage: {
    color: '#666',
    marginBottom: 16,
  },
  creditsChip: {
    backgroundColor: '#E3F2FD',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginBottom: 16,
  },
  creditsChipText: {
    color: '#208AEF',
  },
  retryButton: {
    backgroundColor: '#208AEF',
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: '#208AEF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
  },
});
