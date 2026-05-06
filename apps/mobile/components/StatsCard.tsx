import { View, Text, StyleSheet, ViewStyle } from 'react-native'
import { colors, radius, spacing, typography } from '@/lib/theme'

type Props = {
  label: string
  value: string | number
  hint?: string
  accent?: keyof typeof colors
  style?: ViewStyle
}

export function StatsCard({ label, value, hint, accent = 'primary', style }: Props) {
  return (
    <View style={[styles.card, style]}>
      <View style={[styles.dot, { backgroundColor: colors[accent] }]} />
      <Text style={typography.label}>{label.toUpperCase()}</Text>
      <Text style={[typography.h2, styles.value]}>{value}</Text>
      {hint ? <Text style={typography.caption}>{hint}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 140,
    flex: 1,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
    marginBottom: spacing.sm,
  },
  value: { marginTop: 4 },
})
