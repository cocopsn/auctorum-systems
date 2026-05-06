import { View, Text, StyleSheet, Pressable } from 'react-native'
import { colors, radius, spacing, STATUS_STYLES, typography } from '@/lib/theme'
import type { Appointment } from '@/lib/api'

export function AppointmentCard({
  appointment,
  onPress,
}: {
  appointment: Appointment
  onPress?: () => void
}) {
  const status = STATUS_STYLES[appointment.status] ?? STATUS_STYLES.scheduled

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.timeCol}>
        <Text style={styles.time}>{shortTime(appointment.startTime)}</Text>
        <Text style={typography.caption}>→ {shortTime(appointment.endTime)}</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {appointment.patientName ?? '(sin nombre)'}
        </Text>
        {appointment.reason ? (
          <Text style={typography.caption} numberOfLines={1}>
            {appointment.reason}
          </Text>
        ) : null}
        {appointment.patientPhone ? (
          <Text style={[typography.caption, { marginTop: 2 }]}>
            {appointment.patientPhone}
          </Text>
        ) : null}
      </View>

      <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
        <Text style={[styles.statusText, { color: status.fg }]}>{status.label}</Text>
      </View>
    </Pressable>
  )
}

function shortTime(t: string): string {
  // Accepts "HH:MM" or "HH:MM:SS"
  return t?.length >= 5 ? t.substring(0, 5) : t ?? ''
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.6 },
  timeCol: { width: 60 },
  time: { fontSize: 16, fontWeight: '700', color: colors.primary },
  body: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  statusText: { fontSize: 11, fontWeight: '600' },
})
