import { useEffect, useState } from "react";
import { supabase } from "../../supabase/SupabaseClient";
import { Download } from "lucide-react";

export default function UserImage() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadImages();
    }, []);

    const getAuthToken = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token;
    };

    const loadImages = async () => {
        setLoading(true);

        try {
            const token = await getAuthToken();
            const res = await fetch("http://localhost:8000/api/users/gallery", {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            if (!res.ok) throw new Error("Failed to load gallery");

            const data = await res.json();

            // 'data' is now an array of objects containing 'urls' (signed links)
            setItems(data || []);

        } catch (err) {
            console.error("Gallery Load Error:", err);
        } finally {
            setLoading(false);
        }
    };

    const downloadImage = async (url, filename) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (err) {
            console.error("Download failed:", err);
        }
    };

    const SkeletonImageCard = () => (
        <div className="rounded-2xl overflow-hidden bg-white shadow animate-pulse">
            <div className="h-48 bg-gray-200" />
            <div className="flex items-center justify-between px-4 py-3">
                <div className="h-4 w-20 bg-gray-300 rounded" />
                <div className="h-8 w-8 bg-gray-300 rounded-full" />
            </div>
        </div>
    );

    const SkeletonChatBlock = () => (
        <div className="bg-gray-100 rounded-3xl p-6 space-y-4 animate-pulse">
            <div className="space-y-2">
                <div className="h-4 w-48 bg-gray-300 rounded" />
                <div className="h-3 w-32 bg-gray-200 rounded" />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
                <SkeletonImageCard />
                <SkeletonImageCard />
                <SkeletonImageCard />
            </div>
        </div>
    );


    return (

        <div className="max-w-6xl mx-auto pt-28 px-4 font-poppins space-y-6">
            <h1 className="text-2xl font-poppins-medium">Your Images</h1>

            {loading && (
                Array.from({ length: 3 }).map((_, i) => (
                    <SkeletonChatBlock key={i} />
                ))
            )}

            {!loading && items.length === 0 && (
                <p className="text-gray-500">No images yet</p>
            )}

            {!loading && items.map(chat => (
                <div
                    key={chat.id}
                    className="bg-lime-50 rounded-3xl p-6 space-y-4"
                >
                    <div>
                        <p className="font-poppins-medium">{chat.title}</p>
                        <p className="text-sm text-gray-600">
                            {new Date(chat.created_at).toLocaleString()}
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                        <ImageCard
                            label="Original"
                            image={chat.urls?.original}
                            onDownload={() => downloadImage(chat.urls.original, `${chat.title}_original.png`)}
                        />

                        <ImageCard
                            label="Enhanced"
                            image={chat.urls?.enhanced}
                            onDownload={() => downloadImage(chat.urls.enhanced, `${chat.title}_enhanced.png`)}
                        />

                        <ImageCard
                            label="Thermal"
                            image={chat.urls?.thermal}
                            onDownload={() => downloadImage(chat.urls.thermal, `${chat.title}_thermal.png`)}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

function ImageCard({ label, image, onDownload }) {
    if (!image) return null;

    return (
        <div className="rounded-2xl overflow-hidden bg-white shadow">
            <img
                src={image}
                alt={label}
                className="w-full h-48 object-cover cursor-pointer"
            />

            <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm font-poppins-medium">{label}</span>
                <button
                    onClick={onDownload}
                    className="bg-lime-200 p-2 rounded-full hover:bg-lime-300"
                >
                    <Download size={16} />
                </button>
            </div>
        </div>
    );
}