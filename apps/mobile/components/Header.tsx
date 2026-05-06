import { StyleSheet, Text, View } from 'react-native'
import { colors, spacing, typography } from '@/lib/theme'

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={typography.h1}>{title}</Text>
      {subtitle ? <Text style={[typography.caption, styles.sub]}>{subtitle}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm },
  sub: { marginTop: 2, color: colors.textSecondary },
})
