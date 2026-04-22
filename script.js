/**
 * script.js - Neha Study Tracker: The Ultimate Command Center
 * Merged & Polished by Sakib for Neha Sister ❤️
 */
import { GoogleGenAI } from "@google/genai";
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, query, orderBy, serverTimestamp, getDocFromServer } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json";

// --- Error Handling & Resilience ---
window.onerror = function(msg, url, lineNo, columnNo, error) {
    console.error("Global Error:", msg, error);
    const appContent = document.getElementById('app-content');
    if (appContent && appContent.innerHTML.includes('loading')) {
        appContent.innerHTML = `
            <div class="p-10 text-center space-y-4">
                <div class="text-rose-500 font-black text-2xl">BISMILLAH ERROR!</div>
                <p class="text-slate-400 text-xs">${msg}</p>
                <div class="text-[10px] text-slate-500 italic mt-4">Check Vercel Environment Variables or Browser Console</div>
                <button onclick="location.reload()" class="w-full bg-navy-900 border border-white/5 py-2 px-6 rounded-xl text-xs mt-4">Retry Reset</button>
            </div>
        `;
    }
    return false;
};

// --- Firebase Initialization ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

/**
 * script.js - Neha Study Tracker: The Ultimate Command Center
 * Merged & Polished by Sakib for Neha Sister ❤️
 */

// --- Global State & Configuration ---
const state = {
    activeView: 'home',
    logs: JSON.parse(localStorage.getItem('neha_logs')) || [],
    projects: JSON.parse(localStorage.getItem('neha_projects')) || [],
    library: JSON.parse(localStorage.getItem('neha_library')) || [
        { title: 'Python for Beginners (Full Course)', url: 'https://www.youtube.com/watch?v=rfscVS0vtbw' },
        { title: 'Design Fundamentals for Devs', url: 'https://scrimba.com/learn/design' },
        { title: 'CSE & Software Engineering Roadmap', url: 'https://roadmap.sh/computer-science' },
        { title: 'Guide: Which Code Language to Learn?', url: 'https://www.freecodecamp.org/news/which-programming-language-should-i-learn-first/' }
    ],
    deadlines: JSON.parse(localStorage.getItem('neha_deadlines')) || [
        { title: 'OS Midterm', date: 'Apr 25, 2026' }
    ],
    missions: JSON.parse(localStorage.getItem('neha_missions')) || [
        { id: 1, text: 'Master Python Dictionaries', done: false },
        { id: 2, text: 'Review OS Scheduling', done: true }
    ],
    chatHistory: JSON.parse(localStorage.getItem('neha_chat')) || [],
    theme: localStorage.getItem('neha_theme') || 'dark',
    timer: JSON.parse(localStorage.getItem('neha_timer')) || {
        seconds: 1500,
        isActive: false,
        mode: 'focus', // focus, short, long
        totalSessions: 0
    },
    user: null // Will be populated by Auth
};

// AI Engine Setup
const GEMINI_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_KEY || GEMINI_KEY === 'undefined' || GEMINI_KEY === '') {
    console.warn("⚠️ GEMINI_API_KEY is missing! AI features will be disabled.");
}
const ai = new GoogleGenAI({ apiKey: GEMINI_KEY || 'MISSING_KEY' });
const chatModel = "gemini-3-flash-preview";

// Sandbox Constants
let sandboxMode = 'python';
window.pyodideInstance = null;
const SANDBOX_TEMPLATES = {
    python: "# Python 3.11 Runtime\nprint('Hello, Sakib!')\n\nfor i in range(5):\n    print(f'Mission {i+1} complete!')",
    web: "<!-- Web Lab -->\n<div style='text-align: center; padding: 50px; font-family: sans-serif;'>\n  <h1 style='color: #14b8a6;'>Hi Neha Sister!</h1>\n</div>",
    js: "// JS Playground\nconsole.log('Hello Neha Sister!');",
    bash: "# Linux shell sandbox\n# Try: pwd, ls, whoami, date, uname -a, help\npwd\nls",
    c: "// C Programming\n#include <stdio.h>\nint main() { printf(\"Hello Neha!\\n\"); return 0; }",
    cpp: "// C++ Programming\n#include <iostream>\nint main() { std::cout << \"Object Oriented!\\n\"; return 0; }"
};

const MOTIVATIONAL_QUOTES = [
    "Assalamu Alaikum Sister! Today is a new chance to excel in Python. InshaAllah, you'll do great!",
    "Success is the sum of small efforts, repeated daily. Alhamdulillah for your progress!",
    "Bismillah! Let's conquer those CSE concepts. Sakib is rooting for you!",
    "Programming is about what you can figure out. You've got this, Neha!",
    "The world needs a CSE wizard like you! 🧙‍♀️✨"
];

// --- Core Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setupNavigation();
    initAuth();
    renderView(state.activeView);
    startTimerInterval();
    initializeLucide();
    testFirebaseConnection();
});

