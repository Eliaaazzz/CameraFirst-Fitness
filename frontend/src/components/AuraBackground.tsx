import React, { ReactNode } from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';

import { colors } from '@/utils';

interface AuraBackgroundProps extends ViewProps {
	children: ReactNode;
}

export const AuraBackground: React.FC<AuraBackgroundProps> = ({ children, style, ...props }) => {
	return (
		<View style={[styles.container, style]} {...props}>
			{/* Content Layer */}
			<View style={styles.content}>
				{children}
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.light.background, // Fallback
	},
	content: {
		flex: 1,
	},
});
