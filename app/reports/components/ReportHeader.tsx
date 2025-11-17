import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#1a5fb4',
    paddingBottom: 10,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
  },
});

export const ReportHeader: React.FC<{ userName: string; reportId: string }> = ({ userName, reportId }) => (
  <View style={styles.header}>
    <Text style={styles.title}>Retirement & Legacy Planning Report</Text>
    <Text style={styles.subtitle}>Prepared for: {userName} | Report ID: {reportId}</Text>
  </View>
);
