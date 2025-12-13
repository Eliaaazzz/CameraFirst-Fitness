import { useNavigation } from '@react-navigation/native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, Platform, Text, View } from 'react-native';
import { saveJWT } from '../utils/jwtStorage';
import { API_BASE_URL } from '@env';

// Required for Web support and handling redirect callbacks
WebBrowser.maybeCompleteAuthSession();


const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

// Normalize base URL for login endpoints
const normalizeBaseUrl = (url: string) => {
  if (!url) return 'http://localhost:8080';
  return url.replace(/\/+$/, '').replace(/\/api\/v1$/, '');
};
const BASE_URL = normalizeBaseUrl(API_BASE_URL);

export default function LoginScreen() {
    const navigation = useNavigation();
    const [isLoading, setIsLoading] = useState(false);
    const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);
    
    const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
        iosClientId: GOOGLE_IOS_CLIENT_ID,
        androidClientId: GOOGLE_ANDROID_CLIENT_ID,
        webClientId: GOOGLE_WEB_CLIENT_ID,
        scopes: ['profile', 'email'],
    });

    // Check if Apple authentication is available (iOS only)
    useEffect(() => {
        const checkAppleAuth = async () => {
            if (Platform.OS === 'ios') {
                const isAvailable = await AppleAuthentication.isAvailableAsync();
                setAppleAuthAvailable(isAvailable);
            }
        };
        checkAppleAuth();
    }, []);

    const sendTokenToBackend = useCallback(async (idToken: string) => {
        setIsLoading(true);
        try {
            console.log("Sending token to backend...");
            
            const BACKEND_URL = `${BASE_URL}/api/v1/auth/login`;

            const res = await fetch(BACKEND_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    loginType: 'GOOGLE', 
                    idToken: idToken,
                }),
            });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`Status ${res.status}: ${errorText}`);
            }

            const data = await res.json();
            console.log('✅ Login successful! JWT:', data.token);
            
            // ✅ Save JWT and user email to SecureStore
            await saveJWT(data.token, data.refreshToken, data.email);
            
            // ✅ Clear loading state and navigate to main app
            setIsLoading(false);
            navigation.reset({
                index: 0,
                routes: [{ name: 'Main' } as any],
            });

        } catch (error) {
            setIsLoading(false);
            console.error('❌ Backend validation failed:', error);
            Alert.alert(
                'Login Failed', 
                error instanceof Error ? error.message : 'Unable to connect to Aura Fitness server. Please check your internet connection and try again.'
            );
        }
    }, [navigation]);

    useEffect(() => {
        if (response?.type === 'success') {
            // The ID token is contained within params.id_token
            const { id_token } = response.params;
            if (id_token) {
                sendTokenToBackend(id_token);
            }
        } else if (response?.type === 'error') {
            Alert.alert('Google Sign-In Error', response.error?.message || 'Please try again later.');
        }
    }, [response, sendTokenToBackend]);

    const handleMockLogin = async () => {
        setIsLoading(true);
        try {
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Generate a mock JWT token
            const mockToken = `mock_jwt_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            const mockRefreshToken = `mock_refresh_${Date.now()}`;
            const mockEmail = 'test@aurafitness.com';

            console.log('Mock login successful! Token:', mockToken);

            // Save mock JWT to SecureStore
            await saveJWT(mockToken, mockRefreshToken, mockEmail);

            setIsLoading(false);

            // Navigate to main app
            navigation.reset({
                index: 0,
                routes: [{ name: 'Main' } as any],
            });
        } catch (error) {
            setIsLoading(false);
            console.error('Mock login failed:', error);
            Alert.alert('Login Failed', 'Mock login failed. Please try again.');
        }
    };

    const handleAppleLogin = async () => {
        setIsLoading(true);
        try {
            const credential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
            });

            // Send Apple ID token to backend
            const BACKEND_URL = `${BASE_URL}/api/v1/auth/login`;
            
            const res = await fetch(BACKEND_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    loginType: 'APPLE',
                    idToken: credential.identityToken,
                    authorizationCode: credential.authorizationCode,
                }),
            });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`Status ${res.status}: ${errorText}`);
            }

            const data = await res.json();
            console.log('✅ Apple login successful! JWT:', data.token);
            
            // Save JWT and user email to SecureStore
            await saveJWT(data.token, data.refreshToken, data.email);
            
            setIsLoading(false);
            navigation.reset({
                index: 0,
                routes: [{ name: 'Main' } as any],
            });

        } catch (error: any) {
            setIsLoading(false);
            if (error.code === 'ERR_REQUEST_CANCELED') {
                // User canceled the sign-in
                return;
            }
            console.error('❌ Apple login failed:', error);
            Alert.alert(
                'Login Failed',
                error instanceof Error ? error.message : 'Unable to sign in with Apple. Please try again.'
            );
        }
    };

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
            <Text style={{ marginBottom: 30, fontSize: 28, fontWeight: 'bold' }}>Welcome to Aura Fitness</Text>
            <Text style={{ marginBottom: 40, fontSize: 16, color: '#666', textAlign: 'center' }}>
                Sign in to track your nutrition and fitness goals
            </Text>

            {isLoading && (
                <View style={{ marginBottom: 30 }}>
                    <ActivityIndicator size="large" color="#2196F3" />
                    <Text style={{ marginTop: 10, textAlign: 'center', color: '#666' }}>
                        Signing you in...
                    </Text>
                </View>
            )}

            <View style={{ width: '100%', gap: 16 }}>
                <Button
                    title={isLoading ? "Signing in..." : "Sign in with Google"}
                    disabled={!request || isLoading}
                    onPress={() => {
                        promptAsync();
                    }}
                />

                {appleAuthAvailable && (
                    <AppleAuthentication.AppleAuthenticationButton
                        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                        cornerRadius={5}
                        style={{ width: '100%', height: 44 }}
                        onPress={handleAppleLogin}
                    />
                )}

                <Button
                    title={isLoading ? "Signing in..." : "Mock Login (Dev Only)"}
                    disabled={isLoading}
                    color="#6B7280"
                    onPress={handleMockLogin}
                />
            </View>
        </View>
    );
}