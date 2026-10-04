import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import Converstion from './Converstion';
import userGetConverstions from '../../hooks/userGetConverstion';
import { Loader2 } from 'lucide-react';

const PAGE_SIZE = 20;

const Converstions = ({ searchFilter = "", onStartNewChat }) => {
  const { loading, converstions } = userGetConverstions();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const observerTargetRef = useRef(null);

  const safeList = Array.isArray(converstions) ? converstions : [];

  const filteredConversations = useMemo(() => {
    if (!searchFilter.trim()) return safeList;
    const q = searchFilter.toLowerCase();
    return safeList.filter((c) => 
      (c?.name || "").toLowerCase().includes(q)
    );
  }, [searchFilter, safeList]);

  // Reset pagination when search changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchFilter]);

  const visibleList = useMemo(() => {
    return filteredConversations.slice(0, visibleCount);
  }, [filteredConversations, visibleCount]);

  const hasMore = visibleCount < filteredConversations.length;

  const loadMore = useCallback(() => {
    setVisibleCount(prev => Math.min(prev + PAGE_SIZE, filteredConversations.length));
  }, [filteredConversations.length]);

  // Intersection observer for automatic infinite scroll
  useEffect(() => {
    const target = observerTargetRef.current;
    if (!target || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);
  
  return (
    <div className='flex flex-col overflow-auto py-1'>
      {visibleList.map((converstion) => (
        <Converstion 
          key={converstion._id}
          converstion={converstion}
        />
      ))}

      {/* Infinite Scroll Sentinel & Load More Indicator */}
      {hasMore && (
        <div ref={observerTargetRef} className="py-2.5 flex flex-col items-center justify-center gap-1">
          <button
            type="button"
            onClick={loadMore}
            className="text-[11px] font-medium text-primary hover:underline px-3 py-1 rounded-full bg-primary/5 hover:bg-primary/10 transition-colors"
          >
            Load more ({filteredConversations.length - visibleCount} remaining)
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-4">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : null}
      
      {!loading && filteredConversations.length === 0 && (
        <div className="px-4 py-8 text-center">
          <p className="text-xs text-muted-foreground italic mb-3">No conversations yet</p>
          <button
            onClick={() => onStartNewChat && onStartNewChat()}
            className="w-full rounded-lg bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
          >
            Start a new chat
          </button>
        </div>
      )}
    </div>
  );
};

export default Converstions;