import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import Constants from 'expo-constants'

import { useAuth } from '@/lib/auth'
import { colors, radius, spacing, typography } from '@/lib/theme'

export default function SettingsScreen() {
  const { user, tenant, signOut } = useAuth()
  const apiBase = (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? 'https://portal.auctorum.com.mx'

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
        <View style={styles.card}>
          <Text style={typography.label}>CUENTA</Text>
          <Row label="Nombre" value={user?.name ?? '—'} />
          <Row label="Correo" value={user?.email ?? '—'} />
          <Row label="Rol" value={user?.role ?? '—'} />
        </View>

        <View style={styles.card}>
          <Text style={typography.label}>TENANT</Text>
          <Row label="Consultorio" value={tenant?.name ?? '—'} />
          <Row label="Slug" value={tenant?.slug ?? '—'} />
          <Row label="Plan" value={tenant?.plan ?? '—'} />
        </View>

        <View style={styles.card}>
          <Text style={typography.label}>APP</Text>
          <Row label="Versión" value={Constants.expoConfig?.version ?? '—'} />
          <Row label="API" value={apiBase} />
        </View>

        <Pressable
          onPress={async () => {
            await signOut()
            router.replace('/(auth)/login')
          }}
          style={({ pressed }) => [styles.signOut, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.signOutText}>Cerrar sesión</Text>
        </Pressable>

        <Text style={styles.footer}>
          Auctorum Med · auctorum.com.mx
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1} ellipsizeMode="tail">
        {value}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
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
    gap: spacing.md,
  },
  rowLabel: { color: colors.textSecondary },
  rowValue: { color: colors.text, fontWeight: '500', flex: 1, textAlign: 'right' },
  signOut: {
    backgroundColor: colors.dangerBg,
    padding: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  signOutText: { color: colors.danger, fontWeight: '700' },
  footer: { textAlign: 'center', color: colors.textTertiary, marginTop: spacing.lg, fontSize: 11 },
})
