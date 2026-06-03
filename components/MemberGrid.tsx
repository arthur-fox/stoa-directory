import { Member } from '@/lib/types';
import MemberTile from './MemberTile';

interface Props {
  members: Member[];
}

export default function MemberGrid({ members }: Props) {
  if (members.length === 0) {
    return (
      <p style={{
        padding: '96px 0', textAlign: 'center',
        fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif',
        color: 'var(--text-muted)', fontSize: 14,
      }}>
        No members to display.
      </p>
    );
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 12,
    }}>
      {members.map((member) => (
        <MemberTile key={member.id} member={member} />
      ))}
    </div>
  );
}