async function testFirebaseConnection() {
    try {
        await getDocFromServer(doc(db, 'test', 'connection'));
    } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
            console.error("Please check your Firebase configuration or network.");
        }
    }
}

async function handleLogin() {
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        // Ignore if user closed the popup - it's a silent cancellation
        if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
            console.log("Login cancelled by user.");
            return;
        }
        console.error("Login failed:", error);
        alert("Login failed, Sister. Please try again! ❤️");
    }
}

function initAuth() {
    const authSection = document.getElementById('auth-section');
    const loginBtn = document.getElementById('login-btn');

    if (loginBtn) {
        loginBtn.onclick = handleLogin;
    }

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            state.user = { 
                name: user.displayName, 
                uid: user.uid,
                email: user.email,
                photoURL: user.photoURL
            };
            authSection.innerHTML = `
                <div class="flex items-center gap-2">
                    <img src="${user.photoURL}" class="w-6 h-6 rounded-full border border-teal-500/30" alt="">
                    <button id="logout-btn" class="text-[9px] font-bold text-slate-500 uppercase tracking-widest hover:text-rose-400 transition-all">Sign Out</button>
                </div>
            `;
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) logoutBtn.onclick = () => signOut(auth);
            
            // Sync Data from Firestore
            await syncFromFirestore();
            renderView(state.activeView);
        } else {
            state.user = null;
            authSection.innerHTML = `
                <button id="login-btn" class="text-[9px] font-bold text-slate-500 uppercase tracking-widest hover:text-teal-400 transition-all">Connect Google</button>
            `;
            const newLoginBtn = document.getElementById('login-btn');
            if (newLoginBtn) newLoginBtn.onclick = handleLogin;
            renderView(state.activeView);
        }
    });
}

// --- Firestore Syncing ---

async function syncFromFirestore() {
    if (!state.user) return;
    const uid = state.user.uid;

    try {
        // 1. Profile
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (!userDoc.exists()) {
            await setDoc(doc(db, 'users', uid), {
                displayName: state.user.name,
                email: state.user.email,
                photoURL: state.user.photoURL,
                createdAt: serverTimestamp(),
                theme: state.theme
            });
        }

        // 2. Collections
        const logsSnap = await getDocs(query(collection(db, 'users', uid, 'logs'), orderBy('createdAt')));
        if (!logsSnap.empty) state.logs = logsSnap.docs.map(d => d.data());

        const projSnap = await getDocs(query(collection(db, 'users', uid, 'projects'), orderBy('createdAt')));
        if (!projSnap.empty) state.projects = projSnap.docs.map(d => d.data());

        const libSnap = await getDocs(query(collection(db, 'users', uid, 'library'), orderBy('createdAt')));
        if (!libSnap.empty) state.library = libSnap.docs.map(d => d.data());

        const missSnap = await getDocs(query(collection(db, 'users', uid, 'missions'), orderBy('createdAt')));
        if (!missSnap.empty) state.missions = missSnap.docs.map(d => d.data());

        saveLocalState();
    } catch (e) {
        handleFirestoreError(e, 'read', `users/${uid}`);
    }
}

async function syncToFirestore(path, data) {
    if (!state.user) return;
    try {
        await setDoc(doc(db, 'users', state.user.uid, ...path.split('/')), {
            ...data,
            createdAt: serverTimestamp()
        });
    } catch (e) {
        handleFirestoreError(e, 'create', `users/${state.user.uid}/${path}`);
    }
}

function handleFirestoreError(error, operationType, path) {
    const errorInfo = {
        error: error.message,
        operationType,
        path,
        authInfo: state.user ? {
            userId: state.user.uid,
            email: state.user.email,
            emailVerified: auth.currentUser?.emailVerified || false,
            isAnonymous: auth.currentUser?.isAnonymous || false,
            providerInfo: auth.currentUser?.providerData.map(p => ({
                providerId: p.providerId,
                displayName: p.displayName,
                email: p.email
            })) || []
        } : null
    };
    console.error("Firestore Error:", JSON.stringify(errorInfo));
    throw new Error(JSON.stringify(errorInfo));
}

function saveLocalState() {
    localStorage.setItem('neha_logs', JSON.stringify(state.logs));
    localStorage.setItem('neha_projects', JSON.stringify(state.projects));
    localStorage.setItem('neha_library', JSON.stringify(state.library));
    localStorage.setItem('neha_missions', JSON.stringify(state.missions));
    localStorage.setItem('neha_chat', JSON.stringify(state.chatHistory));
    localStorage.setItem('neha_theme', state.theme);
}

function initTheme() {
    if (state.theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    
    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
        toggle.addEventListener('click', () => {
            state.theme = state.theme === 'dark' ? 'light' : 'dark';
            localStorage.setItem('neha_theme', state.theme);
            initTheme();
        });
    }
}

function initializeLucide() { if (window.lucide) window.lucide.createIcons(); }

// --- Routing & Navigation ---
function setupNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const view = e.currentTarget.dataset.view;
            switchView(view);
        });
    });
}

