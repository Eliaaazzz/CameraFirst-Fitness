import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import { Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

/**
 * AI Pose Analysis Screen
 * Users can capture or select training videos/images for AI analysis feedback
 */
export default function PoseAnalysisScreen() {
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [exerciseType, setExerciseType] = useState<string>('squat');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  const exerciseTypes = [
    { id: 'squat', name: 'Squat', icon: '🏋️' },
    { id: 'deadlift', name: 'Deadlift', icon: '💪' },
    { id: 'bench_press', name: 'Bench Press', icon: '🏋️‍♂️' },
    { id: 'yoga', name: 'Yoga', icon: '🧘' },
    { id: 'plank', name: 'Plank', icon: '🤸' },
  ];

  /**
   * Take a photo
   */
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera Permission Required', 'Please allow camera access in settings');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [3, 4],
    });

    if (!result.canceled && result.assets[0]) {
      setMediaUri(result.assets[0].uri);
      setMediaType('image');
      setAnalysisResult(null);
    }
  };

  /**
   * Record a video
   */
  const recordVideo = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera Permission Required', 'Please allow camera access in settings');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['videos'],
      quality: ImagePicker.UIImagePickerControllerQualityType.Medium,
      videoMaxDuration: 30, // Maximum 30 seconds
    });

    if (!result.canceled && result.assets[0]) {
      setMediaUri(result.assets[0].uri);
      setMediaType('video');
      setAnalysisResult(null);
    }
  };

  /**
   * Pick from gallery
   */
  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Gallery Permission Required', 'Please allow gallery access in settings');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.8,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setMediaUri(asset.uri);
      setMediaType(asset.type === 'video' ? 'video' : 'image');
      setAnalysisResult(null);
    }
  };

  /**
   * Upload and analyze
   */
  const analyzeWorkout = async () => {
    if (!mediaUri) {
      Alert.alert('Notice', 'Please capture or select a training video/image first');
      return;
    }

    setIsAnalyzing(true);

    try {
      // Prepare form data
      const formData = new FormData();
      
      // Add file
      const uriParts = mediaUri.split('.');
      const fileType = uriParts[uriParts.length - 1];
      formData.append('file', {
        uri: mediaUri,
        name: `workout.${fileType}`,
        type: mediaType === 'video' ? `video/${fileType}` : `image/${fileType}`,
      } as any);

      // Add request data
      const requestData = {
        userId: '550e8400-e29b-41d4-a716-446655440000', // TODO: Get from user state
        exerciseType: exerciseType,
      };
      formData.append('data', JSON.stringify(requestData));

      // Send request
      const response = await axios.post(
        'http://localhost:8080/api/v1/pose/analyze',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'X-API-Key': 'your-api-key-here', // TODO: Get from config
          },
          timeout: 60000, // 60 second timeout
        }
      );

      setAnalysisResult(response.data);
      Alert.alert('Analysis Complete', 'AI has finished the pose analysis!');
    } catch (error: any) {
      console.error('Analysis failed:', error);
      Alert.alert(
        'Analysis Failed',
        error.response?.data?.message || 'Network error, please try again later'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * Render analysis results
   */
  const renderAnalysisResult = () => {
    if (!analysisResult) return null;

    const detail = analysisResult.details[0]; // Show first analysis result

    return (
      <View style={styles.resultContainer}>
        <Text style={styles.resultTitle}>Analysis Results</Text>
        
        {/* Score */}
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>Pose Score</Text>
          <Text style={styles.scoreValue}>{detail.score}/10</Text>
          <View style={styles.scoreBar}>
            <View style={[styles.scoreBarFill, { width: `${detail.score * 10}%` }]} />
          </View>
        </View>

        {/* Analysis text */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Detailed Analysis</Text>
          <Text style={styles.sectionText}>{detail.analysis}</Text>
        </View>

        {/* Detected issues */}
        {detail.issues.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚠️ Detected Issues</Text>
            {detail.issues.map((issue, index) => (
              <Text key={index} style={styles.issueItem}>• {issue}</Text>
            ))}
          </View>
        )}

        {/* Improvement suggestions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Improvement Suggestions</Text>
          <Text style={styles.sectionText}>{detail.suggestions}</Text>
        </View>

        {/* Action buttons */}
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setMediaUri(null);
            setAnalysisResult(null);
          }}
        >
          <Text style={styles.retryButtonText}>Analyze Again</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>AI Pose Analysis</Text>
      <Text style={styles.subtitle}>Capture training videos/images for professional feedback</Text>

      {/* Select exercise type */}
      <View style={styles.exerciseTypeContainer}>
        <Text style={styles.sectionLabel}>Select Exercise Type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {exerciseTypes.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.exerciseTypeButton,
                exerciseType === type.id && styles.exerciseTypeButtonActive,
              ]}
              onPress={() => setExerciseType(type.id)}
            >
              <Text style={styles.exerciseTypeIcon}>{type.icon}</Text>
              <Text
                style={[
                  styles.exerciseTypeText,
                  exerciseType === type.id && styles.exerciseTypeTextActive,
                ]}
              >
                {type.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Media preview */}
      {mediaUri && (
        <View style={styles.previewContainer}>
          {mediaType === 'image' ? (
            <Image source={{ uri: mediaUri }} style={styles.previewImage} />
          ) : (
            <Video
              source={{ uri: mediaUri }}
              style={styles.previewVideo}
              useNativeControls
              resizeMode="contain"
            />
          )}
        </View>
      )}

      {/* Capture/Select buttons */}
      {!mediaUri && (
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={takePhoto}>
            <MaterialIcons name="camera-alt" size={32} color="#fff" />
            <Text style={styles.actionButtonText}>Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={recordVideo}>
            <MaterialIcons name="videocam" size={32} color="#fff" />
            <Text style={styles.actionButtonText}>Video</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={pickFromGallery}>
            <MaterialIcons name="photo-library" size={32} color="#fff" />
            <Text style={styles.actionButtonText}>Gallery</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Analyze button */}
      {mediaUri && !analysisResult && (
        <TouchableOpacity
          style={[styles.analyzeButton, isAnalyzing && styles.analyzeButtonDisabled]}
          onPress={analyzeWorkout}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? (
            <>
              <ActivityIndicator color="#fff" style={{ marginRight: 10 }} />
              <Text style={styles.analyzeButtonText}>AI Analyzing...</Text>
            </>
          ) : (
            <>
              <MaterialIcons name="psychology" size={24} color="#fff" />
              <Text style={styles.analyzeButtonText}>Start AI Analysis</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Analysis results */}
      {renderAnalysisResult()}
    </ScrollView>
  );
}

// Type definitions
interface AnalysisResult {
  sessionId: string;
  exerciseType: string;
  overallScore: number;
  status: string;
  analyzedAt: string;
  details: Array<{
    score: number;
    analysis: string;
    suggestions: string;
    issues: string[];
    timestampSeconds: number;
  }>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  exerciseTypeContainer: {
    marginBottom: 24,
  },
  exerciseTypeButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    backgroundColor: '#fff',
    marginRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  exerciseTypeButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  exerciseTypeIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  exerciseTypeText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  exerciseTypeTextActive: {
    color: '#fff',
  },
  previewContainer: {
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  previewImage: {
    width: '100%',
    height: 300,
    resizeMode: 'contain',
  },
  previewVideo: {
    width: '100%',
    height: 300,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: '#2196F3',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: 6,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  analyzeButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  analyzeButtonDisabled: {
    backgroundColor: '#ccc',
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  resultContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 24,
    padding: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
  },
  scoreLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 12,
  },
  scoreBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
  },
  issueItem: {
    fontSize: 14,
    color: '#E53935',
    lineHeight: 24,
    paddingLeft: 8,
  },
  retryButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
