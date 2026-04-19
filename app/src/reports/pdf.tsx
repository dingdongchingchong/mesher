/* eslint-disable react-refresh/only-export-components */
import {
  Document,
  type DocumentProps,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from '@react-pdf/renderer';
import type { BalanceSheetResult, ProfitLossResult } from '../types';
import { formatCurrency } from '../utils/format';

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 11, fontFamily: 'Helvetica' },
  title: { fontSize: 18, marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#666", marginBottom: 16 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 13, marginBottom: 8 },
  row: {
    display: "flex",
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 4,
  },
  total: {
    display: "flex",
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    fontWeight: 700,
  },
});

async function downloadPdf(filename: string, doc: React.ReactElement<DocumentProps>) {
  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function ProfitLossDoc({
  companyName,
  report,
}: {
  companyName: string;
  report: ProfitLossResult;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Profit & Loss (Cash Basis)</Text>
        <Text style={styles.subtitle}>
          {companyName} | {report.range.from} to {report.range.to}
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Income</Text>
          {report.income.map((row) => (
            <View key={row.account_id} style={styles.row}>
              <Text>{row.account_name}</Text>
              <Text>{formatCurrency(row.total)}</Text>
            </View>
          ))}
          <View style={styles.total}>
            <Text>Total Income</Text>
            <Text>{formatCurrency(report.totalIncome)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Expenses</Text>
          {report.expenses.map((row) => (
            <View key={row.account_id} style={styles.row}>
              <Text>{row.account_name}</Text>
              <Text>{formatCurrency(row.total)}</Text>
            </View>
          ))}
          <View style={styles.total}>
            <Text>Total Expenses</Text>
            <Text>{formatCurrency(report.totalExpenses)}</Text>
          </View>
        </View>

        <View style={styles.total}>
          <Text>Net Profit/Loss</Text>
          <Text>{formatCurrency(report.net)}</Text>
        </View>
      </Page>
    </Document>
  );
}

function BalanceSheetDoc({
  companyName,
  report,
}: {
  companyName: string;
  report: BalanceSheetResult;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Balance Sheet (Cash Basis)</Text>
        <Text style={styles.subtitle}>
          {companyName} | As of {report.asOf}
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assets</Text>
          {report.assets.map((row) => (
            <View key={row.account_id} style={styles.row}>
              <Text>{row.account_name}</Text>
              <Text>{formatCurrency(row.total)}</Text>
            </View>
          ))}
          <View style={styles.total}>
            <Text>Total Assets</Text>
            <Text>{formatCurrency(report.totalAssets)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Liabilities</Text>
          {report.liabilities.map((row) => (
            <View key={row.account_id} style={styles.row}>
              <Text>{row.account_name}</Text>
              <Text>{formatCurrency(row.total)}</Text>
            </View>
          ))}
          <View style={styles.total}>
            <Text>Total Liabilities</Text>
            <Text>{formatCurrency(report.totalLiabilities)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Equity</Text>
          {report.equity.map((row) => (
            <View key={row.account_id} style={styles.row}>
              <Text>{row.account_name}</Text>
              <Text>{formatCurrency(row.total)}</Text>
            </View>
          ))}
          <View style={styles.total}>
            <Text>Total Equity</Text>
            <Text>{formatCurrency(report.totalEquity)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

function exportProfitLossPdf(companyName: string, report: ProfitLossResult) {
  return downloadPdf(
    `profit-loss-${report.range.from}-${report.range.to}.pdf`,
    <ProfitLossDoc companyName={companyName} report={report} />
  );
}

function exportBalanceSheetPdf(companyName: string, report: BalanceSheetResult) {
  return downloadPdf(
    `balance-sheet-${report.asOf}.pdf`,
    <BalanceSheetDoc companyName={companyName} report={report} />
  );
}

export { exportProfitLossPdf, exportBalanceSheetPdf };

