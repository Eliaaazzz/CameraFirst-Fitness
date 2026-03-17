import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { CalendarBlank, DownloadSimple, TrendDown, TrendUp, X } from 'phosphor-react-native';

import { Text } from '@/components';
import { getWeightHistory, type WeightLogResponse } from '@/services/weightApi';
import { BRAND_COLORS, spacing, formatLocalDateKey } from '@/utils';
import { getFriendlyErrorMessage } from '@/utils/errors';
import { buildWeightCsv, formatShortDate, weekKeyForDate } from './exportUtils';

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

const PIE_COLORS = ['#F97316', '#0EA5E9'];

const TOOLTIP_STYLE = {
  border: 'none',
  borderRadius: 12,
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.14)',
  padding: '10px 14px',
  backgroundColor: '#FFFFFF',
  fontSize: 13,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

const AXIS_TICK = { fill: '#94A3B8', fontSize: 11, fontWeight: 500 };

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
                  <View style={styles.statCard}>
                    <Text variant="caption" style={styles.statLabel}>Date Range</Text>
                    <View style={styles.changeValueRow}>
                      <CalendarBlank size={13} color="#64748B" />
                      <Text variant="caption" weight="semibold" style={styles.dateRangeValue}>
                        {firstLog ? formatShortDate(firstLog.logDate) : '--'}
                        {' - '}
                        {latestLog ? formatShortDate(latestLog.logDate) : '--'}
                      </Text>
                    </View>
                  </View>
                </View>

                {Platform.OS === 'web' ? (
                  <>
                    <View style={styles.chartCard}>
                      <View style={styles.chartHeaderRow}>
                        <View>
                          <Text variant="body" weight="bold" style={styles.chartTitle}>
                            Weight Trend
                          </Text>
                          <Text variant="caption" style={styles.chartSubtitle}>
                            All-time daily weight log
                          </Text>
                        </View>
                        {summary.currentWeight !== null && (
                          <Text variant="heading3" weight="bold" style={styles.chartHighlight}>
                            {summary.currentWeight.toFixed(1)} kg
                          </Text>
                        )}
                      </View>
                      <View style={styles.chartWrap}>
                        <ResponsiveContainer width="100%" height={260}>
                          <AreaChart data={weightTrendData} margin={{ top: 8, right: 16, left: -10, bottom: 4 }}>
                            <defs>
                              <linearGradient id="exportWeightGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#0EA5E9" stopOpacity={0.28} />
                                <stop offset="50%" stopColor="#14B8A6" stopOpacity={0.12} />
                                <stop offset="100%" stopColor="#14B8A6" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 6" stroke="#F1F5F9" vertical={false} />
                            <XAxis
                              dataKey="date"
                              tick={AXIS_TICK}
                              tickLine={false}
                              axisLine={{ stroke: '#E2E8F0' }}
                              interval="preserveStartEnd"
                            />
                            <YAxis
                              tick={AXIS_TICK}
                              tickLine={false}
                              axisLine={false}
                              tickFormatter={(v: number) => `${v}`}
                              unit=" kg"
                              width={58}
                            />
                            <Tooltip
                              contentStyle={TOOLTIP_STYLE}
                              labelStyle={{ color: '#64748B', fontSize: 11, marginBottom: 4 }}
                              formatter={(value: number) => [`${value.toFixed(1)} kg`, 'Weight']}
                              cursor={{ stroke: '#CBD5E1', strokeDasharray: '4 4' }}
                            />
                            <Area
                              type="monotone"
                              dataKey="weight"
                              stroke="#0EA5E9"
                              strokeWidth={2.4}
                              fill="url(#exportWeightGradient)"
                              dot={{ r: 3, fill: '#FFFFFF', stroke: '#0EA5E9', strokeWidth: 2 }}
                              activeDot={{ r: 5.5, fill: '#0EA5E9', stroke: '#FFFFFF', strokeWidth: 2.5 }}
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
                        <Text variant="caption" style={styles.chartSubtitle}>
                          Smoothed weekly trend (last 10 weeks)
                        </Text>
                        <View style={styles.chartWrap}>
                          <ResponsiveContainer width="100%" height={220}>
                            <AreaChart data={weeklyAverageData} margin={{ top: 8, right: 12, left: -10, bottom: 4 }}>
                              <defs>
                                <linearGradient id="weeklyAvgGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#F97316" stopOpacity={0.22} />
                                  <stop offset="100%" stopColor="#F97316" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 6" stroke="#F1F5F9" vertical={false} />
                              <XAxis
                                dataKey="label"
                                tick={AXIS_TICK}
                                tickLine={false}
                                axisLine={{ stroke: '#E2E8F0' }}
                              />
                              <YAxis
                                tick={AXIS_TICK}
                                tickLine={false}
                                axisLine={false}
                                unit=" kg"
                                width={58}
                              />
                              <Tooltip
                                contentStyle={TOOLTIP_STYLE}
                                labelStyle={{ color: '#64748B', fontSize: 11, marginBottom: 4 }}
                                formatter={(value: number) => [`${value.toFixed(1)} kg`, 'Weekly Avg']}
                                cursor={{ stroke: '#CBD5E1', strokeDasharray: '4 4' }}
                              />
                              <Area
                                type="monotone"
                                dataKey="avgWeight"
                                stroke="#F97316"
                                strokeWidth={2.4}
                                fill="url(#weeklyAvgGradient)"
                                dot={{ r: 3, fill: '#FFFFFF', stroke: '#F97316', strokeWidth: 2 }}
                                activeDot={{ r: 5.5, fill: '#F97316', stroke: '#FFFFFF', strokeWidth: 2.5 }}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </View>
                      </View>

                      <View style={[styles.chartCard, styles.halfChartCard]}>
                        <Text variant="body" weight="bold" style={styles.chartTitle}>
                          Body Composition
                        </Text>
                        <Text variant="caption" style={styles.chartSubtitle}>
                          {bodyCompositionData.length
                            ? `Based on latest log (${latestLog ? formatShortDate(latestLog.logDate) : ''})`
                            : 'Log body fat % to see this chart'}
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
                                  outerRadius={80}
                                  innerRadius={48}
                                  paddingAngle={4}
                                  cornerRadius={4}
                                  label={({ name, value }: { name: string; value: number }) =>
                                    `${name === 'Body Fat %' ? 'Fat' : 'Lean'} ${value}%`
                                  }
                                >
                                  {bodyCompositionData.map((_, index) => (
                                    <Cell
                                      key={`composition-${index}`}
                                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                                      stroke="none"
                                    />
                                  ))}
                                </Pie>
                                <Tooltip
                                  formatter={(value: number, name: string) => [
                                    `${value}%`,
                                    name === 'Body Fat %' ? 'Body Fat' : 'Lean Mass',
                                  ]}
                                  contentStyle={TOOLTIP_STYLE}
                                />
                                <Legend
                                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                                  formatter={(value: string) =>
                                    value === 'Body Fat %' ? 'Body Fat' : 'Lean Mass'
                                  }
                                />
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
    minWidth: 140,
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
    backgroundColor: '#FAFBFC',
    padding: spacing.md,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  chartTitle: {
    color: '#0F172A',
    marginBottom: 2,
  },
  chartSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    marginBottom: spacing.sm,
  },
  chartHighlight: {
    color: '#0EA5E9',
  },
  dateRangeValue: {
    color: '#475569',
    fontSize: 12,
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
