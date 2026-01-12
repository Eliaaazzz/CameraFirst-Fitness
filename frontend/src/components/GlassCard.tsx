import { BlurView } from 'expo-blur';
import React, { PropsWithChildren } from 'react';
import { Platform, Pressable, PressableProps, StyleSheet, View, ViewProps } from 'react-native';

import { radii, spacing } from '@/utils';

export interface GlassCardProps extends PropsWithChildren<ViewProps> {
	onPress?: PressableProps['onPress'];
	intensity?: number;
}

export const GlassCard = ({
	children,
	style,
	onPress,
	intensity = 30,
	...rest
}: GlassCardProps) => {
	const Container = onPress ? Pressable : View;

	return (
		<Container
			style={[styles.container, style as any]}
			onPress={onPress}
			{...rest}
		>
			<BlurView
				intensity={intensity}
				tint="light"
				style={styles.blurView}
			>
				<View style={styles.content}>
					{children}
				</View>
			</BlurView>
		</Container>
	);
};

const styles = StyleSheet.create({
	container: {
		borderRadius: radii.lg,
		overflow: 'hidden', // Essential for BlurView to respect border radius
		backgroundColor: Platform.select({
			ios: 'transparent',
			android: 'rgba(255, 255, 255, 0.5)', // More transparent fallback for Android
			default: 'rgba(255, 255, 255, 0.5)',
		}),
		borderWidth: 1,
		borderColor: 'rgba(255, 255, 255, 0.6)', // Brighter border for glass effect
		// Subtle shadow for lift
		shadowColor: '#7C3AED',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.12,
		shadowRadius: 16,
		elevation: 4,
	},
	blurView: {
		flex: 1,
		backgroundColor: 'rgba(255, 255, 255, 0.2)', // Lighter tint for more transparency
	},
	content: {
		padding: spacing.lg,
	},
});
