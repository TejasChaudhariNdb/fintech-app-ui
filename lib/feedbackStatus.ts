export type FeedbackStatus = "under_review" | "in_progress" | "live" | "on_hold";

export interface StatusMeta {
  id: FeedbackStatus;
  label: string;
  emoji: string;
  badgeCls: string;
  dotCls: string;
  cardBorderCls?: string;
}

export const FEEDBACK_STATUSES: StatusMeta[] = [
  {
    id: "under_review",
    label: "Under Review",
    emoji: "🟡",
    badgeCls: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    dotCls: "bg-amber-500",
    cardBorderCls: "border-amber-500/20",
  },
  {
    id: "in_progress",
    label: "In Progress",
    emoji: "🔵",
    badgeCls: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    dotCls: "bg-blue-500",
    cardBorderCls: "border-blue-500/20",
  },
  {
    id: "live",
    label: "Live",
    emoji: "🟢",
    badgeCls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    dotCls: "bg-emerald-500",
    cardBorderCls: "border-emerald-500/20",
  },
  {
    id: "on_hold",
    label: "On Hold",
    emoji: "⏸️",
    badgeCls: "bg-neutral-500/10 text-neutral-500 dark:text-neutral-400 border-neutral-500/20",
    dotCls: "bg-neutral-400",
    cardBorderCls: "border-neutral-500/20",
  },
];

export const FEEDBACK_STATUS_MAP: Record<FeedbackStatus, StatusMeta> = FEEDBACK_STATUSES.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<FeedbackStatus, StatusMeta>
);

export function normalizeFeedbackStatus(rawStatus?: string | null): FeedbackStatus {
  if (!rawStatus) return "under_review";
  const s = rawStatus.toLowerCase();
  if (s === "new" || s === "seen" || s === "under_review") return "under_review";
  if (s === "accepted" || s === "in_progress") return "in_progress";
  if (s === "resolved" || s === "live") return "live";
  if (s === "not_feasible" || s === "shelved" || s === "on_hold") return "on_hold";
  return "under_review";
}

export function getFeedbackStatusMeta(rawStatus?: string | null): StatusMeta {
  const normalized = normalizeFeedbackStatus(rawStatus);
  return FEEDBACK_STATUS_MAP[normalized];
}
