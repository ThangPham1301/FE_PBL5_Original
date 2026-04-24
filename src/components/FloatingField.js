import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import useAppTheme from '../theme/useAppTheme';

export default function FloatingField({
  label,
  value,
  onChangeText,
  keyboardType = 'default',
  secureTextEntry = false,
  autoCapitalize = 'sentences',
  multiline = false,
  numberOfLines,
  containerStyle,
  inputStyle,
  editable = true,
}) {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.wrap, containerStyle]}>
      <Text style={[styles.label, { color: colors.textMuted, backgroundColor: colors.card }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        numberOfLines={numberOfLines}
        editable={editable}
        style={[
          styles.input,
          {
            borderColor: colors.border,
            color: colors.text,
            backgroundColor: colors.bgSoft,
          },
          multiline && styles.multiline,
          inputStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  label: {
    position: 'absolute',
    top: -8,
    left: 10,
    paddingHorizontal: 6,
    fontSize: 11,
    fontWeight: '700',
    zIndex: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    paddingTop: 14,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