function switchView(viewName) {
    state.activeView = viewName;
    document.querySelectorAll('.nav-btn').forEach(btn => {
        const isActive = btn.dataset.view === viewName;
        btn.classList.toggle('active', isActive);
        btn.classList.toggle('text-slate-500', !isActive);
        btn.classList.toggle('text-teal-400', isActive);
    });
    renderView(viewName);
}

function renderView(viewName) {
    const container = document.getElementById('app-content');
    if (!container) return;
    container.innerHTML = '';
    
    const wrapper = document.createElement('div');
    wrapper.className = 'view-transition space-y-6 pb-20';
    
    switch(viewName) {
        case 'home': wrapper.innerHTML = renderHome(); break;
        case 'log': wrapper.innerHTML = renderLog(); break;
        case 'sandbox': wrapper.innerHTML = renderSandbox(); break;
        case 'ai': wrapper.innerHTML = renderAI(); break;
        case 'focus': wrapper.innerHTML = renderFocus(); break;
        case 'hub': wrapper.innerHTML = renderHub(); break;
    }
    
    container.appendChild(wrapper);
    initializeLucide();
    if (viewName === 'sandbox') initSandboxState();
    if (viewName === 'ai') scrollChat();
}

// --- View Renderers ---

function renderHome() {
    const userName = state.user ? state.user.name.split(' ')[0] : 'Sister';
    const streak = state.logs.length + 3; // Simple streak logic
    const quote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
    const progress = Math.round((state.missions.filter(m => m.done).length / state.missions.length) * 100) || 0;

    return `
        <div class="space-y-6">
            <section class="p-8 rounded-[2.5rem] bg-gradient-to-br from-teal-500/20 to-navy-800 border border-white/5 relative overflow-hidden">
                <div class="relative z-10">
                    <h2 class="text-3xl font-extrabold text-white leading-tight">Hi ${userName}! ❤️</h2>
                    <p class="text-slate-400 text-sm mt-2 font-medium">Bismillah! Ready to master CSE today?</p>
                </div>
                <div class="absolute -right-6 -bottom-6 w-32 h-32 bg-teal-500/10 blur-3xl opacity-50"></div>
            </section>

            <div class="grid grid-cols-2 gap-4">
                <div class="p-6 rounded-3xl bg-navy-900 border border-white/5 text-center space-y-1 group">
                    <i data-lucide="flame" class="w-6 h-6 text-orange-500 mx-auto group-hover:scale-125 transition-all"></i>
                    <p class="text-2xl font-black text-white italic">${streak}</p>
                    <p class="text-[9px] font-bold text-slate-500 uppercase">Streak</p>
                </div>
                <button onclick="window.switchView('ai')" class="p-6 rounded-3xl bg-navy-900 border border-white/5 text-center space-y-1 group">
                    <i data-lucide="sparkles" class="w-6 h-6 text-teal-400 mx-auto group-hover:scale-125 transition-all"></i>
                    <p class="text-2xl font-black text-white italic">AI</p>
                    <p class="text-[9px] font-bold text-slate-500 uppercase">Study Buddy</p>
                </button>
            </div>

            <section class="p-5 rounded-3xl bg-white/5 border border-white/5 italic text-xs leading-relaxed text-slate-300">
                "${quote}"
            </section>

            <div class="space-y-3">
                <div class="flex justify-between items-center px-1 font-bold text-[10px] text-slate-500 uppercase tracking-widest">
                    <span>Sprints Tracker</span>
                    <span>${progress}%</span>
                </div>
                <div class="bg-navy-900 rounded-2xl p-2 border border-white/5">
                    ${state.missions.map(m => `
                        <div class="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer" onclick="window.toggleMission(${m.id})">
                             <div class="w-4 h-4 rounded border ${m.done ? 'bg-teal-500 border-teal-500' : 'border-slate-700'} flex items-center justify-center">
                                ${m.done ? '<i data-lucide="check" class="w-3 h-3 text-white"></i>' : ''}
                             </div>
                             <span class="text-xs ${m.done ? 'line-through text-slate-600' : 'text-slate-300'}">${m.text}</span>
                        </div>
                    `).join('')}
                    <button onclick="window.addMission()" class="w-full py-2 text-[9px] font-bold uppercase text-slate-500 hover:text-teal-400 border-t border-white/5 mt-1">+ New Sprint</button>
                </div>
            </div>

            <a href="https://wa.me/8801605038509?text=Assalamu%20Alaikum%20Sakib%20Bhai" target="_blank" class="flex items-center justify-between p-6 rounded-3xl bg-emerald-600/10 border border-emerald-500/20 group">
                <div class="flex gap-4 items-center">
                    <div class="p-3 bg-emerald-500 rounded-2xl text-white"><i data-lucide="message-square"></i></div>
                    <div class="text-left">
                        <p class="text-sm font-bold text-white">Ask Sakib Bhai</p>
                        <p class="text-[9px] text-emerald-400 font-bold uppercase">24/7 Support ❤️</p>
                    </div>
                </div>
                <i data-lucide="external-link" class="w-4 h-4 text-emerald-500/50"></i>
            </a>
        </div>
    `;
}

