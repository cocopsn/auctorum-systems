import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, radius, spacing } from '@/lib/theme'
import type { Patient } from '@/lib/api'

export function PatientCard({ patient, onPress }: { patient: Patient; onPress?: () => void }) {
  const initials = patient.name
    .split(' ')
    .map((p) => p.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
      <View style={styles.avatar}>
        <Text style={styles.initials}>{initials || '?'}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {patient.name}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {patient.phone}
          {patient.email ? ` · ${patient.email}` : ''}
        </Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { color: colors.primaryDark, fontWeight: '700', fontSize: 14 },
  body: { flex: 1 },
  name: { fontSize: 15, color: colors.text, fontWeight: '600' },
  sub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
})
