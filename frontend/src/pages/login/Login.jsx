import { useState } from 'react'
import { Link } from 'react-router-dom';
import userLogin from '../../hooks/userLogin';
import { MessageCircle } from "lucide-react";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const Login = () => {

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const {loading, login} = userLogin();

    const handleSubmit = async (e) => {
        e.preventDefault();
        await login(email, password);
    }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-7 shadow-sm">
        <Link to="/" className="mb-6 flex items-center gap-2 font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary">
            <MessageCircle className="h-4 w-4" />
          </span>
          SendChat
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">Log in to continue chatting.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <Input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <Input
            type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <Button
            type="submit" disabled={loading}
            className="w-full mt-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex justify-center items-center h-10"
          >
            {loading ? <span className='loading loading-spinner'></span> : "Sign in"}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link to="/signup" className="text-primary hover:underline">Create an account</Link>
        </p>
      </div>
    </div>
  )
}

export default Login;