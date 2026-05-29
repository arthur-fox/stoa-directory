import { supabase } from '@/lib/supabase';
import ProjectDetailClient from '@/components/ProjectDetailClient';

export async function generateStaticParams() {
  const { data } = await supabase.from('projects').select('id');
  return (data ?? []).map((p: { id: string }) => ({ id: p.id }));
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: Props) {
  const { id } = await params;
  return <ProjectDetailClient id={id} />;
}
