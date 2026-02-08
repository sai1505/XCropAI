import { useState, useEffect } from "react";
import downArrow from "/imgs/XCropAIDownArrow.png"
import DropDownModern from "../UI/DropDownModern";
import maleAvatar from "/imgs/avatars/MaleAvatar.svg";
import femaleAvatar from "/imgs/avatars/FemaleAvatar.svg";
import { supabase } from "../../supabase/SupabaseClient";

export default function UserProfile() {
    const [isEditing, setIsEditing] = useState(false);
    const [profile, setProfile] = useState(null);
    const [selectedCover, setSelectedCover] = useState(null);
    const [gender, setGender] = useState(null);
    const [role, setRole] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [loading, setLoading] = useState(true);


    useEffect(() => {
        const loadProfile = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) return;

            const { data } = await supabase
                .from("profile")
                .select("*")
                .eq("id", user.id)
                .single();

            setProfile(data);
            setLoading(false);
        };

        loadProfile();
    }, []);

    useEffect(() => {
        if (profile?.cover_image) {
            setSelectedCover(profile.cover_image);
        }

        if (profile?.gender) {
            setGender(profile.gender);
        }

        if (profile?.role) {
            setRole(profile.role);
        }
    }, [profile]);

    const avatarByGender = {
        Male: maleAvatar,
        Female: femaleAvatar,
    };

    const coverOptions = [
        { img: 'https://wkjyxbuzntwkjpxxxoiu.supabase.co/storage/v1/object/public/profile_covers/XCropAICover1.png' },
        { img: 'https://wkjyxbuzntwkjpxxxoiu.supabase.co/storage/v1/object/public/profile_covers/XCropAICover2.png' },
        { img: 'https://wkjyxbuzntwkjpxxxoiu.supabase.co/storage/v1/object/public/profile_covers/XCropAICover3.png' },
        { img: 'https://wkjyxbuzntwkjpxxxoiu.supabase.co/storage/v1/object/public/profile_covers/XCropAICover4.png' },
        { img: 'https://wkjyxbuzntwkjpxxxoiu.supabase.co/storage/v1/object/public/profile_covers/XCropAICover5.png' },
    ];

    const updateProfile = async () => {
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const updates = {
            'gender': gender,
            'role': role,
            'cover_image': selectedCover,
        };

        const { error } = await supabase
            .from("profile")
            .update(updates)
            .eq("id", user.id);

        if (error) {
            console.error(error);
            return;
        }

        // update UI instantly
        setProfile(prev => ({ ...prev, ...updates }));
    };

    if (loading) {
        return <UserProfileSkeleton />;
    } else {
        return (
            <div className="min-h-screen bg-white">
                {/* Cover */}
                <div className="relative mt-20 h-80 rounded-b-3xl overflow-hidden">
                    <img
                        src={
                            isEditing && selectedCover
                                ? selectedCover
                                : profile?.cover_image
                                || coverOptions[0].img
                        }
                        alt="cover"
                        className="absolute inset-0 w-full h-full object-cover"
                    />


                    if (!profile) return null;

                    {isEditing && (
                        <div className="absolute right-3 top-3 z-50">
                            <div className="w-100 bg-white rounded-2xl shadow-xl p-4">
                                <p className="text-sm font-poppins font-medium text-gray-700 mb-3">
                                    Choose cover
                                </p>

                                <div className="flex flex-wrap gap-3">
                                    {coverOptions.map((c) => (
                                        <button
                                            key={c.img}
                                            onClick={() => setSelectedCover(c.img)}
                                            className={`relative h-16 w-16 rounded-xl overflow-hidden border transition
                                    ${selectedCover === c.img
                                                    ? "border-black"
                                                    : "border-neutral-200 hover:border-neutral-400"}`}
                                        >
                                            <img
                                                src={c.img}
                                                alt={"Covers"}
                                                className="absolute inset-0 w-full h-full object-cover"
                                            />

                                            {/* Selected overlay */}
                                            {selectedCover === c.img && (
                                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                                    <span className="text-white text-xs font-semibold">
                                                        Selected
                                                    </span>
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {/* Profile Card */}
                <div className="relative max-w-4xl mx-auto -mt-10 px-4 z-20">
                    <div className="bg-white font-poppins rounded-3xl shadow-lg p-6">
                        <div className="flex items-center gap-6">
                            <img
                                src={avatarByGender[gender] || avatarByGender.Male}
                                className="w-28 h-28 rounded-full border-4 border-white -mt-16"
                            />

                            <div className="flex-1">
                                <h2 className="text-2xl font-semibold text-gray-900">
                                    {profile?.display_name}
                                </h2>
                                <p className="text-gray-500 text-sm">{profile?.email}</p>
                            </div>

                            <button
                                onClick={() => setIsEditing(!isEditing)}
                                className="px-4 py-2 rounded-3xl text-sm bg-gray-900 text-white hover:bg-gray-800"
                            >
                                {isEditing ? "Cancel" : "Edit"}
                            </button>
                        </div>

                        {/* Details */}
                        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <DropDownModern
                                label="Role"
                                value={role}
                                disabled={!isEditing}
                                options={[
                                    "Farmer",
                                    "Farm Owner",
                                    "Agriculture Student",
                                    "Researcher",
                                    "Agronomist",
                                    "Extension Officer",
                                    "Agri Consultant",
                                    "Agri Startup",
                                    "Home Gardener",
                                    "Hobby Grower",
                                    "NGO / Government",
                                    "Other"
                                ]}
                                onChange={(v) => {
                                    if (!isEditing) return;
                                    setRole(v);
                                }}
                            />

                            <DropDownModern
                                label="Gender"
                                value={gender}
                                disabled={!isEditing}
                                options={["Male", "Female"]}
                                onChange={(v) => {
                                    if (!isEditing) return;
                                    setGender(v);
                                }}
                            />
                        </div>

                        {isEditing && (
                            <div className="mt-8 flex justify-end gap-4">
                                <button
                                    disabled={isSaving}
                                    onClick={async () => {
                                        setIsSaving(true);
                                        try {
                                            await updateProfile();
                                            setIsEditing(false);
                                        } finally {
                                            setIsSaving(false);
                                        }
                                    }}
                                    className={`px-5 py-2 rounded-3xl transition
        ${isSaving
                                            ? "bg-gray-300 cursor-not-allowed"
                                            : "bg-lime-200 hover:bg-lime-400"
                                        }`}
                                >
                                    {isSaving ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        )}


                        {/* Logout */}
                        <div className="mt-10 border-t border-neutral-400 pt-6">
                            <button className="text-red-600 hover:underline text-sm">
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </div >
        );
    }

    function UserProfileSkeleton() {
        return (
            <div className="min-h-screen bg-white animate-pulse">
                {/* Cover skeleton */}
                <div className="mt-20 h-80 bg-gray-200 rounded-b-3xl" />

                {/* Profile card */}
                <div className="relative max-w-4xl mx-auto -mt-10 px-4">
                    <div className="bg-white rounded-3xl shadow-lg p-6">
                        <div className="flex items-center gap-6">
                            <div className="w-28 h-28 bg-gray-300 rounded-full -mt-16" />

                            <div className="flex-1 space-y-3">
                                <div className="h-6 w-48 bg-gray-300 rounded" />
                                <div className="h-4 w-64 bg-gray-200 rounded" />
                            </div>

                            <div className="h-10 w-24 bg-gray-300 rounded-3xl" />
                        </div>

                        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="h-14 bg-gray-200 rounded-xl" />
                            <div className="h-14 bg-gray-200 rounded-xl" />
                        </div>

                        <div className="mt-10 border-t pt-6">
                            <div className="h-4 w-20 bg-gray-200 rounded" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }



}
