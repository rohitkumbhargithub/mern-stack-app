// import { useState } from 'react'

import { Route, Routes } from 'react-router-dom';
import './App.css'
import Home from './pages/home/Home';
import Login from './pages/login/Login';
import Signup from './pages/signup/Signup';




function App() {
  // const [count, setCount] = useState(0)

  return (
   <div className='p-3 h-screen flex items-center justify-center'>
      <Routes>
        <Route path='/' element={<Home/>}/>
        <Route path='/login' element={<Login />}/>
        <Route path='/signup' element={<Signup/>}/>
      </Routes>
   </div>
  )
}

export default App;
