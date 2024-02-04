import React from 'react'
import Converstion from './Converstion'
import userGetConverstions from '../../hooks/userGetConverstion'
import { getRandomEmoji } from '../../utils/emojis';

const Converstions = () => {
  const {loading, converstions} = userGetConverstions();
  
  return (
    <div className='py-2 flex flex-col overflow-auto'>

      {converstions.map((converstion, index) => (
        <Converstion key={converstion._id}
          converstion={converstion}
          emoji={getRandomEmoji()}
          lastIndex={index === converstions.length - 1}
        />
      ))}

        {loading ? <span className='loading loading-spinner'></span>: null}
    </div>
  )
}

export default Converstions;