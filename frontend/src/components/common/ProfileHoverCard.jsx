import React from 'react';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { UserAvatar } from './UserAvatar';
import { Sparkles, Users, Mail, Circle, MessageSquare } from 'lucide-react';

export function ProfileHoverCard({
  user,
  isOnline = false,
  isAI = false,
  isGroup = false,
  align = "start",
  side = "right",
  children
}) {
  if (!user && !isAI) return children;

  const displayName = isAI 
    ? "SendChat AI" 
    : (user?.display_name || user?.name || user?.username || "User");

  const avatarSrc = user?.avatar_url || user?.profilePic || user?.profile;
  const username = user?.username ? `@${user.username}` : (user?.email || "");
  const membersCount = user?.membersCount || (user?.participated ? user.participated.length : 0);

  return (
    <HoverCard openDelay={250} closeDelay={150}>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent
        side={side}
        align={align}
        className="w-72 p-3.5 bg-card/95 backdrop-blur-md border border-border/80 shadow-xl rounded-xl z-50 text-foreground animate-in fade-in-50 zoom-in-95"
      >
        <div className="flex items-start gap-3">
          <div className="relative">
            <UserAvatar
              src={avatarSrc}
              name={displayName}
              size="lg"
              isAI={isAI}
              isGroup={isGroup}
              groupAvatar={user?.groupAvatar}
              online={isOnline}
              showOnlineDot={!isGroup}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="text-sm font-bold text-foreground truncate max-w-[140px]">
                {displayName}
              </h4>
              {isAI && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-bold border border-primary/20">
                  <Sparkles className="h-2.5 w-2.5" />
                  AI BOT
                </span>
              )}
              {isGroup && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-[9px] font-bold border border-blue-500/20">
                  <Users className="h-2.5 w-2.5" />
                  GROUP
                </span>
              )}
            </div>

            {username && !isGroup && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {username}
              </p>
            )}

            {isGroup && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {membersCount > 0 ? `${membersCount} participants` : "Group conversation"}
              </p>
            )}

            {/* Status indicator */}
            <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium">
              {isAI ? (
                <span className="flex items-center gap-1 text-primary">
                  <Circle className="h-2 w-2 fill-primary animate-pulse" />
                  Always active & ready to assist
                </span>
              ) : isGroup ? (
                <span className="text-muted-foreground">
                  Shared discussion channel
                </span>
              ) : isOnline ? (
                <span className="flex items-center gap-1 text-emerald-500 font-semibold">
                  <Circle className="h-2 w-2 fill-emerald-500" />
                  Online now
                </span>
              ) : (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Circle className="h-2 w-2 fill-zinc-400" />
                  Offline
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer info snippet */}
        <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
          {user?.email && !isGroup && !isAI ? (
            <span className="flex items-center gap-1 truncate max-w-[190px]">
              <Mail className="h-3 w-3 shrink-0 opacity-70" />
              <span className="truncate">{user.email}</span>
            </span>
          ) : isGroup ? (
            <span className="truncate">
              Click header to manage members
            </span>
          ) : (
            <span>SendChat Contact</span>
          )}
          <span className="inline-flex items-center gap-0.5 text-primary text-[10px] font-medium shrink-0">
            <MessageSquare className="h-2.5 w-2.5" />
            Chat
          </span>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export default ProfileHoverCard;
