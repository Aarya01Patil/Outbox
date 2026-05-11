export function formatMessageTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
}

export function formatLastMessageTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  return d.toDateString() === now.toDateString()
    ? formatMessageTime(ts)
    : d.toLocaleDateString([], {month: 'short', day: 'numeric'});
}
