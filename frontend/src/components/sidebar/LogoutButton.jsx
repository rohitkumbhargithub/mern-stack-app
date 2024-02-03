import React from 'react';
import { RiLogoutCircleLine } from "react-icons/ri";
import userLogout from '../../hooks/userLogout';


const LogoutButton = () => {

  const {loading, logout} = userLogout();


  return (
    <div className='mt-auto cursor-pointer'>
        {!loading ? (
          <RiLogoutCircleLine className='w-6 h-6 text-white'
          onClick={logout}/>
        ) : (
          <span className='loading loading-spinner'></span>
        )}
    </div>
  )
}

export default LogoutButton;