export function formatDate(dateIso: string): string {
  const d = new Date(dateIso);
  return d.toLocaleDateString("fr-CA", { day: "numeric", month: "short", year: "numeric" });
}

export function timeAgo(dateIso: string): string {
  const date = new Date(dateIso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays > 0) return `il y a ${diffDays} jour${diffDays > 1 ? "s" : ""}`;
  if (diffHours > 0) return `il y a ${diffHours} heure${diffHours > 1 ? "s" : ""}`;
  if (diffMinutes > 0) return `il y a ${diffMinutes} minute${diffMinutes > 1 ? "s" : ""}`;
  return "À l'instant";
}
