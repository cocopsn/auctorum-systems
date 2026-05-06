import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, radius, spacing } from '@/lib/theme'
import type { Conversation } from '@/lib/api'

export function ConversationItem({
  convo,
  onPress,
}: {
  convo: Conversation
  onPress?: () => void
}) {
  const hasUnread = (convo.unreadCount ?? 0) > 0
  const initials = (convo.patientName ?? convo.phone)
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
        <View style={styles.topRow}>
          <Text style={[styles.name, hasUnread && styles.nameBold]} numberOfLines={1}>
            {convo.patientName ?? convo.phone}
          </Text>
          {convo.lastMessageAt ? (
            <Text style={styles.time}>{shortTimestamp(convo.lastMessageAt)}</Text>
          ) : null}
        </View>
        <View style={styles.bottomRow}>
          <Text
            style={[styles.last, hasUnread && styles.lastUnread]}
            numberOfLines={1}
          >
            {convo.lastMessage ?? '—'}
          </Text>
          {hasUnread ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{convo.unreadCount}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  )
}

function shortTimestamp(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const today = new Date()
  if (d.toDateString() === today.toDateString()) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
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
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { color: colors.primaryDark, fontWeight: '700' },
  body: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  name: { fontSize: 15, color: colors.text, flex: 1 },
  nameBold: { fontWeight: '700' },
  time: { fontSize: 11, color: colors.textTertiary, marginLeft: spacing.sm },
  last: { fontSize: 13, color: colors.textSecondary, flex: 1 },
  lastUnread: { color: colors.text, fontWeight: '600' },
  badge: {
    backgroundColor: colors.primary,
    minWidth: 20,
    height: 20,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: spacing.sm,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
})
