import React from 'react';
import { Page, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Inter',
    fontSize: 11,
    paddingTop: 60,
    paddingBottom: 60,
    paddingHorizontal: 40,
  },
});

export const ReportPage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Page size="A4" style={styles.page}>{children}</Page>
);
