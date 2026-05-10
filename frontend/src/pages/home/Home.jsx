import React from 'react'
import SideBar from '../../components/sidebar/SideBar';
import MessageContainer from '../../components/message/MessageContainer';

const Home = () => {
  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background">
      <div className="grid h-full w-full grid-cols-[320px_1fr]">
        <SideBar />
        <MessageContainer />
      </div>
    </div>
  )
}

export default Home;