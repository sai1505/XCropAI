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

    const getAuthToken = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token;
    };


    const handleUpload = async (file) => {
        if (!crop.trim()) return;

        setLoadingAnalysis(true);
        setAnalysis(null);

        try {
            const token = await getAuthToken();
            const formData = new FormData();
            formData.append("name", crop);
            formData.append("image", file);

            const res = await fetch("http://localhost:8000/api/analyze", {
                method: "POST",
                headers: {
                    // The browser will set it and the boundary automatically.
                    "Authorization": `Bearer ${token}`,
                },
                body: formData,
            });

            if (!res.ok) throw new Error("Backend analysis failed");

            const data = await res.json();

            // 🔥 set analysis with URLs (NOT base64 anymore)
            setAnalysis({
                ...data,
                disease_name: Array.isArray(data.disease_name)
                    ? data.disease_name
                    : [data.disease_name]
            });

            setCurrentChatId(data.chat_id);

            // 🔥 UPDATE URL (THIS SHOWS CHAT ID)
            navigate(`/dashboard/chat/${data.chat_id}`, { replace: true });

        } catch (err) {
            console.error("Upload failed:", err);
            alert("Failed to analyze image. Please check backend connection.");
        }

        setLoadingAnalysis(false);
    };


    const handleSend = async () => {
        // 1. Validation & Guard Rails
        const activeChatId = currentChatId || chatId;

        if (!input.trim() || !analysis || !activeChatId) {
            console.warn("Missing required data for chat:", { input, analysis, currentChatId });
            return;
        }

        const userMsg = { role: "user", content: input };
        const token = await getAuthToken();

        // 2. Optimistic UI Update
        // We add the user message and a placeholder for the AI
        setMessages(prev => [...prev, userMsg, { role: "ai", content: "__thinking__" }]);
        setInput("");

        try {
            // 3. Backend Request
            const res = await fetch("http://localhost:8000/api/analyze/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({
                    chat_id: activeChatId,
                    question: userMsg.content,
                    name: crop,
                    stats: analysis.stats,
                }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.detail || "Chat failed");
            }

            const data = await res.json();

            // 4. Update UI with Real AI Response
            // Replace the "thinking" placeholder with the actual response string
            setMessages(prev => {
                const newMsgs = [...prev];
                // Find the last message (which should be '__thinking__') and update it
                if (newMsgs.length > 0 && newMsgs[newMsgs.length - 1].content === "__thinking__") {
                    newMsgs[newMsgs.length - 1] = { role: "ai", content: data.response };
                }
                return newMsgs;
            });

        } catch (err) {
            console.error("Chat Error:", err);
            // 5. Error Handling
            setMessages(prev => {
                const newMsgs = [...prev];
                if (newMsgs.length > 0 && newMsgs[newMsgs.length - 1].content === "__thinking__") {
                    newMsgs[newMsgs.length - 1] = {
                        role: "ai",
                        content: "⚠️ Sorry, I couldn't process that. Please try again."
                    };
                }
                return newMsgs;
            });
        }
    };

    const resumeChat = async (id) => {
        setLoadingResume(true);

        try {
            const token = await getAuthToken();

            // 1. Fetch data from your new FastAPI endpoint
            const res = await fetch(`http://localhost:8000/api/users/history/${id}`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.detail || "Failed to resume chat");
            }

            const data = await res.json();

            // 2. Update UI State with backend-prepared data
            setCrop(data.title);
            setCurrentChatId(data.id);
            setMessages(data.chat || []);

            // 3. Set Analysis (Images are already Signed URLs from backend)
            setAnalysis({
                disease_name: Array.isArray(data.disease_name)
                    ? data.disease_name
                    : [data.disease_name || "Unknown"],
                images: {
                    original: data.images.original,
                    enhanced: data.images.enhanced,
                    thermal: data.images.thermal,
                },
                stats: data.analysis?.stats,
                llm_analysis: data.analysis?.llm_analysis,
                prevention: data.analysis?.prevention,
            });

        } catch (err) {
            console.error("Resume failed:", err);
        } finally {
            setLoadingResume(false);
        }
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
                                currentChatId={chatId || currentChatId}
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
                <div className="bg-white font-poppins border border-lime-200 rounded-2xl px-5 py-4 shadow-sm">
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
