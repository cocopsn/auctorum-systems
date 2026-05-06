import { Tabs } from 'expo-router'
import { Text, View, StyleSheet } from 'react-native'
import { colors, spacing } from '@/lib/theme'

/**
 * Bottom tab navigator. Icons are minimal text glyphs to avoid an extra
 * icon library dependency at MVP. Replace with @expo/vector-icons later.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          borderTopColor: colors.border,
          backgroundColor: colors.card,
          paddingTop: 4,
          paddingBottom: 4,
          height: 56,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color }) => <TabGlyph color={color} char="◉" />,
        }}
      />
      <Tabs.Screen
        name="agenda"
        options={{
          title: 'Agenda',
          tabBarIcon: ({ color }) => <TabGlyph color={color} char="🗓" />,
        }}
      />
      <Tabs.Screen
        name="conversations"
        options={{
          title: 'Chats',
          tabBarIcon: ({ color }) => <TabGlyph color={color} char="💬" />,
        }}
      />
      <Tabs.Screen
        name="patients"
        options={{
          title: 'Pacientes',
          tabBarIcon: ({ color }) => <TabGlyph color={color} char="👥" />,
        }}
      />
    </Tabs>
  )
}

function TabGlyph({ color, char }: { color: string; char: string }) {
  return (
    <View style={styles.glyph}>
      <Text style={{ color, fontSize: 18 }}>{char}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  glyph: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
})