function renderLog() {
    return `
        <div class="space-y-6">
            <div class="flex justify-between items-center px-1">
                <h2 class="text-xl font-bold">Study Journal</h2>
                <button onclick="openLogModal()" class="text-[10px] font-bold text-teal-400 uppercase tracking-widest">+ New Journal</button>
            </div>
            <div class="space-y-4">
                ${state.logs.length === 0 ? '<p class="text-center py-10 opacity-30 italic">No entries today InshaAllah...</p>' : 
                  state.logs.map((l, id) => `
                    <div class="p-5 rounded-3xl bg-navy-900 border border-white/5 space-y-2 relative group">
                        <div class="flex justify-between items-start">
                            <h4 class="font-bold text-teal-400 text-sm">${l.subject}</h4>
                            <span class="text-[9px] text-slate-500 uppercase">${l.date}</span>
                        </div>
                        <p class="text-[11px] text-slate-400 italic">"${l.notes}"</p>
                        <div class="flex justify-between items-center pt-2">
                             <div class="flex gap-3 text-[9px] font-bold text-slate-500 uppercase">
                                <span>${l.hours} HR</span>
                                <span>${l.mood}</span>
                             </div>
                             <button onclick="window.deleteLog(${id})" class="opacity-0 group-hover:opacity-100 p-2 text-rose-500"><i data-lucide="trash-2" class="w-3 h-3"></i></button>
                        </div>
                    </div>
                `).reverse().join('')}
            </div>
        </div>
    `;
}

function renderSandbox() {
    const modes = ['python', 'js', 'web', 'bash', 'c', 'cpp'];
    return `
        <div class="space-y-4">
            <div class="flex justify-between items-center px-1">
                <div class="flex gap-2 overflow-x-auto pb-1 scrollbar-hide max-w-[75%]">
                    ${modes.map(m => `
                        <button onclick="window.switchSandboxMode('${m}')" class="sandbox-tab ${sandboxMode === m ? 'active' : 'text-slate-500'} text-[9px] font-bold uppercase tracking-widest pb-1">
                            ${m}
                        </button>
                    `).join('')}
                </div>
                <button onclick="window.runCode()" class="bg-teal-600 text-white px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase flex items-center gap-2 active:scale-95 transition-all">
                    <i data-lucide="play" class="w-3 h-3"></i> Run
                </button>
            </div>

            <div class="h-[350px] bg-navy-950 rounded-3xl border border-white/5 relative overflow-hidden">
                <div class="bg-navy-900 py-1.5 px-4 flex justify-between border-b border-white/5">
                    <span id="editor-label" class="text-[9px] font-black text-slate-500 tracking-widest uppercase">main.${sandboxMode === 'python' ? 'py' : sandboxMode === 'bash' ? 'sh' : sandboxMode}</span>
                    <span class="text-[9px] text-teal-500 font-mono">Sakib IDE v1.5</span>
                </div>
                <textarea id="code-editor" class="w-full h-full bg-transparent p-5 text-teal-400 font-mono text-xs outline-none resize-none" spellcheck="false"></textarea>
            </div>
            ${sandboxMode === 'bash' ? `
                <div class="bg-navy-900 border border-white/5 rounded-2xl p-3 text-[10px] text-slate-400">
                    <p class="uppercase tracking-widest text-[9px] text-teal-400 font-bold mb-2">Linux Quick Check</p>
                    <p>Run one command per line. This is a safe simulator for demo commands.</p>
                </div>
            ` : ''}

            <div class="space-y-2">
                <div class="flex justify-between px-2 text-[9px] font-bold text-slate-500 uppercase">
                    <span>Console Output</span>
                    <button onclick="window.clearConsole()" class="text-rose-500">Clear</button>
                </div>
                <div id="console-output" class="h-32 bg-navy-900 rounded-2xl p-4 overflow-y-auto font-mono text-[11px] text-slate-300">
                     <span class="opacity-20 italic">Initialize code to see neural trace...</span>
                </div>
            </div>

            <div id="web-preview-container" class="${sandboxMode === 'web' ? '' : 'hidden'} h-[200px] border border-white/5 rounded-3xl overflow-hidden bg-white">
                <iframe id="web-preview" class="w-full h-full"></iframe>
            </div>
        </div>
    `;
}

