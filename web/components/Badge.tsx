const STATUS: Record<string, string> = {
  new: 'bg-slate-700 text-slate-200',
  processing: 'bg-amber-500/20 text-amber-300',
  needs_review: 'bg-indigo-500/20 text-indigo-300',
  resolved: 'bg-emerald-500/20 text-emerald-300',
  rejected: 'bg-slate-600/40 text-slate-300',
  failed: 'bg-red-500/20 text-red-300',
};
const PRIORITY: Record<string, string> = {
  low: 'text-slate-400',
  normal: 'text-slate-200',
  high: 'text-orange-300',
  urgent: 'text-red-400',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS[status] ?? STATUS.new}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

export function Priority({ value }: { value: string | null }) {
  if (!value) return null;
  return <span className={`text-xs font-medium uppercase ${PRIORITY[value] ?? ''}`}>{value}</span>;
}
