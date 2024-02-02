import React from 'react'
import SearchInput from './SearchInput'
import Converstions from './Converstions'
import LogoutButton from './LogoutButton'

const SideBar = () => {
  return (
    <div className='border-r border-slate-300 p-4 flex flex-col'>
        <SearchInput />
        <div className='divider px-3'></div>
        <Converstions />
        <LogoutButton />
    </div>
  )
}

export default SideBar