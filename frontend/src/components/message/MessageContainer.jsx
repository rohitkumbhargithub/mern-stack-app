import Messages from './Messages';
import MessageInput from './MessageInput';
import {TiMessages} from 'react-icons/ti';
import {BiArrowBack} from 'react-icons/bi';
import { useEffect } from 'react';
import useConverstion from '../../zustand/useConverstion';
import { useAuthContext } from '../../context/AuthContext';

const MessageContainer = () => {
    const {selectedConverstion, setSelectedConverstion} = useConverstion();

    useEffect(() => {

      // cleanup function unmount

      return () => setSelectedConverstion(null);
    }, [setSelectedConverstion]);

  return (
    <div className={`w-full sm:w-2/3 flex-col ${selectedConverstion ? 'flex' : 'hidden sm:flex'}`}>
       { !selectedConverstion ? (
        <NoChatSelected />
       ) : (

        <>
            <div className='bg-slate-200 px-4 py-3 mb-2 flex items-center gap-2'>
                <button 
                  className='sm:hidden text-gray-800 hover:text-gray-600 transition' 
                  onClick={() => setSelectedConverstion(null)}
                >
                  <BiArrowBack size={20} />
                </button>
                <span className='label-text text-gray-800'>TO: <span className='text-gray-900 font-bold ml-1'>{selectedConverstion.name}</span></span>
            </div>

            <Messages />
            <MessageInput />
        </>

       )} 
    </div>
  );
};


export default MessageContainer;

const NoChatSelected = () => {
  const {authUser} = useAuthContext();
	return (
		<div className='flex items-center justify-center w-full h-full'>
			<div className='px-4 text-center sm:text-lg md:text-xl text-gray-800 font-semibold flex flex-col items-center gap-2'>
				<p>Welcome 👋 {authUser.name} ❄</p>
				<p>Select a chat to start messaging</p>
				<TiMessages className='text-3xl md:text-6xl text-center' />
			</div>
		</div>
	);
};
