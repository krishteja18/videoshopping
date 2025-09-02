import { Colors, Spacing, Typography } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import React, { ReactNode, useState } from 'react';
import { StyleSheet, Text, TextInput, TextStyle, View, ViewStyle } from 'react-native';

type InputProps = {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: TextInput['props']['keyboardType'];
  secureTextEntry?: boolean;
  editable?: boolean;
  error?: string;
  helperText?: string;
  left?: ReactNode;
  right?: ReactNode;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  autoCapitalize?: TextInput['props']['autoCapitalize'];
  maxLength?: number;
};

export function Input({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType = 'default',
  secureTextEntry,
  editable = true,
  error,
  helperText,
  left,
  right,
  containerStyle,
  inputStyle,
  autoCapitalize = 'none',
  maxLength,
}: InputProps) {
  const scheme = useColorScheme();
  const isDark = false;
  const palette = Colors[scheme ?? 'light'];

  const [focused, setFocused] = useState(false);

  const bg = isDark ? Colors.dark.surface : '#FFFFFF';
  const border = isDark ? Colors.dark.border : 'rgba(0,0,0,0.1)';
  const text = isDark ? palette.text : '#333333'; //
  const placeholderColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const borderColor = error
    ? palette.error
    : focused
    ? palette.primary
    : border;

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={[styles.label, { color: text }]}>{label}</Text> : null}

      <View style={[styles.field, { backgroundColor: bg, borderColor: borderColor }]}>
        {left ? <View style={styles.adornment}>{left}</View> : null}

        <TextInput
          style={[styles.input, { color: text }, inputStyle]}
          placeholder={placeholder}
          placeholderTextColor={placeholderColor}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          editable={editable}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCapitalize={autoCapitalize}
          maxLength={maxLength}
        />

        {right ? <View style={styles.adornment}>{right}</View> : null}
      </View>

      {error ? <Text style={[styles.error, { color: palette.error }]}>{error}</Text> : null}
      {!error && helperText ? (
        <Text style={[styles.helper, { color: 'rgba(0,0,0,0.6)' }]}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  label: {
    fontSize: Typography.fontSizes.sm,
    fontFamily: 'Nunito-SemiBold',
    marginBottom: Spacing.xs,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    minHeight: 48,
  },
  input: {
    flex: 1,
    fontSize: Typography.fontSizes.base,
    fontFamily: 'Nunito-Medium',
    paddingVertical: 12,
  },
  adornment: {
    marginHorizontal: 6,
  },
  error: {
    marginTop: 6,
    fontSize: Typography.fontSizes.sm,
    fontFamily: 'Nunito-SemiBold',
  },
  helper: {
    marginTop: 6,
    fontSize: Typography.fontSizes.sm,
    fontFamily: 'Nunito-Regular',
  },
});