function renderAI() {
    return `
        <div class="flex flex-col h-[70vh]">
            <div id="chat-box" class="flex-grow overflow-y-auto space-y-4 pb-4">
                <div class="ai-bubble buddy-msg">
                    <p>Assalamu Alaikum Sister! 👋 I am your personal AI Buddy. Ask me to explain concepts, summarize chapters, or give you a quiz! ❤️</p>
                </div>
                ${state.chatHistory.map(m => `
                    <div class="ai-bubble ${m.role === 'user' ? 'user-msg' : 'buddy-msg'}">
                        <p>${m.text}</p>
                    </div>
                `).join('')}
            </div>
            <div class="mt-4 bg-navy-900 border border-white/10 rounded-[2rem] p-2 flex gap-2 shadow-2xl">
                <input id="ai-input" type="text" class="flex-grow bg-transparent px-4 py-2 text-sm text-white outline-none" placeholder="Explain OS Scheduling..." onkeypress="if(event.key === 'Enter') window.sendToAI()">
                <button onclick="window.sendToAI()" class="w-10 h-10 bg-teal-500 rounded-2xl flex items-center justify-center text-white active:scale-90 transition-all">
                    <i data-lucide="send" class="w-4 h-4"></i>
                </button>
            </div>
        </div>
    `;
}

function renderFocus() {
    const mins = Math.floor(state.timer.seconds / 60);
    const secs = state.timer.seconds % 60;
    const total = state.timer.mode === 'focus' ? 1500 : 300;
    const progress = (state.timer.seconds / total) * 565;

    return `
        <div class="text-center space-y-12 py-10">
            <div class="flex justify-center gap-2">
                ${['focus', 'short'].map(m => `
                    <button onclick="window.setTimerMode('${m}')" class="px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${state.timer.mode === m ? 'bg-teal-500 text-navy-950' : 'bg-navy-900 text-slate-500'}">${m}</button>
                `).join('')}
            </div>

            <div class="relative w-64 h-64 mx-auto group">
                <svg class="w-full h-full -rotate-90" viewBox="0 0 200 200">
                    <circle cx="100" cy="100" r="90" fill="none" class="stroke-navy-900" stroke-width="6" />
                    <circle cx="100" cy="100" r="90" fill="none" class="stroke-teal-500" stroke-width="6" stroke-linecap="round" style="stroke-dasharray: 565; stroke-dashoffset: ${565 - progress}; transition: all 1s linear;" />
                </svg>
                <div class="absolute inset-0 flex flex-col items-center justify-center">
                    <span class="text-6xl font-black italic tracking-tighter text-white">${mins}:${secs.toString().padStart(2, '0')}</span>
                    <span class="text-[9px] font-black uppercase text-teal-400 mt-2 tracking-widest">${state.timer.isActive ? 'Neural Focus Active' : 'Rhythm Ready'}</span>
                </div>
            </div>

            <div class="flex justify-center gap-8">
                <button onclick="window.toggleTimer()" class="w-20 h-20 rounded-full ${state.timer.isActive ? 'bg-rose-500' : 'bg-teal-500'} flex items-center justify-center text-white shadow-2xl active:scale-90 scale-110">
                    <i data-lucide="${state.timer.isActive ? 'pause' : 'play'}" class="w-8 h-8 fill-white"></i>
                </button>
                <button onclick="window.resetTimer()" class="w-20 h-20 rounded-full bg-navy-900 flex items-center justify-center text-slate-500 active:scale-90 border border-white/5">
                    <i data-lucide="rotate-ccw" class="w-6 h-6"></i>
                </button>
            </div>
        </div>
    `;
}

