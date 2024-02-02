import React from 'react';
import { RiLogoutCircleLine } from "react-icons/ri";

const LogoutButton = () => {
  return (
    <div className='mt-auto cursor-pointer'>
        <RiLogoutCircleLine className='w-6 h-6 text-white'/>
    </div>
  )
}

export default LogoutButton;