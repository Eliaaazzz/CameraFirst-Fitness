/**
 * Coach realtime client — AI Coach chat over the Go realtime gateway WebSocket.
 *
 * Transport: native WebSocket (built into React Native; no extra dependency).
 * The gateway proxies the backend SSE coach stream over a single WS connection
 * and also fans out unsolicited social events.
 *
 * Protocol (see gateway/README.md):
 *   Connect:  ${GATEWAY_URL}/ws?token=<JWT>
 *   Send:     {"type":"chat","sessionId":<uuid|"">,"message":"<text>"}
 *   Receive:  {"event":"meta|tool_call|tool_result|token|done|error|social","data":"<string>"}
 *             `data` is ALWAYS a string. For "token" it is a plain-text delta;
 *             for the others it is a JSON document encoded as a string.
 *
 * Auth mirrors apiClient.ts: the JWT comes from the in-memory auth store (or
 * SecureStore on cold start). On web the JWT lives in an HttpOnly cookie that
 * JavaScript cannot read, so token-in-query auth is unavailable there — callers
 * should surface `CoachUnavailableReason.WEB_TOKEN_UNAVAILABLE` to the user.
 */

import { API_BASE_URL } from '@env';
import { Platform } from 'react-native';

import { getAuthState } from '@/stores/useAuthStore';
import { getJWT } from '@/utils/jwtStorage';

/** Coach/gateway event names as delivered in the outbound frame envelope. */
export type CoachEventName =
  | 'meta'
  | 'tool_call'
  | 'tool_result'
  | 'token'
  | 'groundedness'
  | 'done'
  | 'error'
  | 'social';

/** A raw frame exactly as it arrives on the wire. `data` is always a string. */
export interface CoachFrame {
  event: CoachEventName;
  data: string;
}

/** Connection lifecycle states surfaced to the UI. */
export type CoachConnectionState = 'idle' | 'connecting' | 'open' | 'closed' | 'error';

/** Reasons a connection cannot be established, for user-facing messaging. */
export enum CoachUnavailableReason {
  /** Web stores the JWT in an HttpOnly cookie; JS cannot read it for the query param. */
  WEB_TOKEN_UNAVAILABLE = 'web_token_unavailable',
  /** No JWT available (signed out / not yet hydrated). */
  NO_TOKEN = 'no_token',
}

export interface CoachClientHandlers {
  /** Fired for every inbound frame (token/meta/tool_call/tool_result/done/error/social). */
  onFrame: (frame: CoachFrame) => void;
  /** Connection state transitions. */
  onStateChange?: (state: CoachConnectionState) => void;
  /** Non-frame transport error (e.g. socket failure, unavailable transport). */
  onError?: (message: string, reason?: CoachUnavailableReason) => void;
}

const GATEWAY_DEFAULT_PORT = 8090;

/**
 * Resolve the gateway base URL (ws://host:port), honoring EXPO_PUBLIC_GATEWAY_URL
 * and otherwise deriving it from the API base host on port 8090.
 *
 * EXPO_PUBLIC_* vars are inlined by Expo at build time, so we also read
 * process.env directly as a fallback (matching the apiClient.ts pattern).
 */
export function resolveGatewayUrl(): string {
  const explicit =
    process.env.EXPO_PUBLIC_GATEWAY_URL || (globalThis as { EXPO_PUBLIC_GATEWAY_URL?: string }).EXPO_PUBLIC_GATEWAY_URL;
  if (explicit) {
    return stripTrailingSlash(explicit);
  }

  const apiBase =
    API_BASE_URL ||
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    getDevFallbackApiBase() ||
    'https://aurafitness.org';

  return deriveGatewayFromApiBase(apiBase);
}

function getDevFallbackApiBase(): string | null {
  if (!__DEV__) return null;
  // Android emulator cannot reach the host via localhost.
  if (Platform.OS === 'android') return 'http://10.0.2.2:8080';
  return 'http://localhost:8080';
}

/**
 * Convert an http(s) API base into a ws(s) gateway URL on the gateway port.
 * - https -> wss, http -> ws
 * - replaces the API port with the gateway port (8090)
 */
