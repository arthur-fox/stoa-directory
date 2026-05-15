import membersData from '@/data/members.json';
import { Member } from '@/lib/types';
import MemberGrid from '@/components/MemberGrid';

export default function Home() {
  const members = (membersData as Member[]).filter(
    (m) => m.visibility === 'public'
  );

  return (
    <main className="relative min-h-screen bg-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-violet-100 to-transparent" />
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950">
            🏛️ Stoa Member Project Directory
          </h1>
          <p className="mt-2 text-zinc-600">
            Meet the people in our community and what they&apos;re building.
          </p>
        </div>
        <MemberGrid members={members} />
      </div>
    </main>
  );
}
