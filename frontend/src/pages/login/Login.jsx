import { useState } from 'react'
import { Link } from 'react-router-dom';
import userLogin from '../../hooks/userLogin';

const Login = () => {

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const {loading, login} = userLogin();

    const handleSubmit = async (e) => {
        e.preventDefault();
        await login(email, password);
    }

  return (
    <div className='flex flex-col items-center justify-center min-w-96 mx-auto'>
        <div className='w-full p-6 rounded-lg shadow-md bg-gray-400 bg-clip-padding backdrop-filter backdrop-blur-lg
         bg-opacity-0'>
            <h1 className='text-3xl font-semibold text-center text-gray-300'>Login
            <span className='text-blue-500'> SendChat</span></h1>

            <form onSubmit={handleSubmit}>
                <div>
                    <label className='label p-2'>
                        <span className='text-base label-text'>Email</span>
                    </label>
                    <input type="email" placeholder="Type here" className="input input-bordered input-info w-full max-w-xs"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>
                <div>
                    <label className='label p-2'>
                        <span className='text-base label-text'>Password</span>
                    </label>
                    <input type="password" placeholder="Type here" className="input input-bordered input-info w-full max-w-xs"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>
                <Link to="/signup" className='text-sm hover:underline hover: text-blue-500 mt-2 inline-block'>
                    Don't have an account?
                </Link>

                <button className='btn btn-block btn-sm mt-3'
                    disabled={loading}
                >
                    {loading ? <span className='loading loading-spinner'></span> : "Login"}
                </button>
            </form>
         </div>
    </div>
  )
}

export default Login;