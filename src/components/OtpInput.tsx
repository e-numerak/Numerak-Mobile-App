import { useRef } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';

const NAVY = '#1e3a5f';
const BORDER = '#e2e8f0';

/**
 * Segmented N-digit OTP field. A single hidden TextInput captures input while
 * N styled boxes render each digit. Tapping anywhere focuses the field.
 */
export function OtpInput({
  value,
  onChange,
  length = 6,
  error = false,
  autoFocus = true,
}: {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  error?: boolean;
  autoFocus?: boolean;
}) {
  const inputRef = useRef<TextInput>(null);

  return (
    <Pressable style={styles.row} onPress={() => inputRef.current?.focus()}>
      {Array.from({ length }).map((_, i) => {
        const char = value[i] ?? '';
        const isCurrent = i === value.length;
        return (
          <View
            key={i}
            style={[
              styles.box,
              char ? styles.boxFilled : null,
              isCurrent ? styles.boxActive : null,
              error ? styles.boxError : null,
            ]}
          >
            <Text style={styles.digit}>{char}</Text>
          </View>
        );
      })}

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        maxLength={length}
        autoFocus={autoFocus}
        style={styles.hiddenInput}
        caretHidden
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', position: 'relative' },
  box: {
    flex: 1,
    aspectRatio: 0.82,
    marginHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: '#f9fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFilled: { borderColor: NAVY, backgroundColor: '#fff' },
  boxActive: { borderColor: '#2563eb', backgroundColor: '#fff' },
  boxError: { borderColor: '#e11d48', backgroundColor: '#fff1f2' },
  digit: { fontSize: 24, fontWeight: '800', color: NAVY },
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
  },
});
