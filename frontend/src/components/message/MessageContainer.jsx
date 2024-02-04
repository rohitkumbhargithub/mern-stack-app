import Messages from './Messages';
import MessageInput from './MessageInput';
import {TiMessages} from 'react-icons/ti';
import { useEffect } from 'react';
import useConverstion from '../../zustand/useConverstion';

const MessageContainer = () => {
    const {selectedConverstion, setSelectedConverstion} = useConverstion();

    useEffect(() => {

      // cleanup function unmount

      return () => setSelectedConverstion(null);
    }, [setSelectedConverstion]);

  return (
    <div className={`md:min-w-[700px] flex flex-col`}>
       { !selectedConverstion ? (
        <NoChatSelected />
       ) : (

        <>
            <div className='bg-slate-500 px-2 py-3 mb-2'>
                <span className='label-text'>TO: <span className='text-gray-900 font-bold'>{selectedConverstion.name}</span></span>
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
	return (
		<div className='flex items-center justify-center w-full h-full'>
			<div className='px-4 text-center sm:text-lg md:text-xl text-gray-200 font-semibold flex flex-col items-center gap-2'>
				<p>Welcome 👋 Jone ❄</p>
				<p>Select a chat to start messaging</p>
				<TiMessages className='text-3xl md:text-6xl text-center' />
			</div>
		</div>
	);
};