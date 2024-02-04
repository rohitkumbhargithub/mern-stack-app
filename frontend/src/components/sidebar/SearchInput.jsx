import { useState } from 'react'
import { IoSearch } from "react-icons/io5";
import useConverstion from '../../zustand/useConverstion';
import userGetConverstions from '../../hooks/userGetConverstion';
import toast from 'react-hot-toast';

const SearchInput = () => {
  const [search, setSearch] = useState("");
  const {setSelectedConverstion} = useConverstion();
  const {converstions} = userGetConverstions();

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if(!search) return;

    if(search.length < 3){
      return toast.error('searching must be more than 3 charachter!');
    }

    const conversation = converstions.find((c) => c.name.toLowerCase().includes(search.toLowerCase()));

    if(conversation){
      setSelectedConverstion(conversation);
      setSearch('');
    }else{
      toast.error('No such user found!');
    }


  }

  return (
    <form onSubmit={handleSubmit} className='flex items-center gap-2'>
        <input type="text" placeholder='Search..' className='input input-bordered rounded-full'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type='submit' className='btn btn-circle bg-sky-600'>
            <IoSearch className='w-6 h-6 outline-none ' />
        </button>
    </form>
  )
}

export default SearchInput;