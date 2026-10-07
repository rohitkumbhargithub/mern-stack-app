import SideBar from '@/components/sidebar/SideBar';
import useConverstion from '../../zustand/useConverstion';
import MessageContainer from '@/components/message/MessageContainer';
import usePushNotifications from '../../hooks/usePushNotifications';

const Home = () => {
  const { selectedConverstion, isSidebarCollapsed } = useConverstion();
  // Register service worker & subscribe to Web Push (runs once after login)
  usePushNotifications();

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background">
      <div className={`grid h-full w-full transition-all duration-300 ease-in-out ${
        isSidebarCollapsed
          ? "grid-cols-1"
          : "grid-cols-1 md:grid-cols-[300px_1fr] lg:grid-cols-[340px_1fr]"
      }`}>
        <div className={`h-full border-r border-border transition-all duration-200 ${
          isSidebarCollapsed 
            ? "hidden" 
            : selectedConverstion ? "hidden md:block" : "block"
        }`}>
          <SideBar />
        </div>
        <div className={`h-full overflow-hidden ${
          !isSidebarCollapsed && !selectedConverstion ? "hidden md:block" : "block"
        }`}>
          <MessageContainer />
        </div>
      </div>
    </div>
  );
};

export default Home;