function renderHub() {
    const totalHours = state.logs.reduce((acc, l) => acc + parseFloat(l.hours), 0);
    const avgRating = state.logs.length ? (state.logs.reduce((acc, l) => acc + parseInt(l.rating), 0) / state.logs.length).toFixed(1) : 0;

    return `
        <div class="space-y-8">
            <!-- Growth Header -->
            <section class="grid grid-cols-2 gap-4">
                <div class="p-6 rounded-3xl bg-navy-900 border border-white/5 space-y-1 shadow-xl">
                    <p class="text-4xl font-black text-white italic tracking-tighter">${totalHours}</p>
                    <p class="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Total Focus Hours</p>
                </div>
                <div class="p-6 rounded-3xl bg-navy-900 border border-white/5 space-y-1 shadow-xl">
                    <p class="text-4xl font-black text-teal-400 italic tracking-tighter">${avgRating}</p>
                    <p class="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Avg Quality / 10</p>
                </div>
            </section>

            <section class="space-y-4">
                <div class="flex justify-between items-center px-1">
                    <h2 class="text-lg font-bold">Dev Projects</h2>
                    <button onclick="window.openProjectModal()" class="text-[10px] font-bold text-teal-400 uppercase">+ New Lab</button>
                </div>
                <div class="grid grid-cols-1 gap-4">
                    ${state.projects.length === 0 ? '<p class="opacity-20 italic text-xs px-2">No projects yet Sister...</p>' : 
                        state.projects.map(p => `
                        <div class="p-6 rounded-[2rem] bg-navy-900 border border-white/5 space-y-3">
                            <h4 class="font-black text-white">${p.title}</h4>
                            <p class="text-xs text-slate-400 leading-relaxed">${p.description}</p>
                            <div class="flex gap-2">
                                ${p.tags.split(',').map(t => `<span class="px-2 py-0.5 bg-white/5 border border-white/5 rounded-md text-[8px] uppercase text-slate-500 font-bold">${t.trim()}</span>`).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </section>

            <section class="space-y-4">
                <div class="flex justify-between items-center px-1">
                    <h2 class="text-lg font-bold">Resource Library</h2>
                    <button onclick="window.openResourceModal()" class="text-[10px] font-bold text-indigo-400 uppercase">+ Add</button>
                </div>
                <div class="space-y-3">
                    ${state.library.length === 0 ? '<p class="opacity-20 italic text-xs px-2">Library is empty...</p>' : 
                        state.library.map(l => `
                        <a href="${l.url}" target="_blank" class="p-4 rounded-3xl bg-white/5 border border-white/5 flex justify-between items-center group">
                            <span class="text-xs font-bold text-slate-300 group-hover:text-teal-400 transition-all">${l.title}</span>
                            <i data-lucide="external-link" class="w-4 h-4 text-slate-500"></i>
                        </a>
                    `).join('')}
                </div>
            </section>
        </div>
    `;
}

// --- Interaction Logic ---

// Sandbox Switch
window.switchSandboxMode = (mode) => {
    const editor = document.getElementById('code-editor');
    if (editor) localStorage.setItem(`neha_sandbox_${sandboxMode}`, editor.value);
    sandboxMode = mode;
    renderView('sandbox');
};

async function initSandboxState() {
    const editor = document.getElementById('code-editor');
    if (!editor) return;
    editor.value = localStorage.getItem(`neha_sandbox_${sandboxMode}`) || SANDBOX_TEMPLATES[sandboxMode];
    
    if (sandboxMode === 'python' && !window.pyodideInstance) {
        logToConsole("Initializing Neurons (Python)...");
        try {
            window.pyodideInstance = await window.loadPyodide();
            logToConsole("Python Ready! 🐍");
        } catch (e) { logToConsole("Brain Blocked: Network issue?"); }
    }
}

window.runCode = async () => {
    const code = document.getElementById('code-editor').value;
    localStorage.setItem(`neha_sandbox_${sandboxMode}`, code);
    
    if (sandboxMode === 'web') {
        const preview = document.getElementById('web-preview');
        preview.srcdoc = code;
        logToConsole("Live Matrix Updated! 🌐");
        return;
    }

    if (sandboxMode === 'js') {
        window.clearConsole();
        logToConsole("Matrix Sync...");
        try {
            const oldLog = console.log;
            console.log = (...args) => logToConsole(args.join(' '));
            eval(code);
            setTimeout(() => { console.log = oldLog; }, 100);
        } catch (e) { logToConsole("JS ERR: " + e.message, true); }
        return;
    }

    if (sandboxMode === 'bash') {
        window.clearConsole();
        logToConsole("Linux shell simulator booted.");
        runBashSimulation(code);
        return;
    }

    if (['c', 'cpp'].includes(sandboxMode)) {
        window.clearConsole();
        logToConsole(`Compiling ${sandboxMode.toUpperCase()} via Neural Bridge...`);
        try {
            const result = await ai.models.generateContent({
                model: chatModel,
                contents: `Simulate this ${sandboxMode} code execution output. Format: console output or errors only.\n\n${code}`,
                config: { systemInstruction: "Output ONLY the raw console output or compiler error. No conversation." }
            });
            logToConsole(result.text);
        } catch (e) { logToConsole("Simulation Failed.", true); }
        return;
    }

    if (!window.pyodideInstance) return alert("Python engine loading... 🐍");
    window.clearConsole(); logToConsole("Script Execution...");
    try {
        window.pyodideInstance.runPython(`import sys, io; sys.stdout = io.StringIO()`);
        await window.pyodideInstance.runPythonAsync(code);
        const out = window.pyodideInstance.runPython("sys.stdout.getvalue()");
        logToConsole(out || "Success! (No output)");
    } catch (e) { logToConsole("PY ERR: " + e.message, true); }
};

function runBashSimulation(script) {
    const commands = script
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));

    if (commands.length === 0) {
        logToConsole("No commands provided.", true);
        return;
    }

    const fakeFiles = ['notes.txt', 'projects/', 'journal.md', 'scripts/'];
    const commandMap = {
        pwd: () => '/home/neha/study-tracker',
        ls: () => fakeFiles.join('  '),
        whoami: () => 'neha',
        date: () => new Date().toUTCString(),
        'uname -a': () => 'Linux study-vm 6.8.0 x86_64 GNU/Linux',
        help: () => 'Available: pwd, ls, whoami, date, uname -a, echo, cat notes.txt, clear',
        'cat notes.txt': () => 'Focus: OS Scheduling\nReview: Python dicts\nPlan: 2h DSA practice'
    };

    commands.forEach((cmd) => {
        if (cmd === 'clear') {
            window.clearConsole();
            return;
        }

        if (cmd.startsWith('echo ')) {
            logToConsole(`$ ${cmd}`);
            logToConsole(cmd.slice(5).trim() || '');
            return;
        }

        const output = commandMap[cmd];
        logToConsole(`$ ${cmd}`);
        if (output) {
            logToConsole(output());
        } else {
            logToConsole(`bash: ${cmd}: command not found`, true);
        }
    });
}

window.clearConsole = () => { document.getElementById('console-output').innerHTML = '<span class="opacity-20 italic">Console Purged.</span>'; };
function logToConsole(msg, err = false) {
    const out = document.getElementById('console-output');
    if (!out) return;
    const div = document.createElement('div');
    div.className = err ? 'text-red-400 mt-1' : 'text-emerald-400 mt-1';
    div.textContent = `> ${msg}`;
    out.appendChild(div); out.scrollTop = out.scrollHeight;
}

// AI Buddy
window.sendToAI = async () => {
    const input = document.getElementById('ai-input');
    const txt = input.value;
    if (!txt) return;
    state.chatHistory.push({ role: 'user', text: txt });
    input.value = ''; 
    saveLocalState();
    renderView('ai');

    try {
        const result = await ai.models.generateContent({
            model: chatModel,
            contents: txt,
            config: {
                systemInstruction: `You are Sakib's AI Study Agent for Neha Sister (CSE student). When provided a topic: \n1. Summarize clearly. \n2. Notes in Bangla + English. \n3. 10 Q&A. \n4. Multiple-choice quiz. \n5. Next revision goal.\nKeep it warm and brotherly. Address her as ${state.user ? state.user.name : 'Neha Sister'}. Use emojis. ❤️`
            }
        });
        state.chatHistory.push({ role: 'model', text: result.text });
        saveLocalState();
        renderView('ai');
    } catch (e) { alert("AI matrix hiccup, Sister!"); }
};

