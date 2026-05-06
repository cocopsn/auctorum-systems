import { ActivityIndicator, ScrollView, StyleSheet, Text, View, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'

import { Header } from '@/components/Header'
import { StatsCard } from '@/components/StatsCard'
import { AppointmentCard } from '@/components/AppointmentCard'
import { api, unwrap, type Appointment } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { colors, radius, spacing, typography } from '@/lib/theme'

export default function HomeScreen() {
  const { user, tenant, signOut } = useAuth()
  const today = new Date().toISOString().split('T')[0]

  const summary = useQuery({
    queryKey: ['summary'],
    queryFn: () => api.getReportsSummary(),
  })

  const todayAppts = useQuery({
    queryKey: ['appointments', today],
    queryFn: () => api.getAppointments(today),
  })

  const list: Appointment[] = unwrap(todayAppts.data as Appointment[] | { data: Appointment[] }).slice(0, 5)
  const refreshing = summary.isFetching || todayAppts.isFetching

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void summary.refetch()
              void todayAppts.refetch()
            }}
            tintColor={colors.primary}
          />
        }
      >
        <Header
          title={greet(user?.name)}
          subtitle={tenant?.name ?? 'Auctorum Med'}
        />

        {/* KPIs */}
        <View style={styles.statsRow}>
          <StatsCard
            label="Citas hoy"
            value={list.length}
            hint={summary.data?.appointments
              ? `${summary.data.appointments.completed} completadas este mes`
              : undefined}
            accent="primary"
          />
          <StatsCard
            label="Nuevos pacientes"
            value={summary.data?.patients.new ?? '—'}
            hint="Este mes"
            accent="success"
          />
        </View>
        <View style={styles.statsRow}>
          <StatsCard
            label="Revenue mes"
            value={summary.data ? mxn(summary.data.revenue.total) : '—'}
            hint={summary.data ? `${summary.data.revenue.payments} pagos` : ''}
            accent="info"
          />
          <StatsCard
            label="Tasa completadas"
            value={summary.data ? `${summary.data.appointments.completionRate}%` : '—'}
            accent="warning"
          />
        </View>

        {/* Today's appointments */}
        <View style={styles.section}>
          <Text style={typography.h3}>Próximas citas (hoy)</Text>
          {todayAppts.isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} />
          ) : list.length === 0 ? (
            <View style={styles.empty}>
              <Text style={typography.caption}>No tienes citas para hoy.</Text>
            </View>
          ) : (
            <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
              {list.map((a) => (
                <AppointmentCard
                  key={a.id}
                  appointment={a}
                  onPress={() => a.patientId && router.push(`/patient/${a.patientId}`)}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text
            style={[typography.caption, { textAlign: 'center' }]}
            onPress={() => void signOut()}
          >
            Cerrar sesión
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function greet(name: string | null | undefined): string {
  const hour = new Date().getHours()
  const period = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'
  return name ? `${period}, ${firstName(name)}` : period
}

function firstName(full: string): string {
  return full.split(' ')[0]
}

function mxn(centavos: number): string {
  const pesos = (centavos ?? 0) / 100
  return pesos.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  })
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  section: { paddingHorizontal: spacing.md, marginTop: spacing.lg },
  empty: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
})
