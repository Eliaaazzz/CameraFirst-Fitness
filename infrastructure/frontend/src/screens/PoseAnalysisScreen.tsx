import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';

/**
 * AI姿势分析屏幕
 * 用户可以拍摄或选择训练视频/图片，上传后获得AI分析反馈
 */
export default function PoseAnalysisScreen() {
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [exerciseType, setExerciseType] = useState<string>('squat');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  const exerciseTypes = [
    { id: 'squat', name: '深蹲', icon: '🏋️' },
    { id: 'deadlift', name: '硬拉', icon: '💪' },
    { id: 'bench_press', name: '卧推', icon: '🏋️‍♂️' },
    { id: 'yoga', name: '瑜伽', icon: '🧘' },
    { id: 'plank', name: '平板支撑', icon: '🤸' },
  ];

  /**
   * 拍摄照片
   */
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('需要相机权限', '请在设置中允许相机访问');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
   * 录制视频
   */
  const recordVideo = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('需要相机权限', '请在设置中允许相机访问');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: ImagePicker.UIImagePickerControllerQualityType.Medium,
      videoMaxDuration: 30, // 最多30秒
    });

    if (!result.canceled && result.assets[0]) {
      setMediaUri(result.assets[0].uri);
      setMediaType('video');
      setAnalysisResult(null);
    }
  };

  /**
   * 从相册选择
   */
  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('需要相册权限', '请在设置中允许相册访问');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
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
   * 上传并分析
   */
  const analyzeWorkout = async () => {
    if (!mediaUri) {
      Alert.alert('提示', '请先拍摄或选择训练视频/图片');
      return;
    }

    setIsAnalyzing(true);

    try {
      // 准备表单数据
      const formData = new FormData();
      
      // 添加文件
      const uriParts = mediaUri.split('.');
      const fileType = uriParts[uriParts.length - 1];
      formData.append('file', {
        uri: mediaUri,
        name: `workout.${fileType}`,
        type: mediaType === 'video' ? `video/${fileType}` : `image/${fileType}`,
      } as any);

      // 添加请求数据
      const requestData = {
        userId: '550e8400-e29b-41d4-a716-446655440000', // TODO: 从用户状态获取
        exerciseType: exerciseType,
      };
      formData.append('data', JSON.stringify(requestData));

      // 发送请求
      const response = await axios.post(
        'http://localhost:8080/api/v1/pose/analyze',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'X-API-Key': 'your-api-key-here', // TODO: 从配置获取
          },
          timeout: 60000, // 60秒超时
        }
      );

      setAnalysisResult(response.data);
      Alert.alert('分析完成', 'AI已完成姿势分析！');
    } catch (error: any) {
      console.error('Analysis failed:', error);
      Alert.alert(
        '分析失败',
        error.response?.data?.message || '网络错误，请稍后重试'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * 渲染分析结果
   */
  const renderAnalysisResult = () => {
    if (!analysisResult) return null;

    const detail = analysisResult.details[0]; // 显示第一个分析结果

    return (
      <View style={styles.resultContainer}>
        <Text style={styles.resultTitle}>分析结果</Text>
        
        {/* 评分 */}
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>姿势评分</Text>
          <Text style={styles.scoreValue}>{detail.score}/10</Text>
          <View style={styles.scoreBar}>
            <View style={[styles.scoreBarFill, { width: `${detail.score * 10}%` }]} />
          </View>
        </View>

        {/* 分析文本 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 详细分析</Text>
          <Text style={styles.sectionText}>{detail.analysis}</Text>
        </View>

        {/* 检测到的问题 */}
        {detail.issues.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚠️ 检测到的问题</Text>
            {detail.issues.map((issue, index) => (
              <Text key={index} style={styles.issueItem}>• {issue}</Text>
            ))}
          </View>
        )}

        {/* 改进建议 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 改进建议</Text>
          <Text style={styles.sectionText}>{detail.suggestions}</Text>
        </View>

        {/* 操作按钮 */}
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setMediaUri(null);
            setAnalysisResult(null);
          }}
        >
          <Text style={styles.retryButtonText}>再分析一次</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>AI姿势分析</Text>
      <Text style={styles.subtitle}>拍摄训练视频/图片，获得专业纠错建议</Text>

      {/* 选择训练类型 */}
      <View style={styles.exerciseTypeContainer}>
        <Text style={styles.sectionLabel}>选择训练类型</Text>
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

      {/* 媒体预览 */}
      {mediaUri && (
        <View style={styles.previewContainer}>
          {mediaType === 'image' ? (
            <Image source={{ uri: mediaUri }} style={styles.previewImage} />
          ) : (
            <Video
              source={{ uri: mediaUri }}
              style={styles.previewVideo}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
            />
          )}
        </View>
      )}

      {/* 拍摄/选择按钮 */}
      {!mediaUri && (
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={takePhoto}>
            <MaterialIcons name="camera-alt" size={32} color="#fff" />
            <Text style={styles.actionButtonText}>拍照</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={recordVideo}>
            <MaterialIcons name="videocam" size={32} color="#fff" />
            <Text style={styles.actionButtonText}>录视频</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={pickFromGallery}>
            <MaterialIcons name="photo-library" size={32} color="#fff" />
            <Text style={styles.actionButtonText}>相册</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 分析按钮 */}
      {mediaUri && !analysisResult && (
        <TouchableOpacity
          style={[styles.analyzeButton, isAnalyzing && styles.analyzeButtonDisabled]}
          onPress={analyzeWorkout}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? (
            <>
              <ActivityIndicator color="#fff" style={{ marginRight: 10 }} />
              <Text style={styles.analyzeButtonText}>AI分析中...</Text>
            </>
          ) : (
            <>
              <MaterialIcons name="psychology" size={24} color="#fff" />
              <Text style={styles.analyzeButtonText}>开始AI分析</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* 分析结果 */}
      {renderAnalysisResult()}
    </ScrollView>
  );
}

// 类型定义
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
