import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'

import { Header } from '@/components/Header'
import { PatientCard } from '@/components/PatientCard'
import { api, unwrap, type Patient } from '@/lib/api'
import { colors, radius, spacing } from '@/lib/theme'

function useDebounced<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}

export default function PatientsScreen() {
  const [search, setSearch] = useState('')
  const debounced = useDebounced(search, 300)

  const q = useQuery({
    queryKey: ['patients', debounced],
    queryFn: () => api.getPatients(debounced || undefined),
  })

  const list: Patient[] = unwrap(q.data as Patient[] | { data: Patient[] })

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title="Pacientes" subtitle={`${list.length} en lista`} />

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar por nombre o teléfono"
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      {q.isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => (
            <PatientCard patient={item} onPress={() => router.push(`/patient/${item.id}`)} />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ color: colors.textSecondary }}>
                {search ? `Sin resultados para "${search}"` : 'Sin pacientes registrados.'}
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
  searchWrap: { paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  search: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 14,
    color: colors.text,
  },
  empty: {
    margin: spacing.md,
    padding: spacing.lg,
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
})
