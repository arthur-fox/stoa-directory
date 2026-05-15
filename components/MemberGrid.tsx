import { Member } from '@/lib/types';
import MemberTile from './MemberTile';

interface Props {
  members: Member[];
}

export default function MemberGrid({ members }: Props) {
  if (members.length === 0) {
    return (
      <p className="py-24 text-center text-zinc-400">No members to display.</p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {members.map((member) => (
        <MemberTile key={member.id} member={member} />
      ))}
    </div>
  );
}
