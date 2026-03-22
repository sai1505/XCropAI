import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import { supabase } from "../../supabase/SupabaseClient";

export default function SignInPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleSignin = async () => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        console.log("hello");

        if (error) {
            if (error.message.toLowerCase().includes("invalid")) {
                toast.error("Invalid email or password");
            } else if (error.message.toLowerCase().includes("confirm")) {
                toast.error("Please verify your email before signing in");
            } else {
                toast.error(error.message);
            }
            return;
        }

        // SIGNIN SUCCESS
        toast.success("Signed in successfully");
        navigate("/transition"); // gatekeeper
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


    const handleResendConfirmation = async () => {
        const { error } = await supabase.auth.resend({
            type: "signup",
            email,
        });

        if (error) {
            toast.error(error.message);
            return;
        }

        toast.success("Confirmation email resent. Please check your inbox.");
    };


    return (
        <div className="min-h-screen flex">
            <Toaster position="bottom-right"
                toastOptions={{
                    style: {
                        fontFamily: "Poppins, sans-serif",
                    },
                }} />
            {/* LEFT – FORM */}
            <div className="w-1/2 flex items-center justify-center">
                <div className="w-full max-w-md px-10">
                    <h2 className="text-3xl font-poppins-medium mb-2">
                        Welcome back
                    </h2>
                    <p className="text-gray-500 font-poppins mb-8">
                        Please sign in to your account
                    </p>

                    <div className="space-y-4">
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

                        <button className="w-full text-neutral-950 font-poppins bg-lime-200 py-3 rounded-3xl hover:bg-lime-400 transition"
                            onClick={handleSignin}>
                            Sign in
                        </button>

                        <button className="w-full border border-lime-400 py-3 font-poppins rounded-3xl flex items-center justify-center gap-2 hover:border-2"
                            onClick={handleGoogleSignIn}>
                            <img
                                src="https://www.svgrepo.com/show/475656/google-color.svg"
                                className="w-5"
                                alt="google"
                            />
                            Sign in with Google
                        </button>
                    </div>

                    <p className="text-sm font-poppins text-center mt-6">
                        Don’t have an account?{" "}
                        <span className="text-amber-950 cursor-pointer hover:underline" onClick={() => navigate('/signup')}>
                            Sign up
                        </span>
                    </p>

                    <p className="text-sm font-poppins text-center mt-4">
                        Didn’t receive the confirmation email ? {" "}
                        <span
                            className="text-amber-950 cursor-pointer hover:underline"
                            onClick={handleResendConfirmation}
                        >
                            Resend
                        </span>
                    </p>

                </div>
            </div>

            {/* RIGHT – IMAGE */}
            <div className="w-1/2 bg-white flex items-center justify-center">
                <img
                    src="../imgs/XCropAISignIn.jpg"
                    alt="Signin illustration"
                    className="max-w-[80%] h-auto"
                />
            </div>
        </div>
    );
}
