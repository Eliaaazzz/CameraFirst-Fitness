/**
 * CoachScreen — streaming AI Coach chat.
 *
 * Inspired by: ChatGPT / Claude mobile chat threads — a vertically scrolling
 * transcript of user + assistant bubbles with live token streaming, plus
 * Perplexity-style inline "tool activity" chips so the user can see the agent
 * reasoning over their data ("🔧 looked up your meal history"). Chosen because a
 * conversational surface is the lowest-friction way to turn nutrition data into
 * actionable, personalized guidance (the product's core promise).
 *
 * Transport: native WebSocket to the Go realtime gateway via CoachClient. Tokens
 * are appended live to the in-flight assistant bubble; tool_call/tool_result
 * frames render as chips; `done` finalizes the turn; `error` surfaces inline.
 *
 * Design: theme tokens only (BRAND_COLORS / spacing / radii), glass Card styling
 * for the assistant bubble + input bar, Reanimated entrance + typing animation.
 * Wrapped with the app's withErrorBoundary in AppNavigator.
 */

import { ArrowLeft, PaperPlaneRight, SealCheck, Sparkle, Warning, Wrench } from 'phosphor-react-native';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type ListRenderItem,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { AIDisclaimer, Card, KeyboardAvoidingWrapper, SafeAreaWrapper, Text } from '@/components';
import { GlassCard } from '@/components/GlassCard';
import {
  CoachClient,
  describeTool,
  parseFrameData,
  type CoachConnectionState,
  type CoachFrame,
} from '@/services/coachClient';
import { BRAND_COLORS, radii, spacing, useContentBottomPadding } from '@/utils';

type ChatRole = 'user' | 'assistant';

/** A tool activity chip attached to an assistant turn. */
interface ToolActivity {
  id: string;
  label: string;
  /** true once the matching tool_result arrived. */
  done: boolean;
}

/** A grounded source the answer cited, from the knowledge-base RAG retrieval. */
interface Citation {
  citation: number;
  source: string;
  title: string;
  url?: string;
}

/** Result of the backend faithfulness check — drives the anti-hallucination badge. */
interface Groundedness {
  groundedness: number;
  sourceCount: number;
  unsupportedCount: number;
  citations: Citation[];
  unsupportedClaims: string[];
}

interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  tools: ToolActivity[];
  /** true while assistant tokens are still streaming. */
  streaming: boolean;
  /** set when this turn ended in an error. */
  error?: string;
  /** faithfulness verdict for grounded health answers, if the agent ran the check. */
  groundedness?: Groundedness;
}