function scrollChat() { const box = document.getElementById('chat-box'); if(box) box.scrollTop = box.scrollHeight; }

// Timer Logic
function startTimerInterval() {
    setInterval(() => {
        if (state.timer.isActive && state.timer.seconds > 0) {
            state.timer.seconds--;
            localStorage.setItem('neha_timer', JSON.stringify(state.timer));
            if (state.activeView === 'focus') renderView('focus');
            if (state.timer.seconds === 0) {
                state.timer.isActive = false;
                alert("Session Complete, Neha Sister! 🍵");
                renderView(state.activeView);
            }
        }
    }, 1000);
}
window.toggleTimer = () => { state.timer.isActive = !state.timer.isActive; renderView('focus'); };
window.resetTimer = () => { state.timer.isActive = false; state.timer.seconds = 1500; renderView('focus'); };
window.setTimerMode = (m) => { state.timer.isActive = false; state.timer.mode = m; state.timer.seconds = m === 'focus' ? 1500 : 300; renderView('focus'); };

// Missions
window.toggleMission = async (id) => {
    const m = state.missions.find(mi => mi.id === id);
    if(m) {
        m.done = !m.done;
        saveLocalState();
        if (state.user) {
            await syncToFirestore(`missions/${id}`, m);
        }
    }
    renderView('home');
};
window.addMission = async () => {
    const t = prompt("Sister, what is the next goal?");
    if(t) {
        const id = Date.now().toString();
        const mission = { id, text: t, done: false };
        state.missions.push(mission);
        saveLocalState();
        if (state.user) {
            await syncToFirestore(`missions/${id}`, mission);
        }
        renderView('home');
    }
};

// Logs
window.saveLog = async () => {
    const subject = document.getElementById('log-subject').value;
    const hours = document.getElementById('log-hours').value;
    const mood = document.getElementById('log-mood').value;
    const rating = document.getElementById('log-rating').value;
    const notes = document.getElementById('log-notes').value;
    if (!subject || !hours) return alert("Subject & Hours required, Sister!");
    
    const id = Date.now().toString();
    const logEntry = { subject, hours, mood, rating, notes, date: new Date().toLocaleDateString() };
    state.logs.push(logEntry);
    saveLocalState();
    
    if (state.user) {
        await syncToFirestore(`logs/${id}`, logEntry);
    }
    
    closeModal(); renderView('log');
};
window.deleteLog = (id) => { 
    state.logs.splice(id, 1); 
    saveLocalState();
    renderView('log'); 
};

// Projects & Library
window.saveProject = async () => {
    const title = document.getElementById('proj-title').value;
    const tags = document.getElementById('proj-tags').value;
    const description = document.getElementById('proj-desc').value;
    if (!title || !description) return alert("Title & Desc required!");
    
    const id = Date.now().toString();
    const project = { title, tags, description };
    state.projects.push(project);
    saveLocalState();

    if (state.user) {
        await syncToFirestore(`projects/${id}`, project);
    }
    
    closeModal(); renderView('hub');
};
window.saveResource = async () => {
    const title = document.getElementById('res-title').value;
    const url = document.getElementById('res-url').value;
    if (!title || !url) return alert("Title & URL required!");
    
    const id = Date.now().toString();
    const resource = { title, url };
    state.library.push(resource);
    saveLocalState();

    if (state.user) {
        await syncToFirestore(`library/${id}`, resource);
    }
    
    closeModal(); renderView('hub');
};

