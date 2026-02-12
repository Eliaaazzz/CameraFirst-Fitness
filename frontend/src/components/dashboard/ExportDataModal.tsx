import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { DownloadSimple, TrendDown, TrendUp, X } from 'phosphor-react-native';

import { Text } from '@/components';
import { getWeightHistory, type WeightLogResponse } from '@/services/weightApi';
import { BRAND_COLORS, spacing, formatLocalDateKey } from '@/utils';
import { getFriendlyErrorMessage } from '@/utils/errors';

let ResponsiveContainer: any;
let AreaChart: any;
let Area: any;
let LineChart: any;
let Line: any;
let XAxis: any;
let YAxis: any;
let CartesianGrid: any;
let Tooltip: any;
let Legend: any;
let PieChart: any;
let Pie: any;
let Cell: any;

if (Platform.OS === 'web') {
  const recharts = require('recharts');
  ResponsiveContainer = recharts.ResponsiveContainer;
  AreaChart = recharts.AreaChart;
  Area = recharts.Area;
  LineChart = recharts.LineChart;
  Line = recharts.Line;
  XAxis = recharts.XAxis;
  YAxis = recharts.YAxis;
  CartesianGrid = recharts.CartesianGrid;
  Tooltip = recharts.Tooltip;
  Legend = recharts.Legend;
  PieChart = recharts.PieChart;
  Pie = recharts.Pie;
  Cell = recharts.Cell;
}

interface ExportDataModalProps {
  visible: boolean;
  onDismiss: () => void;
}

type WeightTrendPoint = {
  date: string;
  weight: number;
  bodyFat: number | null;
  muscleMass: number | null;
};

type WeeklyAveragePoint = {
  label: string;
  avgWeight: number;
};

