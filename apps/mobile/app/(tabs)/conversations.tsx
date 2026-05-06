import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'

import { Header } from '@/components/Header'
import { ConversationItem } from '@/components/ConversationItem'
import { api, unwrap, type Conversation } from '@/lib/api'
import { colors, radius, spacing } from '@/lib/theme'

export default function ConversationsScreen() {
  const q = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.getConversations(),
  })

  const list: Conversation[] = unwrap(q.data as Conversation[] | { data: Conversation[] })

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title="Conversaciones" subtitle="WhatsApp + canales activos" />
      {q.isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
      ) : q.isError ? (
        <View style={styles.error}>
          <Text style={{ color: colors.danger }}>
            No pudimos cargar conversaciones. Desliza hacia abajo para reintentar.
          </Text>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <ConversationItem
              convo={item}
              onPress={() => router.push(`/conversation/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ color: colors.textSecondary }}>
                Aún no hay conversaciones. Las que llegan por WhatsApp aparecerán aquí.
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
  empty: {
    margin: spacing.md,
    padding: spacing.lg,
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  error: { margin: spacing.md, padding: spacing.lg, alignItems: 'center' },
})