const SUGGESTIONS = [
  'What should I eat after a run?',
  'How am I tracking against my goals?',
  'Suggest a high-protein dinner',
];

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${Date.now()}_${idCounter}`;
}

export const CoachScreen = () => {
  const navigation = useNavigation();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const clientRef = useRef<CoachClient | null>(null);
  /** Tracks the in-flight assistant message id so frame handlers can target it. */
  const activeAssistantIdRef = useRef<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<CoachConnectionState>('idle');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isAwaitingResponse, setIsAwaitingResponse] = useState(false);

  const bottomPadding = useContentBottomPadding(spacing.lg);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  /** Mutate the in-flight assistant message by id. */
  const updateAssistant = useCallback(
    (id: string, updater: (msg: ChatMessage) => ChatMessage) => {
      setMessages((prev) => prev.map((m) => (m.id === id ? updater(m) : m)));
    },
    []
  );

  const handleFrame = useCallback(
    (frame: CoachFrame) => {
      const assistantId = activeAssistantIdRef.current;

      switch (frame.event) {
        case 'meta': {
          // Capture the session id so follow-up turns continue the conversation.
          const meta = parseFrameData<{ sessionId?: string; session_id?: string }>(frame.data);
          const sid = meta?.sessionId || meta?.session_id;
          if (sid) setSessionId(sid);
          break;
        }
        case 'tool_call': {
          if (!assistantId) break;
          const label = describeTool(frame);
          updateAssistant(assistantId, (m) => ({
            ...m,
            tools: [...m.tools, { id: nextId('tool'), label, done: false }],
          }));
          scrollToEnd();
          break;
        }
        case 'tool_result': {
          if (!assistantId) break;
          // Mark the most recent unfinished tool chip as complete.
          updateAssistant(assistantId, (m) => {
            const tools = [...m.tools];
            for (let i = tools.length - 1; i >= 0; i -= 1) {
              if (!tools[i].done) {
                tools[i] = { ...tools[i], done: true };
                break;
              }
            }
            return { ...m, tools };
          });
          break;
        }
        case 'token': {
          if (!assistantId) break;
          updateAssistant(assistantId, (m) => ({ ...m, text: m.text + frame.data }));
          scrollToEnd();
          break;
        }
        case 'groundedness': {
          // The faithfulness check that ran after the answer — surface it so the user
          // can see the answer is grounded in cited sources (anti-hallucination).
          if (!assistantId) break;
          const verdict = parseFrameData<Groundedness>(frame.data);
          if (verdict) {
            updateAssistant(assistantId, (m) => ({ ...m, groundedness: verdict }));
            scrollToEnd();
          }
          break;
        }
        case 'done': {
          if (assistantId) {
            updateAssistant(assistantId, (m) => ({ ...m, streaming: false }));
          }
          activeAssistantIdRef.current = null;
          setIsAwaitingResponse(false);
          break;
        }
        case 'error': {
          if (assistantId) {
            updateAssistant(assistantId, (m) => ({
              ...m,
              streaming: false,
              error: frame.data || 'Something went wrong.',
            }));
          }
          activeAssistantIdRef.current = null;
          setIsAwaitingResponse(false);
          break;
        }
        case 'social':
          // Social events are out of scope for the coach transcript; ignore here.
          break;
        default:
          break;
      }
    },
    [scrollToEnd, updateAssistant]
  );

  // Establish the WebSocket connection on mount; tear down on unmount.
  useEffect(() => {
    const client = new CoachClient({
      onFrame: handleFrame,
      onStateChange: setConnectionState,
      onError: (message) => {
        setConnectionError(message);
        setIsAwaitingResponse(false);
        const assistantId = activeAssistantIdRef.current;
        if (assistantId) {
          updateAssistant(assistantId, (m) => ({ ...m, streaming: false, error: message }));
          activeAssistantIdRef.current = null;
        }
      },
    });
    clientRef.current = client;
    void client.connect();

    return () => {
      client.close();
      clientRef.current = null;
    };
    // handleFrame/updateAssistant are stable (useCallback) — connect once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the (stable today, but defensively current) handlers on the client so a
  // frame callback can never invoke a stale closure if deps change later.
  useEffect(() => {
    clientRef.current?.setHandlers({
      onFrame: handleFrame,
      onStateChange: setConnectionState,
      onError: (message) => {
        setConnectionError(message);
        setIsAwaitingResponse(false);
        const assistantId = activeAssistantIdRef.current;
        if (assistantId) {
          updateAssistant(assistantId, (m) => ({ ...m, streaming: false, error: message }));
          activeAssistantIdRef.current = null;
        }
      },
    });
  }, [handleFrame, updateAssistant]);

  const handleReconnect = useCallback(() => {
    setConnectionError(null);
    void clientRef.current?.connect();
  }, []);

  const handleSend = useCallback(
    (raw?: string) => {
      const text = (raw ?? input).trim();
      if (!text || isAwaitingResponse) return;

      const client = clientRef.current;
      const sent = client?.sendMessage(text, sessionId) ?? false;
      if (!sent) {
        setConnectionError('Not connected to the AI Coach yet. Tap retry to reconnect.');
        return;
      }

      const userMsg: ChatMessage = {
        id: nextId('user'),
        role: 'user',
        text,
        tools: [],
        streaming: false,
      };
      const assistantMsg: ChatMessage = {
        id: nextId('assistant'),
        role: 'assistant',
        text: '',
        tools: [],
        streaming: true,
      };
      activeAssistantIdRef.current = assistantMsg.id;

      // handleSend runs synchronously to completion before any later event-loop
      // turn can deliver a WS frame, and updateAssistant uses functional setState
      // updaters — so a done/error frame's updater is always queued after this
      // add and will see the assistant message (no lost finalize).
      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setInput('');
      setIsAwaitingResponse(true);
      setConnectionError(null);
      scrollToEnd();
    },
    [input, isAwaitingResponse, scrollToEnd, sessionId]
  );

  const renderItem = useCallback<ListRenderItem<ChatMessage>>(
    ({ item }) => <MessageBubble message={item} />,
    []
  );

  const isConnecting = connectionState === 'connecting' || connectionState === 'idle';
  const canSend = input.trim().length > 0 && !isAwaitingResponse && connectionState === 'open';

  const listEmpty = useMemo(
    () => (
      <EmptyState
        onPickSuggestion={handleSend}
        disabled={connectionState !== 'open'}
      />
    ),
    [connectionState, handleSend]
  );

  return (
    <SafeAreaWrapper>
      <KeyboardAvoidingWrapper keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        <View style={styles.root}>
          <View style={styles.header}>
            <Pressable
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <ArrowLeft size={24} color={BRAND_COLORS.textPrimary} />
            </Pressable>
            <View style={styles.headerTitleWrap}>
              <View style={styles.headerTitleRow}>
                <Sparkle size={18} color={BRAND_COLORS.primary} weight="fill" />
                <Text variant="heading2" weight="bold">
                  AI Coach
                </Text>
              </View>
              <Text variant="caption" color={BRAND_COLORS.textMuted}>
                {connectionStatusLabel(connectionState)}
              </Text>
            </View>
          </View>

          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={[
              styles.listContent,
              messages.length === 0 && styles.listContentEmpty,
              { paddingBottom: bottomPadding },
            ]}
            ListEmptyComponent={isConnecting ? <ConnectingState /> : listEmpty}
            ItemSeparatorComponent={ItemSeparator}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={scrollToEnd}
          />

          {connectionError ? (
            <View style={styles.errorBanner}>
              <Text variant="caption" color={BRAND_COLORS.error} style={styles.errorBannerText}>
                {connectionError}
              </Text>
              <Pressable onPress={handleReconnect} accessibilityRole="button">
                <Text variant="caption" weight="bold" color={BRAND_COLORS.primaryDark}>
                  Retry
                </Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.composerWrap}>
            <AIDisclaimer compact />
            <Card elevation="medium" style={styles.composerCard}>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Ask your coach anything…"
                placeholderTextColor={BRAND_COLORS.textMuted}
                style={styles.composerInput}
                multiline
                editable={connectionState === 'open' || connectionState === 'error'}
                onSubmitEditing={() => handleSend()}
                blurOnSubmit={false}
                accessibilityLabel="Message the AI Coach"
              />
              <Pressable
                onPress={() => handleSend()}
                disabled={!canSend}
                accessibilityRole="button"
                accessibilityLabel="Send message"
                style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
              >
                {isAwaitingResponse ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <PaperPlaneRight size={18} color="#FFFFFF" weight="fill" />
                )}
              </Pressable>
            </Card>
          </View>
        </View>
      </KeyboardAvoidingWrapper>
    </SafeAreaWrapper>
  );
};

const ItemSeparator = () => <View style={{ height: spacing.md }} />;

function connectionStatusLabel(state: CoachConnectionState): string {
  switch (state) {
    case 'open':
      return 'Connected';
    case 'connecting':
    case 'idle':
      return 'Connecting…';
    case 'error':
      return 'Connection issue';
    case 'closed':
      return 'Disconnected';
    default:
      return '';
  }
}

/** A single chat bubble (user or assistant), including tool chips. */
const MessageBubble = ({ message }: { message: ChatMessage }) => {
  const isUser = message.role === 'user';

  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowAssistant]}
    >
      {isUser ? (
        <View style={[styles.bubble, styles.userBubble]}>
          <Text variant="body" color="#FFFFFF" style={styles.userBubbleText}>
            {message.text}
          </Text>
        </View>
      ) : (
        <View style={styles.assistantContainer}>
          {message.tools.length > 0 ? (
            <View style={styles.toolChips}>
              {message.tools.map((tool) => (
                <ToolChip key={tool.id} tool={tool} />
              ))}
            </View>
          ) : null}

          <Card elevation="light" style={styles.assistantBubble}>
            {message.text.length > 0 ? (
              <Text variant="body" color={BRAND_COLORS.textPrimary}>
                {message.text}
              </Text>
            ) : message.streaming ? (
              <TypingIndicator />
            ) : null}

            {message.groundedness ? (
              <GroundednessBadge data={message.groundedness} />
            ) : null}

            {message.error ? (
              <Text variant="caption" color={BRAND_COLORS.error} style={styles.bubbleError}>
                {message.error}
              </Text>
            ) : null}
          </Card>
        </View>
      )}
    </Animated.View>
  );
};

/** #RRGGBB -> rgba() with the given alpha, for translucent accents over glass. */
function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Liquid-glass faithfulness badge. Renders the post-answer groundedness verdict as a
 * translucent, blurred glass card (expo-blur via GlassCard) tinted by state — green when the
 * answer is grounded in cited sources with no unsupported claims, amber otherwise. Citations are
 * interactive (tap to open the source). This makes the anti-hallucination check visible instead
 * of silent.
 */
const GroundednessBadge = ({ data }: { data: Groundedness }) => {
  const verified = data.groundedness >= 0.8 && data.unsupportedCount === 0;
  const accent = verified ? BRAND_COLORS.success : BRAND_COLORS.warning;
  const pct = Math.round((data.groundedness ?? 0) * 100);
  const sourceWord = data.sourceCount === 1 ? 'source' : 'sources';
  const headline = verified
    ? `Grounded · ${data.sourceCount} ${sourceWord}`
    : `${data.sourceCount} ${sourceWord} · ${data.unsupportedCount} unverified`;

  return (
    <GlassCard
      intensity={24}
      style={[styles.groundBadge, { borderColor: withAlpha(accent, 0.4) }]}
    >
      <View style={styles.groundInner}>
        <View style={styles.groundHeader}>
          {verified ? (
            <SealCheck size={16} color={accent} weight="fill" />
          ) : (
            <Warning size={16} color={accent} weight="fill" />
          )}
          <Text variant="label" weight="bold" color={accent} style={styles.groundHeadline}>
            {headline}
          </Text>
          <Text variant="label" color={BRAND_COLORS.textMuted}>
            {pct}%
          </Text>
        </View>

        {data.citations?.length ? (
          <View style={styles.groundCitations}>
            {data.citations.map((c) => (
              <Pressable
                key={c.citation}
                onPress={() => c.url && Linking.openURL(c.url).catch(() => undefined)}
                disabled={!c.url}
                style={({ pressed }) => [
                  styles.citationRow,
                  pressed && c.url ? styles.citationRowPressed : null,
                ]}
              >
                <Text variant="label" weight="bold" color={accent} style={styles.citationIndex}>
                  [{c.citation}]
                </Text>
                <Text
                  variant="label"
                  color={BRAND_COLORS.textSecondary}
                  numberOfLines={1}
                  style={styles.citationText}
                >
                  {c.source}
                  {c.title ? ` · ${c.title}` : ''}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {data.unsupportedClaims?.length ? (
          <Text
            variant="label"
            color={BRAND_COLORS.warning}
            numberOfLines={3}
            style={styles.groundUnsupported}
          >
            Unverified: {data.unsupportedClaims.join('; ')}
          </Text>
        ) : null}
      </View>
    </GlassCard>
  );
};

/** Small chip showing tool activity, e.g. "🔧 looked up your meal history". */
const ToolChip = ({ tool }: { tool: ToolActivity }) => (
  <Animated.View entering={FadeIn.duration(180)} style={styles.toolChip}>
    <Wrench size={12} color={BRAND_COLORS.secondary} weight="fill" />
    <Text variant="label" color={BRAND_COLORS.textSecondary} style={styles.toolChipText}>
      {tool.label}
      {tool.done ? '' : '…'}
    </Text>
  </Animated.View>
);

/** Animated three-dot typing indicator while awaiting the first token. */
const TypingIndicator = () => {
  return (
    <View style={styles.typingRow}>
      <TypingDot delay={0} />
      <TypingDot delay={150} />
      <TypingDot delay={300} />
    </View>
  );
};

const TypingDot = ({ delay }: { delay: number }) => {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    // delay handled implicitly by staggered mount; keep simple + deterministic
    return () => {
      // Stop the infinite loop when the typing indicator unmounts.
      cancelAnimation(opacity);
    };
  }, [opacity, delay]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={[styles.typingDot, animatedStyle]} />;
};

const ConnectingState = () => (
  <View style={styles.centerState}>
    <ActivityIndicator size="large" color={BRAND_COLORS.primary} />
    <Text variant="body" color={BRAND_COLORS.textMuted} style={styles.centerStateText}>
      Connecting to your AI Coach…
    </Text>
  </View>
);

const EmptyState = ({
  onPickSuggestion,
  disabled,
}: {
  onPickSuggestion: (text: string) => void;
  disabled: boolean;
}) => (
  <View style={styles.centerState}>
    <View style={styles.emptyIcon}>
      <Sparkle size={32} color={BRAND_COLORS.primary} weight="fill" />
    </View>
    <Text variant="heading3" weight="bold" style={styles.emptyTitle}>
      Your personal AI Coach
    </Text>
    <Text variant="body" color={BRAND_COLORS.textMuted} style={styles.emptySubtitle}>
      Ask about your nutrition, goals, and meals. The coach can look up your data
      to give tailored advice.
    </Text>
    <View style={styles.suggestions}>
      {SUGGESTIONS.map((s) => (
        <Pressable
          key={s}
          onPress={() => onPickSuggestion(s)}
          disabled={disabled}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.suggestionChip,
            disabled && styles.suggestionChipDisabled,
            pressed && styles.suggestionChipPressed,
          ]}
        >
          <Text variant="caption" color={BRAND_COLORS.textPrimary}>
            {s}
          </Text>
        </Pressable>
      ))}
    </View>
  </View>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitleWrap: {
    flex: 1,
    gap: 2,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  listContent: {
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  bubbleRow: {
    flexDirection: 'row',
    width: '100%',
  },
  bubbleRowUser: {
    justifyContent: 'flex-end',
  },
  bubbleRowAssistant: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  userBubble: {
    backgroundColor: BRAND_COLORS.primary,
    borderBottomRightRadius: radii.sm,
  },
  userBubbleText: {
    lineHeight: 22,
  },
  assistantContainer: {
    maxWidth: '88%',
    gap: spacing.xs,
  },
  assistantBubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomLeftRadius: radii.sm,
    backgroundColor: BRAND_COLORS.glassFillStrong,
  },
  bubbleError: {
    marginTop: spacing.xs,
  },
  groundBadge: {
    marginTop: spacing.sm,
    borderRadius: radii.md,
  },
  groundInner: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  groundHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  groundHeadline: {
    flex: 1,
  },
  groundCitations: {
    gap: 2,
  },
  citationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 2,
  },
  citationRowPressed: {
    opacity: 0.6,
  },
  citationIndex: {
    minWidth: 22,
  },
  citationText: {
    flex: 1,
  },
  groundUnsupported: {
    marginTop: 2,
    fontStyle: 'italic',
  },
  toolChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  toolChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: BRAND_COLORS.secondaryContainer,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: BRAND_COLORS.glassStroke,
  },
  toolChipText: {
    fontSize: 11,
    textTransform: 'none',
    letterSpacing: 0,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.xs,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: radii.full,
    backgroundColor: BRAND_COLORS.textMuted,
  },
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  centerStateText: {
    textAlign: 'center',
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND_COLORS.primaryTint,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptySubtitle: {
    textAlign: 'center',
    lineHeight: 22,
  },
  suggestions: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  suggestionChip: {
    alignSelf: 'center',
    backgroundColor: BRAND_COLORS.glassFill,
    borderWidth: 1,
    borderColor: BRAND_COLORS.glassStroke,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : null),
  },
  suggestionChipDisabled: {
    opacity: 0.5,
  },
  suggestionChipPressed: {
    opacity: 0.8,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: BRAND_COLORS.semantic.errorTint,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  errorBannerText: {
    flex: 1,
  },
  composerWrap: {
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },
  composerCard: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii['2xl'],
  },
  composerInput: {
    flex: 1,
    maxHeight: 120,
    minHeight: 24,
    color: BRAND_COLORS.textPrimary,
    fontSize: 15,
    lineHeight: 20,
    paddingTop: Platform.OS === 'ios' ? 4 : 0,
    paddingBottom: Platform.OS === 'ios' ? 4 : 0,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND_COLORS.primary,
  },
  sendButtonDisabled: {
    backgroundColor: BRAND_COLORS.textDisabled,
  },
});

export default CoachScreen;