window.openLogModal = () => {
    const content = document.getElementById('modal-content');
    content.innerHTML = `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <h3 class="text-xl font-extrabold text-white">Daily Journal</h3>
                <button onclick="closeModal()" class="text-slate-500 hover:text-white transition-all"><i data-lucide="x"></i></button>
            </div>
            <div class="space-y-4">
                <input id="log-subject" type="text" placeholder="Subject / Concept" class="input-base">
                <div class="grid grid-cols-2 gap-4">
                   <input id="log-hours" type="number" step="0.5" placeholder="Hours" class="input-base">
                   <select id="log-mood" class="input-base">
                      <option value="Happy">Happy 😊</option>
                      <option value="Focused">Focused 🧐</option>
                      <option value="Tired">Tired 🥱</option>
                      <option value="Struggling">Struggling 🤯</option>
                   </select>
                </div>
                <input id="log-rating" type="range" min="1" max="10" value="8" class="w-full accent-teal-500 h-2 rounded-full overflow-hidden">
                <div class="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">
                   <span>Effort Quality</span>
                   <span id="rating-val">8/10</span>
                </div>
                <textarea id="log-notes" placeholder="Notes (Challenges or Gains)" class="input-base h-28 resize-none"></textarea>
                <div class="grid grid-cols-2 gap-4 mt-6">
                    <button onclick="closeModal()" class="w-full bg-white/5 text-slate-400 font-bold py-4 rounded-2xl hover:bg-white/10 transition-all">Cancel</button>
                    <button onclick="saveLog()" class="w-full bg-teal-500 text-navy-950 font-bold py-4 rounded-2xl hover:bg-teal-400 transition-all">Save</button>
                </div>
            </div>
        </div>
    `;
    showModal();
    const slider = document.getElementById('log-rating');
    const val = document.getElementById('rating-val');
    slider.addEventListener('input', (e) => val.innerText = e.target.value + '/10');
};

window.openProjectModal = () => {
    const content = document.getElementById('modal-content');
    content.innerHTML = `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <h3 class="text-xl font-extrabold text-white">New Laboratory</h3>
                <button onclick="closeModal()" class="text-slate-500 hover:text-white transition-all"><i data-lucide="x"></i></button>
            </div>
            <div class="space-y-4">
                <input id="proj-title" type="text" placeholder="Project Title" class="input-base">
                <input id="proj-tags" type="text" placeholder="Tags (Python, UI, etc)" class="input-base">
                <textarea id="proj-desc" placeholder="Brief Description" class="input-base h-24 resize-none"></textarea>
                <div class="grid grid-cols-2 gap-4 mt-6">
                    <button onclick="closeModal()" class="w-full bg-white/5 text-slate-400 font-bold py-4 rounded-2xl hover:bg-white/10 transition-all">Cancel</button>
                    <button onclick="saveProject()" class="w-full bg-teal-500 text-navy-950 font-bold py-4 rounded-2xl hover:bg-teal-400 transition-all">Publish</button>
                </div>
            </div>
        </div>
    `;
    showModal();
};

window.openResourceModal = () => {
    const content = document.getElementById('modal-content');
    content.innerHTML = `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <h3 class="text-xl font-extrabold text-white">Add Resource</h3>
                <button onclick="closeModal()" class="text-slate-500 hover:text-white transition-all"><i data-lucide="x"></i></button>
            </div>
            <div class="space-y-4">
                <input id="res-title" type="text" placeholder="Title" class="input-base">
                <input id="res-url" type="text" placeholder="URL" class="input-base">
                <div class="grid grid-cols-2 gap-4 mt-6">
                    <button onclick="closeModal()" class="w-full bg-white/5 text-slate-400 font-bold py-4 rounded-2xl hover:bg-white/10 transition-all">Cancel</button>
                    <button onclick="saveResource()" class="w-full bg-teal-500 text-navy-950 font-bold py-4 rounded-2xl hover:bg-teal-400 transition-all">Add</button>
                </div>
            </div>
        </div>
    `;
    showModal();
};

// State Helpers
window.switchView = switchView;
function showModal() { 
    const m = document.getElementById('modal-container');
    m.classList.remove('hidden'); 
    setTimeout(() => {
        m.classList.add('active');
        initializeLucide();
    }, 10);
    
    // Close on backdrop click
    m.onclick = (e) => {
        if (e.target === m) closeModal();
    };
}
function closeModal() { 
    const m = document.getElementById('modal-container');
    m.classList.remove('active'); setTimeout(() => m.classList.add('hidden'), 300);
}
window.closeModal = closeModal;

window.windowFocus = () => {}; 
