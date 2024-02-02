import React, { useState } from 'react'
import GenderCheck from './GenderCheck';
import { Link } from 'react-router-dom';

const Signup = () => {

    const [inputs, setInputs] = useState({
        name: '',
        email: '',
        password: '',
        confrimPassword: '',
        gender: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log(inputs);
    }


  return (
    <div className='flex flex-col items-center justify-center min-w-96 mx-auto'>
        <div className='w-full p-6 rounded-lg shadow-md bg-gray-400 bg-clip-padding backdrop-filter backdrop-blur-lg
         bg-opacity-0'>
            <h1 className='text-3xl font-semibold text-center text-gray-300'>SignUp
            <span className='text-blue-500'> SendChat</span></h1>

            <form onSubmit={handleSubmit}>
                <div>
                    <label className='label p-2'>
                        <span className='text-base label-text'>Name</span>
                    </label>
                    <input type="text" placeholder="Type Name" className="input input-bordered input-info w-full max-w-xs" 
                    value={inputs.name}
                    onChange={(e) => setInputs({...inputs, name: e.target.value})}
                    />
                </div>
                <div>
                    <label className='label p-2'>
                        <span className='text-base label-text'>Email</span>
                    </label>
                    <input type="email" placeholder="Type Email" className="input input-bordered input-info w-full max-w-xs" 
                        value={inputs.email}
                        onChange={(e) => setInputs({...inputs, email: e.target.value})}
                    />
                </div>
                <div>
                    <label className='label p-2'>
                        <span className='text-base label-text'>Password</span>
                    </label>
                    <input type="password" placeholder="Type Password " className="input input-bordered input-info w-full max-w-xs" 
                        value={inputs.password}
                        onChange={(e) => setInputs({...inputs, password: e.target.value})}
                    />
                </div>
                <div>
                    <label className='label p-2'>
                        <span className='text-base label-text'>Confrim Password</span>
                    </label>
                    <input type="password" placeholder="Type Confrim Password " className="input input-bordered input-info w-full max-w-xs" 
                        value={inputs.confrimPassword}
                        onChange={(e) => setInputs({...inputs, confrimPassword: e.target.value})}
                    />
                </div>

                {/* Gender checkBox */}
                <GenderCheck/>
                <Link to="/login" className='text-sm hover:underline hover: text-blue-500 mt-2 inline-block'>
                    Already have an account?
                </Link>

                <div className='btn btn-block btn-sm mt-3'>Sign Up</div>
            </form>
         </div>
    </div>
  )
}

export default Signup;