const csvEscape = (value: unknown): string => {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[\",\r\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
};

const buildWeightCsv = (rows: WeightLogResponse[]): string => {
  const header = ['Date', 'WeightKg', 'BodyFatPercentage', 'MuscleMassKg', 'Note'];
  const sorted = [...rows].sort((a, b) => a.logDate.localeCompare(b.logDate));

  const lines = [header.join(',')];
  for (const row of sorted) {
    lines.push(
      [row.logDate, row.weightKg, row.bodyFatPercentage ?? '', row.muscleMassKg ?? '', row.note ?? '']
        .map(csvEscape)
        .join(',')
    );
  }

  return lines.join('\n');
};

const downloadTextFileOnWeb = (filename: string, content: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

const formatShortDate = (dateLike: string): string => {
  const date = new Date(dateLike);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const weekKeyForDate = (dateLike: string): string => {
  const date = new Date(dateLike);
  const day = date.getDay();
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(date);
  monday.setDate(date.getDate() - diffToMonday);
  return monday.toISOString().slice(0, 10);
};

const PIE_COLORS = ['#F97316', '#14B8A6'];

export function ExportDataModal({ visible, onDismiss }: ExportDataModalProps) {
  const [rows, setRows] = useState<WeightLogResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const loadData = useCallback(async () => {
    if (!visible || Platform.OS !== 'web') return;

    setLoading(true);
    setError(null);

    try {
      const endDate = formatLocalDateKey(new Date());
      const startDate = '1970-01-01';
      const history = await getWeightHistory(startDate, endDate);
      setRows(history);
    } catch (e) {
      setRows([]);
      setError(getFriendlyErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      void loadData();
    }
  }, [visible, loadData]);

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => a.logDate.localeCompare(b.logDate));
  }, [rows]);

  const weightTrendData = useMemo<WeightTrendPoint[]>(() => {
    return sortedRows.map((row) => ({
      date: formatShortDate(row.logDate),
      weight: row.weightKg,
      bodyFat: row.bodyFatPercentage ?? null,
      muscleMass: row.muscleMassKg ?? null,
    }));
  }, [sortedRows]);

  const weeklyAverageData = useMemo<WeeklyAveragePoint[]>(() => {
    const weeklyMap = new Map<string, { sum: number; count: number }>();

    sortedRows.forEach((row) => {
      const key = weekKeyForDate(row.logDate);
      const current = weeklyMap.get(key) ?? { sum: 0, count: 0 };
      current.sum += row.weightKg;
      current.count += 1;
      weeklyMap.set(key, current);
    });

    return Array.from(weeklyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-10)
      .map(([weekStart, values]) => ({
        label: formatShortDate(weekStart),
        avgWeight: Number((values.sum / values.count).toFixed(2)),
      }));
  }, [sortedRows]);

  const latestLog = sortedRows.length ? sortedRows[sortedRows.length - 1] : null;
  const firstLog = sortedRows.length ? sortedRows[0] : null;

  const summary = useMemo(() => {
    const currentWeight = latestLog?.weightKg ?? null;
    const startWeight = firstLog?.weightKg ?? null;
    const delta = currentWeight !== null && startWeight !== null
      ? Number((currentWeight - startWeight).toFixed(1))
      : null;

    return {
      entries: sortedRows.length,
      currentWeight,
      startWeight,
      delta,
      lastLogDate: latestLog?.logDate ?? null,
    };
  }, [sortedRows, latestLog, firstLog]);

  const bodyCompositionData = useMemo(() => {
    if (!latestLog?.bodyFatPercentage || latestLog.bodyFatPercentage <= 0) {
      return [];
    }

    const bodyFat = Number(latestLog.bodyFatPercentage.toFixed(1));
    const leanMass = Number((100 - bodyFat).toFixed(1));
    if (leanMass <= 0) return [];

    return [
      { name: 'Body Fat %', value: bodyFat },
      { name: 'Lean %', value: leanMass },
    ];
  }, [latestLog]);

  const handleExportCsv = useCallback(async () => {
    if (Platform.OS !== 'web' || !sortedRows.length || isExporting) return;

    setIsExporting(true);
    try {
      const endDate = formatLocalDateKey(new Date());
      const csv = buildWeightCsv(sortedRows);
      downloadTextFileOnWeb(`aurafit-weight-${endDate}.csv`, csv, 'text/csv;charset=utf-8');
    } finally {
      setIsExporting(false);
    }
  }, [sortedRows, isExporting]);

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
          <LinearGradient
            colors={['#FFF7ED', '#ECFEFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <View style={styles.headerTextWrap}>
              <Text variant="heading3" weight="bold" style={styles.headerTitle}>
                Export Insights
              </Text>
              <Text variant="caption" style={styles.headerSubtitle}>
                Preview trends before exporting your weight data.
              </Text>
            </View>
            <Pressable style={styles.closeButton} onPress={onDismiss}>
              <X size={18} color="#475569" />
            </Pressable>
          </LinearGradient>

          <ScrollView contentContainerStyle={styles.content}>
            {loading ? (
              <View style={styles.centerState}>
                <ActivityIndicator color={BRAND_COLORS.primary} />
                <Text variant="caption" style={styles.stateText}>Loading chart data...</Text>
              </View>
            ) : error ? (
              <View style={styles.centerState}>
                <Text variant="body" weight="semibold" style={styles.errorTitle}>
                  Unable to load export data
                </Text>
                <Text variant="caption" style={styles.errorText}>
                  {error}
                </Text>
              </View>
            ) : !sortedRows.length ? (
              <View style={styles.centerState}>
                <Text variant="body" weight="semibold" style={styles.errorTitle}>
                  No weight logs to export
                </Text>
                <Text variant="caption" style={styles.stateText}>
                  Add a few entries and come back for an insights export.
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.statsRow}>
                  <View style={styles.statCard}>
                    <Text variant="caption" style={styles.statLabel}>Entries</Text>
                    <Text variant="heading3" weight="bold" style={styles.statValue}>
                      {summary.entries}
                    </Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text variant="caption" style={styles.statLabel}>Current</Text>
                    <Text variant="heading3" weight="bold" style={styles.statValue}>
                      {summary.currentWeight?.toFixed(1) ?? '--'} kg
                    </Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text variant="caption" style={styles.statLabel}>Change</Text>
                    <View style={styles.changeValueRow}>
                      {summary.delta !== null && summary.delta !== 0 ? (
                        summary.delta > 0 ? (
                          <TrendUp size={14} color="#F97316" />
                        ) : (
                          <TrendDown size={14} color="#14B8A6" />
                        )
                      ) : null}
                      <Text
                        variant="body"
                        weight="bold"
                        style={[
                          styles.changeValue,
                          summary.delta !== null && summary.delta > 0
                            ? styles.changeUp
                            : styles.changeDown,
                        ]}
                      >
                        {summary.delta !== null ? `${summary.delta > 0 ? '+' : ''}${summary.delta} kg` : '--'}
                      </Text>
                    </View>
                  </View>
                </View>

                {Platform.OS === 'web' ? (
                  <>
                    <View style={styles.chartCard}>
                      <Text variant="body" weight="bold" style={styles.chartTitle}>
                        Weight Trend
                      </Text>
                      <View style={styles.chartWrap}>
                        <ResponsiveContainer width="100%" height={240}>
                          <AreaChart data={weightTrendData} margin={{ top: 6, right: 12, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="exportWeightGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#14B8A6" stopOpacity={0.35} />
                                <stop offset="100%" stopColor="#14B8A6" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                            <XAxis dataKey="date" tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} />
                            <YAxis tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} axisLine={false} />
                            <Tooltip
                              contentStyle={{
                                border: '1px solid #E2E8F0',
                                borderRadius: 10,
                                boxShadow: '0 6px 18px rgba(15, 23, 42, 0.12)',
                              }}
                              formatter={(value: number) => [`${value.toFixed(1)} kg`, 'Weight']}
                            />
                            <Area
                              type="monotone"
                              dataKey="weight"
                              stroke="#0EA5E9"
                              strokeWidth={2.2}
                              fill="url(#exportWeightGradient)"
                              dot={{ r: 2.5, fill: '#0EA5E9' }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </View>
                    </View>

                    <View style={styles.dualChartsRow}>
                      <View style={[styles.chartCard, styles.halfChartCard]}>
                        <Text variant="body" weight="bold" style={styles.chartTitle}>
                          Weekly Average
                        </Text>
                        <View style={styles.chartWrap}>
                          <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={weeklyAverageData} margin={{ top: 6, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                              <XAxis dataKey="label" tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} />
                              <YAxis tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} axisLine={false} />
                              <Tooltip
                                contentStyle={{
                                  border: '1px solid #E2E8F0',
                                  borderRadius: 10,
                                  boxShadow: '0 6px 18px rgba(15, 23, 42, 0.12)',
                                }}
                                formatter={(value: number) => [`${value.toFixed(1)} kg`, 'Avg']}
                              />
                              <Line
                                type="monotone"
                                dataKey="avgWeight"
                                stroke="#F97316"
                                strokeWidth={2.4}
                                dot={{ r: 2.5, fill: '#F97316' }}
                                activeDot={{ r: 5, fill: '#EA580C' }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </View>
                      </View>

                      <View style={[styles.chartCard, styles.halfChartCard]}>
                        <Text variant="body" weight="bold" style={styles.chartTitle}>
                          Latest Composition
                        </Text>
                        <View style={styles.chartWrap}>
                          {bodyCompositionData.length ? (
                            <ResponsiveContainer width="100%" height={220}>
                              <PieChart>
                                <Pie
                                  data={bodyCompositionData}
                                  dataKey="value"
                                  nameKey="name"
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={76}
                                  innerRadius={44}
                                  paddingAngle={3}
                                >
                                  {bodyCompositionData.map((_, index) => (
                                    <Cell key={`composition-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip
                                  formatter={(value: number) => [`${value}%`, 'Share']}
                                  contentStyle={{
                                    border: '1px solid #E2E8F0',
                                    borderRadius: 10,
                                    boxShadow: '0 6px 18px rgba(15, 23, 42, 0.12)',
                                  }}
                                />
                                <Legend wrapperStyle={{ fontSize: 12 }} />
                              </PieChart>
                            </ResponsiveContainer>
                          ) : (
                            <View style={styles.noBodyFatState}>
                              <Text variant="caption" style={styles.stateText}>
                                Log body fat % to unlock this chart.
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  </>
                ) : (
                  <View style={styles.centerState}>
                    <Text variant="caption" style={styles.stateText}>
                      Chart preview is available on web. You can still export data from web.
                    </Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.cancelButton} onPress={onDismiss}>
              <Text variant="body" weight="semibold" style={styles.cancelButtonText}>
                Close
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.exportButton,
                (isExporting || !sortedRows.length || loading || !!error) && styles.exportButtonDisabled,
                pressed && styles.exportButtonPressed,
              ]}
              disabled={isExporting || !sortedRows.length || loading || !!error}
              onPress={handleExportCsv}
            >
              <DownloadSimple size={16} color="#FFFFFF" />
              <Text variant="body" weight="bold" style={styles.exportButtonText}>
                {isExporting ? 'Exporting...' : 'Download CSV'}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 1040,
    maxHeight: '92%',
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTextWrap: {
    flex: 1,
    paddingRight: spacing.md,
  },
  headerTitle: {
    color: '#0F172A',
  },
  headerSubtitle: {
    color: '#475569',
    marginTop: 4,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(148,163,184,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
    }),
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  centerState: {
    paddingVertical: spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  stateText: {
    color: '#64748B',
  },
  errorTitle: {
    color: '#0F172A',
  },
  errorText: {
    color: '#DC2626',
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  statCard: {
    flex: 1,
    minWidth: 180,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    padding: spacing.md,
    gap: 6,
  },
  statLabel: {
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontSize: 10,
  },
  statValue: {
    color: '#0F172A',
  },
  changeValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  changeValue: {
    fontSize: 14,
  },
  changeUp: {
    color: '#EA580C',
  },
  changeDown: {
    color: '#0E7490',
  },
  chartCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: spacing.md,
  },
  chartTitle: {
    color: '#0F172A',
    marginBottom: spacing.sm,
  },
  chartWrap: {
    minHeight: 220,
  },
  dualChartsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  halfChartCard: {
    flex: 1,
    minWidth: 300,
  },
  noBodyFatState: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    backgroundColor: '#FFFFFF',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
    }),
  },
  cancelButtonText: {
    color: '#334155',
  },
  exportButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: BRAND_COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
    }),
  },
  exportButtonDisabled: {
    opacity: 0.55,
  },
  exportButtonPressed: {
    opacity: 0.9,
  },
  exportButtonText: {
    color: '#FFFFFF',
  },
});

export default ExportDataModal;
