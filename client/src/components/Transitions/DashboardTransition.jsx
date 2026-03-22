import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Lottie from "lottie-react";
import leafLoader from "../../assets/LeafAnim.json";
import { supabase } from "../../supabase/SupabaseClient";

export default function DashboardTransition() {
    const navigate = useNavigate();
    const hasInitialized = useRef(false);

    const ensureProfile = async () => {
        try {
            const {
                data: { session },
            } = await supabase.auth.getSession();


            if (!session) return;

            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/users/verify-profile`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                },
            });

            if (res.status === 401) {
                // If the key is not found, the session is likely stale from the migration
                console.warn("Session stale. Forcing re-login for security...");
                await supabase.auth.signOut();
                navigate("/login");
                return;
            }

            if (!res.ok) {
                throw new Error("Profile verification failed");
            }

        } catch (err) {
            console.error(err);
            // optional: show toast
        }
    };

    useEffect(() => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;


        const init = async () => {

            //Profile Check
            await ensureProfile();

            setTimeout(() => {
                navigate("/dashboard/new", { replace: true });
            }, 3000);
        };

        init();
    }, []);

    return (
        <div className="
            fixed inset-0 z-[9999]
            flex items-center justify-center
            bg-gradient-to-br
            from-green-50
            via-white
            to-lime-50
            ">

            <div className="flex items-center gap-4">

                <Lottie
                    animationData={leafLoader}
                    loop
                    className="w-24 h-24"
                />

                <span className="text-xs text-gray-500 tracking-wider uppercase">
                    Loading..
                </span>

            </div>
        </div>
    );
}
