import React from 'react'
import SearchInput from './SearchInput'
import Converstions from './Converstions'
import LogoutButton from './LogoutButton'
import useConverstion from '../../zustand/useConverstion'

const SideBar = () => {
  const { selectedConverstion } = useConverstion();

  return (
    <div className={`border-r border-slate-300 p-4 flex-col w-full sm:w-1/3 ${selectedConverstion ? 'hidden sm:flex' : 'flex'}`}>
        <SearchInput />
        <div className='divider px-3'></div>
        <Converstions />
        <LogoutButton />
    </div>
  )
}

export default SideBar