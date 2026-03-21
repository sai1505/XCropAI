import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Upload, Send, Image as ImageIcon, Thermometer, Sparkles, HelpCircle } from "lucide-react";
import { supabase } from "../../supabase/SupabaseClient";
import DropDownModern from "../../components/UI/DropDownModern"
import { motion } from "framer-motion";

/* MAIN */
export default function UserDashboard() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [crop, setCrop] = useState("");
    const [analysis, setAnalysis] = useState(null);
    const [currentChatId, setCurrentChatId] = useState(null); // local state
    const { chatId } = useParams();
    const [loadingAnalysis, setLoadingAnalysis] = useState(false);
    const [loadingResume, setLoadingResume] = useState(false);
    const isProcessing = loadingAnalysis || loadingResume || analysis !== null;
    const navigate = useNavigate();

    useEffect(() => {
        if (chatId) {
            resumeChat(chatId);   // ONLY resume
        } else {
            resetState();         // ALWAYS fresh
        }
    }, [chatId]);

    const resetState = () => {
        setMessages([]);
        setInput("");
        setCrop("");
        setAnalysis(null);
        setCurrentChatId(null);
    };

    const getSignedUrl = async (path) => {
        if (!path) return null;

        const { data, error } = await supabase.storage
            .from("chat_images")
            .createSignedUrl(path, 60 * 60); // 1 hour

        if (error) {
            console.error("Signed URL error:", error);
            return null;
        }

        return data.signedUrl;
    };

    const uploadImage = async (base64, path) => {
        const byteString = atob(base64);
        const arrayBuffer = new Uint8Array(byteString.length);

        for (let i = 0; i < byteString.length; i++) {
            arrayBuffer[i] = byteString.charCodeAt(i);
        }

        const { data, error } = await supabase.storage
            .from("chat_images") // bucket name
            .upload(path, arrayBuffer, {
                contentType: "image/png",
            });

        if (error) {
            console.error("Upload error:", error);
            return null;
        }

        return path;
    };

    const saveToSupabase = async ({ crop, analysis, messages }) => {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) return null;

        const { data, error } = await supabase
            .from("user_chats")
            .insert({
                title: crop,
                disease_name: Array.isArray(analysis.disease_name)
                    ? analysis.disease_name
                    : [analysis.disease_name || "Unknown"],

                // ✅ already paths (NOT URLs)
                main_image: analysis.images.original,

                derived_images: {
                    enhanced: analysis.images.enhanced,
                    thermal: analysis.images.thermal
                },

                analysis: {
                    stats: analysis.stats,
                    llm_analysis: analysis.llm_analysis,
                    prevention: analysis.prevention
                },

                chat: messages
            })
            .select("id")
            .single();

        if (error) {
            console.error(error);
            return null;
        }

        return data.id;
    };


    const handleUpload = async (file) => {
        if (!crop.trim()) return;

        setLoadingAnalysis(true);
        setAnalysis(null);

        try {
            const formData = new FormData();
            formData.append("name", crop);
            formData.append("image", file);

            const res = await fetch("http://localhost:8000/api/analyze", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();

            // 🔥 prepare paths
            const user = (await supabase.auth.getUser()).data.user;
            const basePath = `${user.id}/${Date.now()}`;

            const originalPath = `${basePath}_orig.png`;
            const enhancedPath = `${basePath}_enh.png`;
            const thermalPath = `${basePath}_therm.png`;

            // 🔥 upload images
            await uploadImage(data.images.original, originalPath);
            await uploadImage(data.images.enhanced, enhancedPath);
            await uploadImage(data.images.thermal, thermalPath);

            // 🔥 get signed URLs (for UI)
            const originalUrl = await getSignedUrl(originalPath);
            const enhancedUrl = await getSignedUrl(enhancedPath);
            const thermalUrl = await getSignedUrl(thermalPath);

            // 🔥 set analysis with URLs (NOT base64 anymore)
            setAnalysis({
                ...data,
                images: {
                    original: originalUrl,
                    enhanced: enhancedUrl,
                    thermal: thermalUrl,
                }
            });

            // 🔥 SAVE TO DB (store paths, NOT URLs)
            const newChatId = await saveToSupabase({
                crop,
                analysis: {
                    ...data,
                    images: {
                        original: originalPath,
                        enhanced: enhancedPath,
                        thermal: thermalPath,
                    }
                },
                messages: []
            });

            if (!newChatId) {
                console.error("Chat ID not returned");
                setLoadingAnalysis(false);
                return;
            }

            // 🔥 UPDATE LOCAL STATE
            setCurrentChatId(newChatId);

            // 🔥 UPDATE URL (THIS SHOWS CHAT ID)
            navigate(`/dashboard/chat/${newChatId}`, { replace: true });

        } catch (err) {
            console.error("Upload failed:", err);
        }

        setLoadingAnalysis(false);
    };


    const handleSend = async () => {
        if (!input.trim() || !analysis) return;

        const userMsg = { role: "user", content: input };

        setMessages(prev => [
            ...prev,
            userMsg,
            { role: "ai", content: "__thinking__" }
        ]);
        setInput("");

        try {
            const res = await fetch("http://localhost:8000/api/analyze/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: crop,
                    stats: analysis.stats,
                    previous_response:
                        messages
                            .filter(m => m.role === "ai")
                            .map(m => m.content)
                            .join("\n"),
                    question: userMsg.content,
                }),
            });

            const data = await res.json();

            const updatedMessages = [
                ...messages,
                userMsg,
                { role: "ai", content: data.response }
            ];

            setMessages(updatedMessages);

            // ✅ UPDATE CHAT IN SUPABASE
            if (!currentChatId) {
                console.warn("chatId missing, cannot update chat");
                return;
            }

            await supabase
                .from("user_chats")
                .update({
                    chat: updatedMessages,
                    updated_at: new Date()
                })
                .eq("id", currentChatId);

        } catch (err) {
            setMessages(prev => [
                ...prev,
                {
                    role: "ai",
                    content: "⚠️ Unable to get response. Please try again."
                }
            ]);
        }
    };

    const resumeChat = async (id) => {
        setLoadingResume(true);

        const { data, error } = await supabase
            .from("user_chats")
            .select("*")
            .eq("id", id)
            .single();

        if (error || !data) {
            console.error("Resume failed:", error);
            setLoadingResume(false);
            return;
        }

        setCrop(data.title);

        const original = await getSignedUrl(data.main_image);
        const enhanced = await getSignedUrl(data.derived_images?.enhanced);
        const thermal = await getSignedUrl(data.derived_images?.thermal);

        setAnalysis({
            disease_name: Array.isArray(data.disease_name)
                ? data.disease_name
                : [data.disease_name || "Unknown"],
            images: {
                original: original,
                enhanced: enhanced,
                thermal: thermal,
            },
            stats: data.analysis?.stats,
            llm_analysis: data.analysis?.llm_analysis,
            prevention: data.analysis?.prevention,
        });

        setMessages(data.chat || []);
        setCurrentChatId(data.id);

        setLoadingResume(false);
    };


    return (
        <div className="h-screen bg-white flex flex-col">

            {/* 🔴 IMAGE UPLOAD — ONLY FIRST TIME */}
            {!isProcessing && (
                <ImageUpload
                    crop={crop}
                    setCrop={setCrop}
                    handleAnalyze={handleUpload}
                />
            )}

            {/* 🟡 PROCESSING / RESUMING / ANALYSIS */}
            {isProcessing && (
                <div className="flex-1 overflow-y-auto">

                    {/* TITLE (REAL OR SKELETON) */}
                    <div className="mt-20 flex justify-center">
                        {analysis ? (
                            <h1 className="mt-5 inline-flex px-6 py-2 bg-lime-200 text-2xl font-poppins-medium rounded-3xl">
                                {crop} Analysis
                            </h1>
                        ) : (
                            <div className="h-10 w-56 bg-gray-200 rounded-full animate-pulse" />
                        )}
                    </div>

                    {/* 🔹 MAIN FLOW */}
                    {analysis ? (
                        <>
                            <AnalysisFlow
                                image={{
                                    original: analysis.images.original,
                                    enhanced: analysis.images.enhanced,
                                    thermal: analysis.images.thermal,
                                }}
                                stats={analysis.stats}
                                analysis={analysis}
                                currentChatId={currentChatId}
                            />

                            <ChatUI
                                messages={messages}
                                input={input}
                                setInput={setInput}
                                onSend={handleSend}
                                analysis={analysis}
                            />
                        </>
                    ) : (
                        <FullAnalysisSkeleton />
                    )}
                </div>
            )}
        </div>
    );


}

