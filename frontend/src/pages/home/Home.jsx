import SideBar from '@/components/sidebar/SideBar';
import useConverstion from '../../zustand/useConverstion';
import MessageContainer from '@/components/message/MessageContainer';

const Home = () => {
  const { selectedConverstion } = useConverstion();

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background">
      <div className="grid h-full w-full sm:grid-cols-[350px_1fr]">
        <div className={`h-full border-r border-border ${selectedConverstion ? "hidden sm:block" : "block"}`}>
          <SideBar />
        </div>
        <div className={`h-full ${selectedConverstion ? "block" : "hidden sm:block"}`}>
          <MessageContainer />
        </div>
      </div>
    </div>
  )
}

export default Home;