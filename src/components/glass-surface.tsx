import { BlurView, type BlurViewProps } from 'expo-blur';
import { StyleSheet } from 'react-native';

type GlassSurfaceProps = Omit<BlurViewProps, 'intensity' | 'tint'> & {
  dark?: boolean;
};

export function GlassSurface({ dark = false, style, children, ...props }: GlassSurfaceProps) {
  return (
    <BlurView
      {...props}
      intensity={dark ? 28 : 20}
      tint={dark ? 'dark' : 'light'}
      style={[styles.surface, style]}
    >
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  surface: {
    overflow: 'hidden',
  },
});