function deriveGatewayFromApiBase(apiBase: string): string {
  const trimmed = stripTrailingSlash(apiBase).replace(/\/api\/v1$/, '');
  const httpsMatch = /^https:\/\//i.test(trimmed);
  const wsScheme = httpsMatch ? 'wss' : 'ws';
  const withoutScheme = trimmed.replace(/^https?:\/\//i, '');
  const [hostAndPort, ...rest] = withoutScheme.split('/');
  const host = hostAndPort.split(':')[0];
  const path = rest.length ? `/${rest.join('/')}` : '';
  return `${wsScheme}://${host}:${GATEWAY_DEFAULT_PORT}${path}`;
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

/**
 * Read the JWT the same way apiClient does: prefer the in-memory token, fall
 * back to SecureStore on mobile. Returns null on web (HttpOnly cookie) or when
 * signed out.
 */
async function readToken(): Promise<{ token: string | null; reason?: CoachUnavailableReason }> {
  if (Platform.OS === 'web') {
    // The JWT is in an HttpOnly cookie the browser sends to same-origin HTTP
    // requests, but it is not readable from JS and cannot be put in the WS
    // query string. WS coach chat is therefore mobile-only in this build.
    return { token: null, reason: CoachUnavailableReason.WEB_TOKEN_UNAVAILABLE };
  }

  const inMemory = getAuthState().userToken;
  const token = inMemory || (await getJWT());
  if (!token) {
    return { token: null, reason: CoachUnavailableReason.NO_TOKEN };
  }
  return { token };
}

/**
 * CoachClient encapsulates connect / sendMessage / subscription for a single
 * WebSocket session. Create one per CoachScreen mount and `close()` on unmount.
 */
export class CoachClient {
  private socket: WebSocket | null = null;
  private handlers: CoachClientHandlers;
  private state: CoachConnectionState = 'idle';
  private closedByCaller = false;

  constructor(handlers: CoachClientHandlers) {
    this.handlers = handlers;
  }

  /**
   * Swap the active handlers. Lets a React caller keep the client instance
   * stable across re-renders while always invoking the latest closures, so a
   * frame handler can never go stale.
   */
  setHandlers(handlers: CoachClientHandlers): void {
    this.handlers = handlers;
  }

  getState(): CoachConnectionState {
    return this.state;
  }

  /** Open the WebSocket. Safe to call once; ignored if already connecting/open. */
  async connect(): Promise<void> {
    if (this.state === 'connecting' || this.state === 'open') {
      return;
    }
    this.closedByCaller = false;
    this.setState('connecting');

    const { token, reason } = await readToken();
    // The caller may have unmounted (close()) while we awaited the token; bail
    // before opening a socket we would immediately orphan.
    if (this.closedByCaller) {
      return;
    }
    if (!token) {
      this.setState('error');
      this.handlers.onError?.(
        reason === CoachUnavailableReason.WEB_TOKEN_UNAVAILABLE
          ? 'The AI Coach is available in the mobile app.'
          : 'Please sign in to chat with the AI Coach.',
        reason
      );
      return;
    }

    const url = `${resolveGatewayUrl()}/ws?token=${encodeURIComponent(token)}`;

    try {
      const socket = new WebSocket(url);
      this.socket = socket;

      socket.onopen = () => {
        if (this.closedByCaller) return;
        this.setState('open');
      };

      // RN's WebSocket and the DOM lib both deliver an event with a `.data`
      // payload; type it structurally so we don't depend on a platform-specific
      // event type name (e.g. WebSocketMessageEvent) that isn't always declared.
      socket.onmessage = (event: { data: unknown }) => {
        const frame = parseFrame(event.data);
        if (frame) {
          this.handlers.onFrame(frame);
        }
      };

      socket.onerror = () => {
        if (this.closedByCaller) return;
        this.setState('error');
        this.handlers.onError?.('Lost connection to the AI Coach. Tap retry to reconnect.');
      };

      socket.onclose = () => {
        if (this.closedByCaller) return;
        this.setState('closed');
      };
    } catch {
      this.setState('error');
      this.handlers.onError?.('Could not connect to the AI Coach.');
    }
  }

  /**
   * Send a chat message. `sessionId` may be null/undefined to start a new
   * conversation (the gateway forwards null to the backend). Returns false if
   * the socket is not open.
   */
  sendMessage(message: string, sessionId: string | null): boolean {
    if (!this.socket || this.state !== 'open') {
      return false;
    }
    const frame = {
      type: 'chat' as const,
      sessionId: sessionId ?? '',
      message,
    };
    this.socket.send(JSON.stringify(frame));
    return true;
  }

  /** Close the socket and stop emitting state/errors to handlers. */
  close(): void {
    this.closedByCaller = true;
    if (this.socket) {
      try {
        this.socket.close();
      } catch {
        // ignore — socket may already be closing
      }
      this.socket = null;
    }
    this.setState('closed');
  }

  private setState(next: CoachConnectionState): void {
    if (this.state === next) return;
    this.state = next;
    this.handlers.onStateChange?.(next);
  }
}

/** Parse a raw wire message into a typed frame, tolerating malformed input. */
function parseFrame(raw: unknown): CoachFrame | null {
  if (typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw) as { event?: unknown; data?: unknown };
    if (typeof parsed.event !== 'string') return null;
    const data = typeof parsed.data === 'string' ? parsed.data : JSON.stringify(parsed.data ?? '');
    return { event: parsed.event as CoachEventName, data };
  } catch {
    return null;
  }
}

/**
 * Helper: safely JSON-parse a frame's `data` payload (used for meta/tool_*).
 * Returns null when the data is plain text or invalid JSON.
 */
export function parseFrameData<T>(data: string): T | null {
  try {
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

/**
 * Best-effort human label for a tool_call / tool_result payload, used to render
 * activity chips like "🔧 looked up your meal history".
 */
export function describeTool(frame: CoachFrame): string {
  const payload = parseFrameData<Record<string, unknown>>(frame.data);
  const rawName =
    (payload?.name as string | undefined) ||
    (payload?.tool as string | undefined) ||
    (payload?.toolName as string | undefined);

  const label = rawName ? humanizeToolName(rawName) : 'a tool';
  return frame.event === 'tool_result' ? `Used ${label}` : `Looking up ${label}`;
}

function humanizeToolName(name: string): string {
  const known: Record<string, string> = {
    get_meal_history: 'your meal history',
    meal_history: 'your meal history',
    get_nutrition: 'your nutrition data',
    nutrition: 'your nutrition data',
    get_goals: 'your goals',
    goals: 'your goals',
    get_profile: 'your profile',
    profile: 'your profile',
    get_weight_history: 'your weight history',
    weight: 'your weight history',
  };
  if (known[name]) return known[name];
  return name.replace(/_/g, ' ').replace(/\bget\b/g, '').trim() || 'a tool';
}
