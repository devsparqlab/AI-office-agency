type StampMode = 'date' | 'time';

export function formatLiveLogStamp(value: string | undefined, mode: StampMode): string {
  if (!value) return mode === 'date' ? '---- -- --' : '--:--:--';

  if (mode === 'date') {
    const dateOnly = value.match(/^(\d{4}-\d{2}-\d{2})/);
    return dateOnly ? dateOnly[1] : '---- -- --';
  }

  const d = new Date(value);
  return isNaN(d.getTime()) ? '--:--:--' : d.toTimeString().slice(0, 8);
}
