type LiveNotificationPayload = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
};

type Subscriber = (payload: LiveNotificationPayload) => void;

type LiveNotifyState = {
  subscribersByUser: Map<string, Set<Subscriber>>;
};

const globalState = globalThis as unknown as { __wrdLiveNotify?: LiveNotifyState };

function getState(): LiveNotifyState {
  if (!globalState.__wrdLiveNotify) {
    globalState.__wrdLiveNotify = { subscribersByUser: new Map() };
  }
  return globalState.__wrdLiveNotify;
}

export function subscribeUserNotifications(userId: string, subscriber: Subscriber): () => void {
  const state = getState();
  const existing = state.subscribersByUser.get(userId) ?? new Set<Subscriber>();
  existing.add(subscriber);
  state.subscribersByUser.set(userId, existing);

  return () => {
    const current = state.subscribersByUser.get(userId);
    if (!current) return;
    current.delete(subscriber);
    if (current.size === 0) state.subscribersByUser.delete(userId);
  };
}

export function publishUserNotification(userId: string, payload: LiveNotificationPayload): void {
  const state = getState();
  const subscribers = state.subscribersByUser.get(userId);
  if (!subscribers || subscribers.size === 0) return;

  for (const subscriber of subscribers) {
    try {
      subscriber(payload);
    } catch {
      // Ignore subscriber-level failures and continue fanout.
    }
  }
}
