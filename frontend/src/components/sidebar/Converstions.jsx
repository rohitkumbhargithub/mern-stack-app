import React, { useMemo } from 'react'
import Converstion from './Converstion'
import userGetConverstions from '../../hooks/userGetConverstion'

const Converstions = ({ searchFilter = "", onStartNewChat }) => {
  const { loading, converstions } = userGetConverstions();

  const filteredConversations = useMemo(() => {
    if (!searchFilter.trim()) return converstions;
    const q = searchFilter.toLowerCase();
    return converstions.filter((c) => 
      (c.name || "").toLowerCase().includes(q)
    );
  }, [searchFilter, converstions]);
  
  return (
    <div className='flex flex-col overflow-auto py-1'>
      {filteredConversations.map((converstion) => (
        <Converstion 
          key={converstion._id}
          converstion={converstion}
        />
      ))}

      {loading ? (
        <div className="flex justify-center p-4">
          <span className='loading loading-spinner text-primary'></span>
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
  )
}

export default Converstions;