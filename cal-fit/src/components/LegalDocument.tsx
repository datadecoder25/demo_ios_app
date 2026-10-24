import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/kit';
import { colors, type } from '@/constants/design';
import { LAST_UPDATED, LegalSection } from '@/constants/legal';
import { goBack } from '@/lib/navigation';

/** A titled legal page (Privacy Policy, Terms of Use) built from sections in constants/legal. */
export function LegalDocument({ title, sections }: { title: string; sections: LegalSection[] }) {
  return (
    <Screen onBack={() => goBack('/')} scroll backgroundColor={colors.surface}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.updated}>Last updated {LAST_UPDATED}</Text>
      {sections.map(section => (
        <View key={section.heading} style={styles.section}>
          <Text style={styles.heading} accessibilityRole="header">
            {section.heading}
          </Text>
          {section.paragraphs.map(paragraph => (
            <Text key={paragraph} style={styles.paragraph}>
              {paragraph}
            </Text>
          ))}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    ...type.title,
    marginTop: 8,
  },
  updated: {
    ...type.caption,
    marginTop: 4,
  },
  section: {
    marginTop: 20,
    gap: 8,
  },
  heading: {
    ...type.subheading,
  },
  paragraph: {
    ...type.body,
  },
});
