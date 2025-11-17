import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    paddingTop: 8,
    fontSize: 8,
    color: '#666',
  },
});

export const ReportFooter: React.FC = () => (
  <View style={styles.footer}>
    <Text>© 2025 WorkDieRetire.com | This report is for informational purposes only.</Text>
  </View>
);
