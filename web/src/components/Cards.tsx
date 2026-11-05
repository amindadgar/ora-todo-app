import type { ReactNode } from 'react';
import { Button, TextButton } from './Buttons';
import { ProgressBar } from './Progress';

export const Card = ({ children, className = '', as: As = 'section', ...p }: { children: ReactNode; className?: string; as?: 'section' | 'div' } & React.HTMLAttributes<HTMLElement>) =>
  <As className={`o-card ${className}`} {...(p as object)}>{children}</As>;
export const SoftCard = ({ children, className = '' }: { children: ReactNode; className?: string }) => <section className={`o-soft ${className}`}>{children}</section>;
export const SectionHeader = ({ children, id }: { children: ReactNode; id?: string }) => <h2 id={id} className="t-body section-title" style={{ fontWeight: 700 }}>{children}</h2>;

/** Free-time suggestion card (Home). */
export function FreeTimeCard({ slot, title, meta, added, labels, onAdd, onNext, onAll }:
  { slot: string; title: string; meta: string; added: boolean; labels: { header: string; add: string; inPlan: string; another: string; all: string }; onAdd: () => void; onNext: () => void; onAll: () => void }) {
  return (
    <SoftCard className="freecard">
      <span className="t-caption on-soft">{labels.header}: {slot}</span>
      <span className="t-body-lg" style={{ fontWeight: 700 }}>{title}</span>
      <span className="t-caption muted">{meta}</span>
      <div className="freecard__actions">
        <Button variant={added ? 'secondary' : 'primary'} disabled={added} onClick={onAdd} style={added ? { background: 'var(--c-border-default)', color: 'var(--c-text-secondary)', border: 'none', opacity: 1 } : undefined}>{added ? labels.inPlan : labels.add}</Button>
        <TextButton small onClick={onNext}>{labels.another}</TextButton>
        <TextButton small onClick={onAll} style={{ color: 'var(--c-text-secondary)', fontWeight: 400 }}>{labels.all}</TextButton>
      </div>
    </SoftCard>
  );
}
/** Summary card (Money "Left this month"). */
export function SummaryCard({ label, value, income, spent, incomeLabel, spentLabel }: { label: string; value: string; income: string; spent: string; incomeLabel: string; spentLabel: string }) {
  return (
    <SoftCard className="summary">
      <span className="t-caption on-soft">{label}</span>
      <span className="t-title tnum">{value}</span>
      <div style={{ display: 'flex', gap: 'var(--space-20)', flexWrap: 'wrap' }} className="t-small">
        <span>{incomeLabel}: <b className="success">{income}</b></span>
        <span>{spentLabel}: <b className="danger">{spent}</b></span>
      </div>
    </SoftCard>
  );
}
/** Review card (year in review). */
export function ReviewCard({ title, line, stats }: { title: string; line: string; stats: string }) {
  return (
    <SoftCard className="freecard">
      <span className="t-caption on-soft">{title}</span>
      <span className="t-subheading">{line}</span>
      <span className="t-small" style={{ lineHeight: 1.8 }}>{stats}</span>
    </SoftCard>
  );
}
/** Goal / savings row with progress + a "+1" button. */
export function GoalRow({ title, right, detail, progress, animate, plusLabel, plusAria, floatOn, floatAnim, floatClass, onEdit, onPlus, size = 'goal' }:
  { title: string; right?: string; detail: string; progress: number; animate: boolean; plusLabel: string; plusAria: string; floatOn: boolean; floatAnim: string; floatClass?: string; onEdit: () => void; onPlus: () => void; size?: 'goal' | 'saving' }) {
  return (
    <div className="row" style={{ padding: 'var(--space-10) 0', gap: 'var(--space-10)' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', minWidth: 0 }}>
        {size === 'goal' ? (
          <>
            <button type="button" onClick={onEdit} className="t-label" style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-8)', minHeight: 32, alignItems: 'center', fontWeight: 400 }}>
              <span style={{ fontWeight: 600 }}>{title}</span>{right && <span className="brand" style={{ fontWeight: 600 }}>{right}</span>}
            </button>
            <ProgressBar value={progress} animate={animate} />
            <span className="t-caption muted">{detail}</span>
          </>
        ) : (
          <>
            <button type="button" onClick={onEdit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', minHeight: 40, justifyContent: 'center' }}>
              <span className="t-label" style={{ fontWeight: 400 }}>{title}</span><span className="t-caption muted">{detail}</span>
            </button>
            <ProgressBar value={progress} animate={animate} />
          </>
        )}
      </div>
      <button type="button" className={`plusone ${size === 'goal' ? 't-small' : 't-caption'}`} aria-label={plusAria} onClick={onPlus}>
        {plusLabel}{floatOn && <span className={`plusone__float ${size === 'goal' ? 't-label brand' : 't-caption success'}`} style={{ animation: floatAnim, fontWeight: 700 }} key={floatClass}>{plusLabel}</span>}
      </button>
    </div>
  );
}
