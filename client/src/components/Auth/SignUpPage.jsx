import React, { useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/SupabaseClient";

export default function SignUpPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [transitioning, setTransitioning] = useState(false);


    const checks = {
        length: password.length >= 6,
        upper: /[A-Z]/.test(password),
        lower: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[^A-Za-z0-9]/.test(password),
    };

    const isValidPassword = Object.values(checks).every(Boolean);

    function PasswordRule({ ok, text }) {
        return (
            <div className={`flex items-center gap-2 ${ok ? "text-lime-600" : "text-gray-400"}`}>
                <span
                    className={`w-3.5 h-3.5 flex items-center justify-center rounded-full border
          ${ok
                            ? "bg-lime-500 border-lime-500"
                            : "border-gray-400"
                        }`}
                />
                <span className="text-xs">{text}</span>
            </div>
        );
    }

    const handleSignUp = async () => {
        const redirectUrl = `${import.meta.env.VITE_FRONTEND_URL}/signin`;
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: redirectUrl,
                data: {
                    display_name: displayName,
                },
            },
        });

        if (error) {
            toast.error(error.message);
            return;
        }

        // USER ALREADY EXISTS
        if (data?.user && data.user.identities?.length === 0) {
            toast.error("This email is already registered. Please sign in.");
            return;
        }

        // ✅ NEW USER
        toast.success("Check your email for verification");
    };

    const handleGoogleSignIn = async () => {
        const redirectUrl = `${import.meta.env.VITE_FRONTEND_URL}/transition`;
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectUrl,
            },
        })

        if (error) {
            toast.error(error.message);
            return;
        }
    }


    return (
        <div className="min-h-screen flex">
            <Toaster position="bottom-right"
                toastOptions={{
                    style: {
                        fontFamily: "Poppins, sans-serif",
                    },
                }} />
            {/* LEFT – IMAGE */}
            <div className="w-1/2 bg-white flex items-center justify-center">
                <img
                    src="../imgs/XCropAISignUp.jpg"
                    alt="Signup illustration"
                    className="max-w-[70%] h-auto"
                />
            </div>

            {/* RIGHT – FORM */}
            <div className="w-1/2 flex items-center justify-center">
                <div className="w-full max-w-md px-10">
                    <h2 className="text-3xl font-poppins-medium mb-2">Create account</h2>
                    <p className="text-gray-500 font-poppins mb-8">Please enter your details</p>

                    <div className="space-y-4">
                        <input
                            type="text"
                            placeholder="Full name"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="w-full border font-poppins border-lime-400 rounded-3xl px-4 py-3 focus:bg-lime-200 focus:border-white focus:outline-none"
                        />

                        <input
                            type="email"
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full border font-poppins border-lime-400 rounded-3xl px-4 py-3 focus:bg-lime-200 focus:border-white focus:outline-none"
                        />

                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full border font-poppins border-lime-400 rounded-3xl px-4 py-3 focus:bg-lime-200 focus:border-white focus:outline-none"
                        />

                        <div className="text-xs font-poppins space-y-1">
                            <PasswordRule ok={checks.length} text="Password must be at least 6 characters" />
                            <PasswordRule ok={checks.upper} text="Password must contain 1 uppercase letter" />
                            <PasswordRule ok={checks.lower} text="Password must contain 1 lowercase letter" />
                            <PasswordRule ok={checks.number} text="Password must contain 1 number" />
                            <PasswordRule ok={checks.special} text="Password must contain 1 special character" />
                        </div>


                        <button className="w-full text-neutral-950 font-poppins bg-lime-200 py-3 rounded-3xl hover:bg-lime-400 transition"
                            disabled={!isValidPassword}
                            onClick={handleSignUp}>
                            Sign up
                        </button>

                        <button className="w-full border border-lime-400 py-3 font-poppins rounded-3xl flex items-center justify-center gap-2 hover:border-2"
                            onClick={handleGoogleSignIn}>
                            <img
                                src="https://www.svgrepo.com/show/475656/google-color.svg"
                                className="w-5"
                                alt="google"
                            />
                            Sign up with Google
                        </button>
                    </div>

                    <p className="text-sm font-poppins text-center mt-6">
                        Already have an account ? {" "}
                        <span className="text-amber-950 cursor-pointer hover:underline" onClick={() => navigate('/signin')}>Sign in</span>
                    </p>
                </div>
            </div>
        </div>
    );
}