/* UPLOAD */
function ImageUpload({ crop, setCrop, handleAnalyze }) {
    const [file, setFile] = useState(null);

    const crops = [
        "Coconut",
        "Rice",
        "Tomato",
        "Brinjal",
        "Chilli",
        "Banana",
        "Mango",
        "Groundnut",
        "Maize",
        "Sugarcane",
        "Cotton",
        "Turmeric"
    ];

    return (
        <div className="flex-1 flex items-center justify-center px-4 font-poppins">
            <div className="w-full max-w-xl text-center space-y-6">

                <DropDownModern
                    label="Select Crop"
                    value={crop || "Choose crop"}
                    options={crops}
                    onChange={setCrop}
                />

                <label className="block border-2 border-neutral-200 rounded-3xl
                  px-10 py-10 cursor-pointer hover:border-lime-400">

                    {file ? (
                        <img
                            src={URL.createObjectURL(file)}
                            alt="preview"
                            className="mx-auto h-48 object-contain rounded-xl mb-3"
                        />
                    ) : (
                        <Upload className="mx-auto text-lime-500" size={36} />
                    )}

                    <p className="mt-2 text-sm">
                        {file ? file.name : "Choose plant image"}
                    </p>

                    <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => setFile(e.target.files[0])}
                    />
                </label>

                <button
                    disabled={!crop || !file}
                    onClick={() => handleAnalyze(file)}
                    className="w-full py-4 rounded-2xl bg-lime-400 hover:bg-lime-500
                               text-black font-poppins-medium disabled:opacity-50"
                >
                    Analyze Plant
                </button>
            </div>
        </div>
    );
}




