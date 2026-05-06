import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams } from 'expo-router'
import { useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api'
import { colors, radius, spacing, typography } from '@/lib/theme'

export default function PatientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()

  const q = useQuery({
    queryKey: ['patient', id],
    queryFn: () => api.getPatient(id!),
    enabled: !!id,
  })

  if (q.isLoading) {
    return <Loader />
  }
  if (q.isError || !q.data) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={[typography.body, { padding: spacing.lg, color: colors.danger }]}>
          No pudimos cargar este paciente.
        </Text>
      </SafeAreaView>
    )
  }

  const p = q.data
  const initials = p.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  function call() {
    if (p.phone) Linking.openURL(`tel:${p.phone.replace(/\D/g, '')}`)
  }
  function whatsapp() {
    if (p.phone) {
      const num = p.phone.replace(/\D/g, '')
      Linking.openURL(`https://wa.me/${num}`)
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
        <View style={styles.headerCard}>
          <View style={styles.avatar}>
            <Text style={styles.initials}>{initials}</Text>
          </View>
          <Text style={typography.h2}>{p.name}</Text>
          {p.phone ? <Text style={typography.caption}>{p.phone}</Text> : null}
          {p.email ? <Text style={typography.caption}>{p.email}</Text> : null}
        </View>

        <View style={styles.actions}>
          <Pressable onPress={call} style={[styles.actionBtn, { backgroundColor: colors.success }]}>
            <Text style={styles.actionText}>📞 Llamar</Text>
          </Pressable>
          <Pressable onPress={whatsapp} style={[styles.actionBtn, { backgroundColor: '#25D366' }]}>
            <Text style={styles.actionText}>💬 WhatsApp</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={typography.label}>DATOS</Text>
          <Row label="Fecha de nacimiento" value={p.dateOfBirth ?? '—'} />
          <Row label="Registrado" value={fmt(p.createdAt)} />
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={typography.label}>EXPEDIENTE</Text>
          <Text style={[typography.caption, { marginTop: spacing.sm }]}>
            La historia clínica completa y los expedientes se editan en{' '}
            <Text style={{ color: colors.primary }}>portal.auctorum.com.mx</Text>.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  )
}

function Loader() {
  return (
    <SafeAreaView style={styles.safe}>
      <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
    </SafeAreaView>
  )
}

function fmt(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-MX')
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  headerCard: {
    backgroundColor: colors.card,
    padding: spacing.lg,
    borderRadius: radius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  initials: { fontSize: 24, fontWeight: '700', color: colors.primaryDark },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  actionText: { color: '#fff', fontWeight: '700' },
  card: {
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLabel: { color: colors.textSecondary },
  rowValue: { color: colors.text, fontWeight: '500' },
})
