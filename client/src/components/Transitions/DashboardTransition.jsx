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

            let session = null;

            // Wait until session is available (OAuth case)
            for (let i = 0; i < 5; i++) {
                const { data } = await supabase.auth.getSession();
                session = data.session;

                if (session) break;

                await new Promise((res) => setTimeout(res, 300));
            }

            if (!session) {
                console.warn("No session found");
                navigate("/login");
                return;
            }

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

            if (!res.ok) return false;

            return true;

        } catch (err) {
            console.error(err);
            // optional: show toast
        }
    };

    useEffect(() => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        const init = async () => {
            const success = await ensureProfile();

            if (success) {
                navigate("/dashboard/new", { replace: true });
            } else {
                navigate("/login");
            }
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
