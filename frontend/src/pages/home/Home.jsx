import React from 'react'
import SideBar from '../../components/sidebar/SideBar';
import MessageContainer from '../../components/message/MessageContainer';

const Home = () => {
  return (
    <div className='flex w-full h-[100dvh] sm:h-[80vh] sm:max-w-4xl sm:rounded-lg overflow-hidden bg-white/40 bg-clip-padding backdrop-filter backdrop-blur-lg shadow-xl'>
        
        <SideBar />
        <MessageContainer />
    </div>
  )
}

export default Home;