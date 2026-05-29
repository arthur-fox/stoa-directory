export type Visibility = 'public' | 'community';
export type ProjectStatus = 'active' | 'shipped' | 'wip';

export interface SocialLinks {
  twitter?: string;
  linkedin?: string;
  website?: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  url?: string | null;
  type: string;
  tags: string[];
  visibility: Visibility;
  status: ProjectStatus;
  thumbnail?: string | null;
  seekingFeedback: boolean;
  feedbackPrompt?: string;
}

export interface Member {
  id: string;
  slug: string;
  name: string;
  avatar?: string | null;
  bio: string;
  location?: string | null;
  social: SocialLinks;
  tags: string[];
  visibility: Visibility;
  projects: Project[];
}
