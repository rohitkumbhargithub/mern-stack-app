import React from 'react'
import GenderCheck from './GenderCheck';

const Signup = () => {
  return (
    <div className='flex flex-col items-center justify-center min-w-96 mx-auto'>
        <div className='w-full p-6 rounded-lg shadow-md bg-gray-400 bg-clip-padding backdrop-filter backdrop-blur-lg
         bg-opacity-0'>
            <h1 className='text-3xl font-semibold text-center text-gray-300'>SignUp
            <span className='text-blue-500'> SendChat</span></h1>

            <form>
                <div>
                    <label className='label p-2'>
                        <span className='text-base label-text'>Name</span>
                    </label>
                    <input type="text" placeholder="Type Name" className="input input-bordered input-info w-full max-w-xs" />
                </div>
                <div>
                    <label className='label p-2'>
                        <span className='text-base label-text'>Email</span>
                    </label>
                    <input type="email" placeholder="Type Email" className="input input-bordered input-info w-full max-w-xs" />
                </div>
                <div>
                    <label className='label p-2'>
                        <span className='text-base label-text'>Password</span>
                    </label>
                    <input type="password" placeholder="Type Password " className="input input-bordered input-info w-full max-w-xs" />
                </div>
                <div>
                    <label className='label p-2'>
                        <span className='text-base label-text'>Confrim Password</span>
                    </label>
                    <input type="password" placeholder="Type Confrim Password " className="input input-bordered input-info w-full max-w-xs" />
                </div>

                {/* Gender checkBox */}
                <GenderCheck/>
                <a href="#" className='text-sm hover:underline hover: text-blue-500 mt-2 inline-block'>
                    Already have an account?
                </a>

                <div className='btn btn-block btn-sm mt-3'>Sign Up</div>
            </form>
         </div>
    </div>
  )
}

export default Signup;