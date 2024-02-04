import React from 'react'
import useConverstion from '../../zustand/useConverstion';

const Converstion = ({converstion, lastIndex, emoji}) => {
    const {selectedConverstion, setSelectedConverstion} = useConverstion();
    const isSelected = selectedConverstion?._id === converstion._id;

  return (
    <>
    <div className={`flex gap-2 items-center hover:bg-sky-500 rounded p-2 py-1 cursor-pointer
        ${isSelected ? "bg-sky-500": ""}
    `}
        onClick={() => setSelectedConverstion(converstion)}
    >
        <div className='avatar online'>
            <div className='w-12 rounded-full'>
                <img src={converstion.profile} alt='user avatar' />
            </div>
        </div>

        <div className='flex flex-col flex-1'>
            <div className='flex gap-3 justify-between'>
                <p className='font-bold text-gray-200'>{converstion.name}</p>
                <span className='text-xl'>{emoji}</span>
            </div>
        </div>
    </div>

    {!lastIndex &&  <div className='divider my-0 py-0 h-1'></div>}

    </>
  )
}

export default Converstion;