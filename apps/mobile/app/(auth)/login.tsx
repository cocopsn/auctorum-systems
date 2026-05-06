import { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

import { login, useAuth } from '@/lib/auth'
import { registerPushToken } from '@/lib/notifications'
import { colors, radius, spacing, typography } from '@/lib/theme'

export default function LoginScreen() {
  const { refresh } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setError(null)
    if (!email.trim() || !password) {
      setError('Ingresa tu correo y contraseña')
      return
    }
    setLoading(true)
    try {
      await login(email, password)
      await refresh()
      // Best-effort push token register — non-blocking
      void registerPushToken().catch(() => {})
      router.replace('/(tabs)')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>A</Text>
            </View>
            <Text style={typography.h1}>Auctorum Med</Text>
            <Text style={[typography.caption, { marginTop: 4 }]}>
              Acceso para doctores
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Correo electrónico</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="doctora@clinica.com"
              placeholderTextColor={colors.textTertiary}
            />

            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={colors.textTertiary}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              onPress={handleSubmit}
              disabled={loading}
              style={({ pressed }) => [
                styles.button,
                pressed && { opacity: 0.7 },
                loading && { opacity: 0.5 },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Iniciar sesión</Text>
              )}
            </Pressable>

            <Text style={styles.foot}>
              ¿No tienes cuenta? Regístrate desde {`\n`}
              <Text style={{ color: colors.primary }}>portal.auctorum.com.mx</Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  brand: { alignItems: 'center', marginBottom: spacing.xl },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logoText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  form: {
    backgroundColor: colors.card,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: { ...typography.label, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 15,
    color: colors.text,
    marginBottom: spacing.md,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  error: {
    color: colors.danger,
    marginBottom: spacing.sm,
    fontSize: 13,
  },
  foot: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 18,
  },
})
