import { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'

import { Header } from '@/components/Header'
import { AppointmentCard } from '@/components/AppointmentCard'
import { api, unwrap, type Appointment } from '@/lib/api'
import { colors, radius, spacing } from '@/lib/theme'

function fmtDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

function shiftDay(d: Date, n: number): Date {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + n)
  return copy
}

export default function AgendaScreen() {
  const [date, setDate] = useState<Date>(new Date())
  const dateStr = fmtDate(date)

  const q = useQuery({
    queryKey: ['appointments', dateStr],
    queryFn: () => api.getAppointments(dateStr),
  })

  const list: Appointment[] = useMemo(
    () => unwrap(q.data as Appointment[] | { data: Appointment[] }),
    [q.data],
  )

  const isToday = dateStr === fmtDate(new Date())
  const friendly = date.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title="Agenda" subtitle={friendly} />

      <View style={styles.dateNav}>
        <Pressable onPress={() => setDate(shiftDay(date, -1))} style={styles.navBtn}>
          <Text style={styles.navText}>‹</Text>
        </Pressable>
        <Pressable onPress={() => setDate(new Date())} style={[styles.todayBtn, isToday && styles.todayActive]}>
          <Text style={[styles.todayText, isToday && { color: '#fff' }]}>Hoy</Text>
        </Pressable>
        <Pressable onPress={() => setDate(shiftDay(date, 1))} style={styles.navBtn}>
          <Text style={styles.navText}>›</Text>
        </Pressable>
      </View>

      {q.isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
      ) : (
        <FlatList
          contentContainerStyle={styles.listPad}
          data={list}
          keyExtractor={(a) => a.id}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          renderItem={({ item }) => <AppointmentCard appointment={item} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ color: colors.textSecondary }}>
                Sin citas para este día.
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={q.isFetching}
              onRefresh={() => q.refetch()}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  dateNav: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: { fontSize: 22, color: colors.text, lineHeight: 22 },
  todayBtn: {
    paddingHorizontal: spacing.md,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  todayText: { fontWeight: '600', color: colors.text },
  listPad: { padding: spacing.md, paddingBottom: spacing.xl },
  empty: {
    padding: spacing.lg,
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
})
