import React from 'react'
import { Link } from 'react-router-dom';

const Login = () => {
  return (
    <div className='flex flex-col items-center justify-center min-w-96 mx-auto'>
        <div className='w-full p-6 rounded-lg shadow-md bg-gray-400 bg-clip-padding backdrop-filter backdrop-blur-lg
         bg-opacity-0'>
            <h1 className='text-3xl font-semibold text-center text-gray-300'>Login
            <span className='text-blue-500'> SendChat</span></h1>

            <form>
                <div>
                    <label className='label p-2'>
                        <span className='text-base label-text'>Email</span>
                    </label>
                    <input type="email" placeholder="Type here" className="input input-bordered input-info w-full max-w-xs" />
                </div>
                <div>
                    <label className='label p-2'>
                        <span className='text-base label-text'>Password</span>
                    </label>
                    <input type="password" placeholder="Type here" className="input input-bordered input-info w-full max-w-xs" />
                </div>
                <Link to="/signup" className='text-sm hover:underline hover: text-blue-500 mt-2 inline-block'>
                    Don't have an account?
                </Link>

                <div className='btn btn-block btn-sm mt-3'>Log in</div>
            </form>
         </div>
    </div>
  )
}

export default Login;