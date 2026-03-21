import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, Play } from "lucide-react";
import { supabase } from "../../supabase/SupabaseClient";

export default function UserHistory() {
    const [chats, setChats] = useState([]);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);


    useEffect(() => {
        loadHistory();
    }, []);

    const getAuthToken = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token;
    };

    const loadHistory = async () => {
        setLoading(true);

        try {
            const token = await getAuthToken();

            const res = await fetch("http://localhost:8000/api/users/history", {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            if (!res.ok) throw new Error("Could not fetch history");

            const data = await res.json();

            // The backend Repo already handles the .order("created_at", desc=True)
            setChats(data || []);

        } catch (err) {
            console.error("History Error:", err);
            setChats([]);
        } finally {
            setLoading(false);
        }
    };

    const SkeletonCard = () => (
        <div className="flex items-center justify-between bg-gray-100 rounded-3xl px-6 py-4 animate-pulse">
            <div className="space-y-2">
                <div className="h-4 w-40 bg-gray-300 rounded" />
                <div className="h-3 w-24 bg-gray-200 rounded" />
            </div>

            <div className="flex gap-3">
                <div className="h-10 w-10 bg-gray-300 rounded-full" />
                <div className="h-10 w-10 bg-gray-300 rounded-full" />
            </div>
        </div>
    );

    const handleResume = (id) => {
        navigate(`/dashboard/chat/${id}`);
    };

    const handleDelete = async (id) => {
        const confirmDelete = window.confirm("Delete this chat permanently?");
        if (!confirmDelete) return;

        try {
            const token = await getAuthToken();
            const res = await fetch(`http://localhost:8000/api/users/history/${id}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
            });

            if (res.ok) {
                // Remove from local state only after successful backend deletion
                setChats(prev => prev.filter(chat => chat.id !== id));
            } else {
                alert("Failed to delete chat.");
            }
        } catch (err) {
            console.error("Delete error:", err);
            alert("An error occurred while deleting.");
        }
    };

    return (
        <div className="max-w-5xl mx-auto pt-28 px-4 font-poppins space-y-4">
            <h1 className="text-2xl font-poppins-medium">Chat History</h1>

            {loading && (
                Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonCard key={i} />
                ))
            )}

            {!loading && chats.length === 0 && (
                <p className="text-gray-500">No chats yet</p>
            )}

            {!loading && chats.map(chat => (
                <div
                    key={chat.id}
                    className="flex items-center justify-between bg-lime-50 rounded-3xl px-6 py-4"
                >
                    <div>
                        <p className="font-poppins-medium">{chat.title}</p>
                        <p className="text-sm text-gray-600">
                            {new Date(chat.created_at).toLocaleString("en-IN", {
                                year: "numeric",
                                month: "short",
                                day: "2-digit",
                                hour: "numeric",
                                minute: "2-digit",
                                second: "2-digit",
                                hour12: true
                            })}
                        </p>

                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => handleResume(chat.id)}
                            className="bg-lime-200 p-3 rounded-full hover:bg-lime-300"
                        >
                            <Play size={16} />
                        </button>

                        <button
                            onClick={() => handleDelete(chat.id)}
                            className="bg-red-100 p-3 rounded-full hover:bg-red-200"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}