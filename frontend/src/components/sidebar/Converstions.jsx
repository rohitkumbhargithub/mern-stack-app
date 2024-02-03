import React from 'react'
import Converstion from './Converstion'
import userGetConverstions from '../../hooks/userGetConverstion'

const Converstions = () => {
  const {loading, converstions} = userGetConverstions();
  console.log("converstions ", converstions);
  return (
    <div className='py-2 flex flex-col overflow-auto'>
        <Converstion/>
        <Converstion/>
        <Converstion/>
        <Converstion/>
        <Converstion/>
        <Converstion/>
    </div>
  )
}

export default Converstions