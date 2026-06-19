import { useState } from 'react';
import { Check, Copy, Users } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar';
import { Badge } from '@/shared/components/ui/badge';
import type { Team, TeamMember } from '../types/dashboard_types';

interface TeamInfoSectionProps {
  team: Team;
  members: TeamMember[];
  currentUserId?: string | null;
}

export function TeamInfoSection({ team, members, currentUserId }: TeamInfoSectionProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(team.invite_code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-sm">
      {/* Team name + invite code */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-0.5 text-xs font-medium uppercase tracking-widest text-zinc-500">
            Your Team
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100">
            {team.name}
          </h2>
        </div>

        {/* Invite code badge */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/60 px-4 py-2">
            <span className="text-xs font-medium text-zinc-500">Invite code</span>
            <span className="font-mono text-sm font-bold tracking-[0.2em] text-emerald-400">
              {team.invite_code}
            </span>
          </div>
          <button
            id="copy-invite-btn"
            onClick={handleCopy}
            aria-label="Copy invite code"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800/60 text-zinc-400 transition-all hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-400 cursor-pointer"
          >
            {copied ? (
              <Check className="size-4 text-emerald-400" />
            ) : (
              <Copy className="size-4" />
            )}
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="mb-5 h-px bg-zinc-800" />

      {/* Members */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Users className="size-4 text-zinc-500" />
          <span className="text-sm font-medium text-zinc-400">
            Team Members
          </span>
          <Badge
            variant="secondary"
            className="h-5 min-w-5 bg-zinc-800 px-1.5 text-xs text-zinc-300"
          >
            {members.length}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          {members.map((member, idx) => {
            const isSelf = member.id === currentUserId;
            const displayName = isSelf 
              ? "You" 
              : (member.name || member.email || `User ${idx + 1}`);
            const initials = isSelf
              ? "Y"
              : displayName.slice(0, 2).toUpperCase();

            return (
              <div
                key={member.id}
                className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-800/40 px-3 py-1.5"
              >
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="bg-emerald-500/20 text-[10px] font-bold text-emerald-400">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="max-w-40 truncate text-xs text-zinc-300">
                  {displayName}
                </span>
              </div>
            );
          })}
          {members.length === 0 && (
            <p className="text-sm text-zinc-500">No members yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}
