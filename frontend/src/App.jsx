import { Navigate, Route, Routes } from 'react-router-dom';
import Home from './pages/home/Home';
import Login from './pages/login/Login';
import Signup from './pages/signup/Signup';
import { Toaster } from 'sonner';
import { useAuthContext } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';

function App() {
  const { authUser } = useAuthContext();
  const { resolvedTheme } = useTheme();

  return (
    <div className='w-full min-h-screen bg-background text-foreground'>
      <Routes>
        <Route path='/' element={authUser ? <Home /> : <Navigate to={"/login"} />} />
        <Route path='/login' element={authUser ? <Navigate to="/" /> : <Login />} />
        <Route path='/signup' element={authUser ? <Navigate to="/" /> : <Signup />} />
      </Routes>
      <Toaster theme={resolvedTheme} richColors position="top-right" />
    </div>
  )
}

export default App;
