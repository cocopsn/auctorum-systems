import { useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api, unwrap, type Message } from '@/lib/api'
import { colors, radius, spacing } from '@/lib/theme'

export default function ConversationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const qc = useQueryClient()
  const [draft, setDraft] = useState('')

  const q = useQuery({
    queryKey: ['messages', id],
    queryFn: () => api.getMessages(id!),
    enabled: !!id,
    refetchInterval: 5_000,
  })

  const send = useMutation({
    mutationFn: (body: string) => api.sendMessage(id!, body),
    onSuccess: () => {
      setDraft('')
      void qc.invalidateQueries({ queryKey: ['messages', id] })
    },
  })

  const messages: Message[] = unwrap(q.data as Message[] | { data: Message[] })

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        {q.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
        ) : (
          <FlatList
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
            inverted={false}
            renderItem={({ item }) => <MessageBubble msg={item} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
                  Sin mensajes en esta conversación.
                </Text>
              </View>
            }
          />
        )}

        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Escribe un mensaje…"
            placeholderTextColor={colors.textTertiary}
            multiline
          />
          <Pressable
            onPress={() => draft.trim() && send.mutate(draft.trim())}
            disabled={!draft.trim() || send.isPending}
            style={[
              styles.sendBtn,
              (!draft.trim() || send.isPending) && { opacity: 0.5 },
            ]}
          >
            <Text style={styles.sendText}>{send.isPending ? '…' : '➤'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function MessageBubble({ msg }: { msg: Message }) {
  const isOut = msg.direction === 'outbound'
  const time = msg.createdAt
    ? new Date(msg.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
    : ''
  return (
    <View style={[styles.bubbleRow, { justifyContent: isOut ? 'flex-end' : 'flex-start' }]}>
      <View
        style={[
          styles.bubble,
          isOut ? styles.bubbleOut : styles.bubbleIn,
        ]}
      >
        <Text style={isOut ? styles.bubbleTextOut : styles.bubbleTextIn}>{msg.body}</Text>
        <Text
          style={[
            styles.bubbleTime,
            { color: isOut ? 'rgba(255,255,255,0.7)' : colors.textTertiary },
          ]}
        >
          {time}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  empty: { padding: spacing.xl },
  bubbleRow: { flexDirection: 'row' },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
  },
  bubbleIn:  { backgroundColor: colors.card, borderTopLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
  bubbleOut: { backgroundColor: colors.primary, borderTopRightRadius: 4 },
  bubbleTextIn:  { color: colors.text, fontSize: 14 },
  bubbleTextOut: { color: '#fff', fontSize: 14 },
  bubbleTime: { fontSize: 10, marginTop: 2, alignSelf: 'flex-end' },
  composer: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    maxHeight: 120,
    color: colors.text,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendText: { color: '#fff', fontSize: 18 },
})
