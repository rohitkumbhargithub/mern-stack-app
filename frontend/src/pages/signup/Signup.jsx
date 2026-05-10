import React, { useState } from 'react'
import GenderCheck from './GenderCheck';
import { Link } from 'react-router-dom';
import userSignup from '../../hooks/userSignup';
import { MessageCircle } from "lucide-react";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const Signup = () => {

    const [inputs, setInputs] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        gender: "",
    });

    const { loading, signup } = userSignup();

    const handleCheckBoxChange = (gender) => {
        setInputs({ ...inputs, gender });
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        await signup(inputs);
        // console.log(inputs);
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
                <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
                <p className="mt-1 text-sm text-muted-foreground">Start chatting in under a minute.</p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-3">
                    <Input
                        value={inputs.name} onChange={(e) => setInputs({ ...inputs, name: e.target.value })} required
                        placeholder="Display name"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                    <Input
                        type="email" required value={inputs.email} onChange={(e) => setInputs({ ...inputs, email: e.target.value })}
                        placeholder="you@example.com"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                    <Input
                        type="password" required minLength={6} value={inputs.password} onChange={(e) => setInputs({ ...inputs, password: e.target.value })}
                        placeholder="Password (min 6 chars)"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                    <Input
                        type="password" required minLength={6} value={inputs.confirmPassword} onChange={(e) => setInputs({ ...inputs, confirmPassword: e.target.value })}
                        placeholder="Confirm Password"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />

                    <div className="pt-2">
                        <GenderCheck onCheckboxChange={handleCheckBoxChange} selectedGender={inputs.gender} />
                    </div>

                    <Button
                        type="submit" disabled={loading}
                        className="w-full mt-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex justify-center items-center h-10"
                    >
                        {loading ? <span className='loading loading-spinner'></span> : "Create account"}
                    </Button>
                </form>

                <p className="mt-5 text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Link to="/login" className="text-primary hover:underline">Log in</Link>
                </p>
            </div>
        </div>
    )
}

export default Signup;