/* ANALYSIS FLOW */
function AnalysisFlow({ image, stats, analysis, currentChatId }) {
    return (
        <div className="px-4 py-10 space-y-10 max-w-5xl mx-auto pb-32">
            <ImageFlow image={image} />
            <Insights
                disease_name={analysis.disease_name}
                stats={analysis.stats}
                llm={analysis.llm_analysis}
                prevention={analysis.prevention}
                chatId={currentChatId}
            />
        </div>
    );
}


/* IMAGE FLOW */
function ImageFlow({ image }) {
    return (
        <div className="grid md:grid-cols-3 gap-6">
            <ImageCard title="Original" image={image.original} />
            <ImageCard title="Enhanced" image={image.enhanced} icon={<Sparkles size={16} />} />
            <ImageCard title="Pseudo Thermal" image={image.thermal} icon={<Thermometer size={16} />} overlay />
        </div>
    );
}

function ImageCard({ title, image, icon, overlay }) {
    return (
        <div className="rounded-2xl overflow-hidden shadow">
            <div className="relative">
                <img src={image} alt={title} className="w-full h-48 object-cover" />
            </div>
            <div className="p-4 flex items-center gap-2 font-poppins text-sm">
                {icon} {title}
            </div>
        </div>
    );
}

/* INSIGHTS */
function Insights({ disease_name, stats, llm, prevention, chatId }) {
    const health = stats.plant_health;
    const imageAnalysis = stats.image_analysis;
    const navigate = useNavigate();

    return (
        <div className="space-y-6">
            {/* EXISTING STATS */}
            <div className="rounded-3xl bg-lime-50 p-6 space-y-5">
                <h2 className="font-poppins-medium text-lg">AI Findings</h2>

                {/* DISEASE DISPLAY — SIMPLE (NO HIGHLIGHT) */}
                <div className="bg-white border border-lime-200 rounded-2xl px-5 py-4 shadow-sm">
                    <p className="text-xs text-gray-500 mb-2">
                        {Array.isArray(disease_name) && disease_name.length > 1
                            ? "Detected Diseases"
                            : "Detected Disease"}
                    </p>

                    {Array.isArray(disease_name) ? (
                        disease_name.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {disease_name.map((d, i) => (
                                    <span
                                        key={i}
                                        className="px-3 py-1 rounded-full bg-lime-100 text-lime-800 text-sm"
                                    >
                                        {d}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-700">Unknown</p>
                        )
                    ) : (
                        <p className="text-gray-700">
                            {disease_name || "Unknown"}
                        </p>
                    )}
                </div>

                {/* Remaining Stats */}
                <Stat label="Stress %" value={`${health.stress_percentage}%`} />
                <Stat label="Care Urgency" value={health.care_urgency} />
                <Stat label="Recovery Potential" value={health.recovery_potential} />
                <Stat label="Infected Area" value={imageAnalysis.infected_area_percent} />
                <Stat label="Life Expectancy" value={health.life_expectancy_band} />
                <Stat label="Health Score" value={health.health_score} />
                <Stat label="Survivability Score" value={health.survivability_score} />
            </div>


            {/* LLM EXPLANATION — CHAT STYLE */}
            {llm && (
                <div className="flex justify-start">
                    <div className="text-gray-700 px-5 py-4 rounded-3xl space-y-3 text-[15px] font-poppins leading-relaxed">
                        <p className="font-poppins-medium text-xl">
                            AI Explanation
                        </p>

                        <p className="leading-relaxed">{llm.explanation}</p>

                        <div className="space-y-2">
                            <p className="text-gray-800">
                                <span className="font-poppins-medium">Future Trend:</span>{" "}
                                {llm.future_trend}
                            </p>

                            <p className="text-gray-800">
                                <span className="font-poppins-medium">Confidence:</span>{" "}
                                {llm.confidence_level}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {prevention && (
                <div className="flex justify-start -mt-9">
                    <div className="px-5 py-4 rounded-3xl font-poppins text-[15px] space-y-3 leading-relaxed">

                        <div className="space-y-2" >
                            <p className="font-poppins-medium">
                                Prevention & Care Guidance
                            </p>
                            {/* OVERALL ASSESSMENT */}
                            <p className="text-gray-700">
                                {prevention.overall_assessment}
                            </p>
                        </div>


                        {/* PREVENTION STEPS */}
                        {prevention.prevention_steps?.length > 0 && (
                            <div className="space-y-2">
                                <p className="font-poppins-medium text-gray-800">
                                    Recommended Actions
                                </p>
                                <ul className="list-disc list-inside space-y-1 text-gray-700">
                                    {prevention.prevention_steps.map((step, i) => (
                                        <li key={i}>{step}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* CAUTIONS */}
                        {prevention.necessary_cautions?.length > 0 && (
                            <div className="space-y-2">
                                <p className="font-poppins-medium text-gray-800">
                                    Important Cautions
                                </p>
                                <ul className="list-disc list-inside space-y-1 text-gray-700">
                                    {prevention.necessary_cautions.map((caution, i) => (
                                        <li key={i}>{caution}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                    </div>
                </div>
            )}

            {/* 🔥 ANALYTICS BUTTON */}
            <button
                onClick={() => navigate(`/dashboard/analytics/${chatId}`)}
                className="mt-4 px-6 py-2 bg-lime-300 rounded-full hover:bg-lime-400 transition"
            >
                View Detailed Analytics
            </button>
        </div>
    );
}


function Stat({ label, value }) {
    return (
        <div className="flex justify-between text-sm font-poppins">
            <span className="text-gray-500">{label}</span>
            <span>{value}</span>
        </div>
    );
}

/* CHAT */
function ChatUI({ messages, input, setInput, onSend, analysis }) {
    const bottomRef = useRef(null);

    // AUTO SCROLL WHEN MESSAGES CHANGE
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    return (
        <>
            {/* CHAT MESSAGES — PART OF MAIN SCROLL */}
            <div className="px-4 py-6 max-w-5xl mx-auto space-y-3 font-poppins -mt-25">
                {messages.map((m, i) => (
                    <div
                        key={i}
                        className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                        {m.role === "ai" ? (
                            m.content === "__thinking__" ? (
                                <AIThinking />
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                    className="px-4 py-3 rounded-3xl leading-relaxed text-[15px] max-w-[75%] text-gray-700"
                                >
                                    {m.content}
                                </motion.div>
                            )
                        ) : (
                            <div className="px-4 py-3 rounded-3xl leading-relaxed text-[15px] max-w-[75%] bg-lime-200 text-black">
                                {m.content}
                            </div>
                        )}
                    </div>
                ))}

                {/* SCROLL TARGET */}
                <div ref={bottomRef} />
            </div>

            {/* INPUT — STICKY */}
            <div className="sticky bottom-0 bg-white px-4 py-3 font-poppins">
                <div className="max-w-5xl mx-auto flex gap-3 items-center">

                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={!analysis}
                        onKeyDown={(e) => e.key === "Enter" && onSend()}
                        placeholder="Ask about this crop…"
                        className="flex-1 border border-neutral-400 rounded-3xl px-4 py-3 text-sm focus:outline-none"
                    />

                    <button
                        onClick={onSend}
                        className="bg-lime-300 px-6 py-4 rounded-3xl hover:bg-lime-400"
                    >
                        <Send size={16} />
                    </button>
                </div>
            </div>
        </>
    );
}

function FullAnalysisSkeleton() {
    return (
        <div className="px-4 py-10 space-y-10 max-w-5xl mx-auto pb-32 animate-pulse">

            {/* IMAGES */}
            <div className="grid md:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-48 bg-gray-200 rounded-2xl" />
                ))}
            </div>

            {/* AI FINDINGS */}
            <div className="rounded-3xl bg-gray-100 p-6 space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-4 bg-gray-200 rounded w-full" />
                ))}
            </div>

            {/* EXPLANATION */}
            <div className="space-y-3">
                <div className="h-6 bg-gray-200 rounded w-48" />
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-5/6" />
            </div>

            {/* PREVENTION */}
            <div className="space-y-3">
                <div className="h-5 bg-gray-200 rounded w-40" />
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-4 bg-gray-200 rounded w-full" />
                ))}
            </div>

            {/* CHAT */}
            <div className="space-y-3">
                <div className="h-10 bg-gray-200 rounded-3xl w-2/3" />
                <div className="h-10 bg-gray-200 rounded-3xl w-1/2" />
            </div>

            {/* INPUT */}
            <div className="h-12 bg-gray-200 rounded-3xl" />
        </div>
    );
}

function AIThinking() {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-4 py-3 rounded-3xl text-gray-600 flex items-center gap-2"
        >
            <motion.div
                animate={{ rotate: 360 }}
                transition={{
                    repeat: Infinity,
                    duration: 1.2,
                    ease: "linear",
                }}
            >
                <Sparkles size={20} className="text-lime-400" />
            </motion.div>
            <span className="text-sm">thinking</span>
        </motion.div>
    );
}
