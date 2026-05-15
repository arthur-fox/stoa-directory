import membersData from '@/data/members.json';
import { Member } from '@/lib/types';
import MemberGrid from '@/components/MemberGrid';

export default function Home() {
  const members = (membersData as Member[]).filter(
    (m) => m.visibility === 'public'
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            🏛️ Stoa Member Project Directory
          </h1>
          <p className="mt-2 text-zinc-500">
            Meet the people in our community and what they&apos;re building.
          </p>
        </div>
        <MemberGrid members={members} />
      </div>
    </main>
  );
}
