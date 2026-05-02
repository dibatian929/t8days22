import React, { useState, useEffect, useRef, Component } from "react";
import {
  Camera,
  Mail,
  X,
  Menu, 
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  User,
  Settings,
  Plus,
  Trash, 
  Save,
  LogOut,
  Image as ImageIcon,
  Check,
  AlertCircle,
  Lock,
  Loader2,
  UploadCloud,
  Play,
  Pause,
  Edit, 
  Globe, 
  Music, 
  ArrowLeft,
  Eye,
  EyeOff,
  Folder, 
  Calendar,
  Layout,
  Type,
  Link as LinkIcon,
  ExternalLink,
  ArrowUp,
  ArrowDown,
  Maximize,
  Aperture, 
  Home,
  ToggleLeft,
  ToggleRight,
  BookOpen,
  FileText,
  GripVertical
} from "lucide-react";
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithCustomToken, 
  signInAnonymously, 
  onAuthStateChanged, 
  signOut
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// --- 0. 系统初始化 ---

const MANUAL_CONFIG = {
  apiKey: "AIzaSyCE-gHGrVGjGLDdBgOj_KSlH5rZqBtQrXM",
  authDomain: "my-t8day.firebaseapp.com",
  projectId: "my-t8day",
  storageBucket: "my-t8day.firebasestorage.app",
  messagingSenderId: "12397695094",
  appId: "1:12397695094:web:785bb4030b40f685754f57",
  measurementId: "G-FLLBH5DTNV",
};

let app, auth, db, storage;

try {
  let firebaseConfig = MANUAL_CONFIG;
  if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    try {
        firebaseConfig = JSON.parse(__firebase_config);
    } catch (e) {
        console.warn("Config parse error, using manual.");
    }
  }
  
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  console.log("Firebase initialized successfully");
} catch (e) {
  console.error("Firebase Init Critical Error:", e);
}

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// 辅助函数
const getPublicCollection = (colName) => {
  if (!db) return null;
  return collection(db, 'artifacts', appId, 'public', 'data', colName);
};
const getPublicDoc = (colName, docId) => {
  if (!db) return null;
  return doc(db, 'artifacts', appId, 'public', 'data', colName, docId);
};

const uploadFileToStorage = async (file, path) => {
  if (!storage) throw new Error("Storage not ready");
  const storageRef = ref(storage, path);
  const snapshot = await uploadBytes(storageRef, file);
  return await getDownloadURL(snapshot.ref);
};

const slugify = (text) => {
  if (!text) return '';
  return text.toString().toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-').replace(/^-+/, '').replace(/-+$/, '');
};

const compressImage = async (file, maxWidth = 1920, quality = 0.8) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxWidth) {
            if (width > height) {
               height = Math.round(height * (maxWidth / width));
               width = maxWidth;
            } else {
               width = Math.round(width * (maxWidth / height));
               height = maxWidth;
            }
          } else {
             resolve(file);
             return;
          }

          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
            } else {
              resolve(file);
            }
          }, 'image/jpeg', quality);
        } catch (e) {
          resolve(file);
        }
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

// --- 1. 样式注入 ---
const injectStyles = () => {
  if (typeof document === 'undefined') return;
  if (document.getElementById('t8days-styles')) return;

  const styleSheet = document.createElement("style");
  styleSheet.id = 't8days-styles';
  styleSheet.innerText = `
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Inter:wght@300;400;600&display=swap');
    :root { --font-heading: 'Cinzel', serif; --font-body: 'Inter', sans-serif; }
    body { font-family: var(--font-body); background-color: #0a0a0a; margin: 0; padding: 0; overflow-x: hidden; }
    h1, h2, h3, .font-serif { font-family: var(--font-heading); }
    .noise-bg { position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; opacity: 0.04; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E"); }
    .animate-fade-in-up { animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

    /* === 新首页动画 === */
    .hero-brand-line {
      display: inline-block;
      overflow: hidden;
    }
    .hero-brand-text {
      display: inline-block;
      animation: heroTextReveal 1.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      opacity: 0;
      transform: translateY(100%);
    }
    @keyframes heroTextReveal {
      0%   { opacity: 0; transform: translateY(100%); }
      100% { opacity: 1; transform: translateY(0%); }
    }
    .hero-line-grow {
      animation: heroLineGrow 1.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      transform-origin: left;
      transform: scaleX(0);
    }
    @keyframes heroLineGrow {
      from { transform: scaleX(0); opacity: 0; }
      to   { transform: scaleX(1); opacity: 1; }
    }
    .hero-tag-in {
      animation: heroTagIn 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      opacity: 0;
    }
    @keyframes heroTagIn {
      from { opacity: 0; transform: translateX(-12px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    .hero-counter-in {
      animation: heroCounterIn 1s ease forwards;
      opacity: 0;
    }
    @keyframes heroCounterIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    .hero-scan-line {
      position: absolute;
      left: 0; right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
      animation: heroScanLine 3s ease-in-out infinite;
      pointer-events: none;
    }
    @keyframes heroScanLine {
      0%   { top: 0%;   opacity: 0; }
      10%  { opacity: 1; }
      90%  { opacity: 0.6; }
      100% { top: 100%; opacity: 0; }
    }
    .hero-corner {
      position: absolute;
      width: 20px; height: 20px;
      pointer-events: none;
    }
    .hero-corner-tl { top: 0; left: 0; border-top: 1px solid rgba(255,255,255,0.25); border-left: 1px solid rgba(255,255,255,0.25); }
    .hero-corner-br { bottom: 0; right: 0; border-bottom: 1px solid rgba(255,255,255,0.25); border-right: 1px solid rgba(255,255,255,0.25); }
    .hero-corner-tr { top: 0; right: 0; border-top: 1px solid rgba(255,255,255,0.25); border-right: 1px solid rgba(255,255,255,0.25); }
    .hero-corner-bl { bottom: 0; left: 0; border-bottom: 1px solid rgba(255,255,255,0.25); border-left: 1px solid rgba(255,255,255,0.25); }
    .hero-img-reveal {
      animation: heroImgReveal 2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      opacity: 0;
      transform: scale(1.06);
    }
    @keyframes heroImgReveal {
      0%   { opacity: 0; transform: scale(1.06); }
      100% { opacity: 1; transform: scale(1); }
    }
    .hero-progress-bar {
      transform-origin: left;
      animation: heroProgress 5s linear infinite;
    }
    @keyframes heroProgress {
      from { transform: scaleX(0); }
      to   { transform: scaleX(1); }
    }

    /* === Lightbox 图片过渡优化 === */
    .lb-img-enter {
      animation: lbImgEnter 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes lbImgEnter {
      from { opacity: 0; transform: scale(0.94); }
      to   { opacity: 1; transform: scale(1); }
    }
  `;
  document.head.appendChild(styleSheet);
};
injectStyles();

const APP_CONFIG = { adminPasscode: "8888" };

const UI_TEXT = {
  cn: { works: "作品", about: "关于", language: "语言", set: "设置", readStory: "阅读手记" },
  en: { works: "WORKS", about: "ABOUT", language: "LANGUAGE", set: "SET", readStory: "Read story" },
  th: { works: "ผลงาน", about: "เกี่ยวกับ", language: "ภาษา", set: "ตั้งค่า", readStory: "อ่านบันทึก" },
};

const DEFAULT_SLIDES = [
  { type: "image", title: "Serenity", url: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=2000", link: "" }
];

const DEFAULT_PROFILE = {
  brandName: "T8DAYS",
  logoUrl: "",
  faviconUrl: "", 
  siteTitle: "T8DAYS Photography", 
  siteDescription: "A photography portfolio.", 
  email: "contact@t8days.com",
  location: "Bangkok",
  heroImage: "https://images.unsplash.com/photo-1552058544-f2b08422138a?auto=format&fit=crop&w=800&q=80",
  social: { instagram: "", tiktok: "", rednote: "", twitter: "", youtube: "" },
  heroSlides: DEFAULT_SLIDES,
  showSlogan: true,
  showSlideTitle: true,
  adminPasscode: "", 
  content: {
    cn: { title: "以光为墨，记录世界。", bio: "这里不只是照片，而是时间的切片。", aboutText: "你好，我是 T8DAY..." },
    en: { title: "Painting with light.", bio: "Slices of time.", aboutText: "Hi, I am T8DAY..." },
    th: { title: "วาดด้วยแสง", bio: "ชิ้นส่วนของเวลา", aboutText: "สวัสดี ฉันคือ T8DAY..." },
  },
};

const DEFAULT_SETTINGS = { themeColor: "stone", categories: [], profile: DEFAULT_PROFILE };

// --- 2. 基础组件 ---

// [修改] MetaUpdater: 移除了无效的 Pinterest 注入代码，仅保留 Favicon/Title
const MetaUpdater = ({ profile }) => {
  useEffect(() => {
    if (profile?.siteTitle) document.title = profile.siteTitle;
    
    if (profile?.faviconUrl) {
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
        }
        link.href = profile.faviconUrl;
    }
  }, [profile]);
  return null;
};

const LoginModal = ({ isOpen, onClose, onLogin }) => {
  const [passcode, setPasscode] = useState('');
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 max-w-sm w-full text-center shadow-2xl animate-fade-in-up">
        <Lock className="w-8 h-8 text-neutral-500 mx-auto mb-4" />
        <h3 className="text-white text-lg font-light tracking-widest uppercase mb-6">Admin Access</h3>
        <input 
          type="password" value={passcode} onChange={(e) => setPasscode(e.target.value)} placeholder="Passcode"
          className="w-full bg-black border border-neutral-700 rounded px-4 py-3 text-white text-center tracking-[0.5em] mb-6 focus:outline-none focus:border-white transition-colors"
          autoFocus
        />
        <div className="flex gap-4">
          <button onClick={onClose} className="flex-1 py-3 text-neutral-500 hover:text-white text-sm uppercase">Cancel</button>
          <button onClick={() => onLogin(passcode)} className="flex-1 py-3 bg-white text-black font-bold rounded text-sm uppercase hover:bg-neutral-200">Enter</button>
        </div>
      </div>
    </div>
  );
};

// 项目信息编辑弹窗
// --- Project Story Reader Modal (front-end) ---
// Immersive full-screen reading view: scrollable page with mixed text/image blocks.
// Sans-serif body for legibility; serif title to echo the rest of the site.
const ProjectStoryModal = ({ isOpen, onClose, projectTitle, blocks }) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    // Lock background scroll while modal is open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[300] bg-neutral-950 overflow-y-auto animate-fade-in-up"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      {/* Fixed top bar — title left, close right */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 md:px-12 py-5 bg-gradient-to-b from-neutral-950 via-neutral-950/90 to-transparent backdrop-blur-sm">
        <h2 className="text-sm md:text-base font-serif tracking-[0.25em] uppercase text-white/60 truncate pr-4">
          {projectTitle}
        </h2>
        <button
          onClick={onClose}
          className="text-white/60 hover:text-white transition-colors flex-shrink-0"
          aria-label="Close"
        >
          <X size={22} />
        </button>
      </div>

      {/* Reading area — narrow column for comfortable line-length */}
      <div className="max-w-[720px] mx-auto px-6 md:px-0 pt-8 md:pt-16 pb-32">
        {(!blocks || blocks.length === 0) && (
          <p className="text-neutral-600 text-center py-20 text-sm tracking-widest uppercase">
            No content
          </p>
        )}

        {blocks && blocks.map((block, idx) => {
          if (block.type === "text") {
            // Split paragraphs on blank lines so editors can author multi-paragraph
            // text blocks naturally with a single textarea.
            const paragraphs = (block.content || "").split(/\n\s*\n/).filter(Boolean);
            return (
              <div key={idx} className="mb-10 md:mb-12">
                {paragraphs.map((para, pIdx) => (
                  <p
                    key={pIdx}
                    className="font-sans text-neutral-300 text-base md:text-lg leading-[1.9] mb-6 last:mb-0 whitespace-pre-wrap"
                    style={{ fontWeight: 300 }}
                  >
                    {para}
                  </p>
                ))}
              </div>
            );
          }
          if (block.type === "image") {
            return (
              <figure key={idx} className="my-12 md:my-16 -mx-6 md:mx-0">
                <img
                  src={block.url}
                  alt={block.caption || ""}
                  loading="lazy"
                  className="w-full h-auto block"
                />
                {block.caption && (
                  <figcaption className="font-sans text-neutral-500 text-xs md:text-sm leading-relaxed mt-3 px-6 md:px-0 italic">
                    {block.caption}
                  </figcaption>
                )}
              </figure>
            );
          }
          return null;
        })}

        {/* Bottom signature line */}
        {blocks && blocks.length > 0 && (
          <div className="pt-12 mt-16 border-t border-neutral-900 text-center">
            <p className="text-neutral-700 text-[10px] tracking-[0.3em] uppercase font-sans">
              {projectTitle}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const ProjectEditModal = ({ isOpen, onClose, initialData, onSave, storagePathPrefix }) => {
    const [formData, setFormData] = useState({ en: '', cn: '', th: '' });
    const [story, setStory] = useState({ en: [], cn: [], th: [] });
    const [activeStoryTab, setActiveStoryTab] = useState('en');
    const [storyExpanded, setStoryExpanded] = useState(false);
    const [uploadingBlockIdx, setUploadingBlockIdx] = useState(null);

    useEffect(() => {
      if (initialData) {
        setFormData({
          en: initialData.en || '',
          cn: initialData.cn || '',
          th: initialData.th || ''
        });
        // Defensive: ensure each language has at least an empty array
        const incoming = initialData.story || {};
        setStory({
          en: Array.isArray(incoming.en) ? incoming.en : [],
          cn: Array.isArray(incoming.cn) ? incoming.cn : [],
          th: Array.isArray(incoming.th) ? incoming.th : []
        });
        // Auto-expand the story panel if there is already content in any language
        const hasContent = ['en', 'cn', 'th'].some(l =>
          Array.isArray(incoming[l]) && incoming[l].length > 0
        );
        setStoryExpanded(hasContent);
        setActiveStoryTab('en');
      }
    }, [initialData]);

    if (!isOpen) return null;

    // --- Block manipulation helpers (operate on currently active language tab) ---
    // All mutations go through functional setStory so an in-flight async upload
    // (which captures `story` at call time) cannot overwrite edits the user
    // made on a different tab while the upload was running.
    const currentBlocks = story[activeStoryTab] || [];

    const addTextBlock = () => {
      const lang = activeStoryTab;
      setStory(prev => ({ ...prev, [lang]: [...(prev[lang] || []), { type: 'text', content: '' }] }));
    };

    const addImageBlock = () => {
      const lang = activeStoryTab;
      setStory(prev => ({ ...prev, [lang]: [...(prev[lang] || []), { type: 'image', url: '', caption: '' }] }));
    };

    const updateBlock = (idx, patch) => {
      const lang = activeStoryTab;
      setStory(prev => ({
        ...prev,
        [lang]: (prev[lang] || []).map((b, i) => i === idx ? { ...b, ...patch } : b)
      }));
    };

    const deleteBlock = (idx) => {
      if (!confirm('Delete this block?')) return;
      const lang = activeStoryTab;
      setStory(prev => ({
        ...prev,
        [lang]: (prev[lang] || []).filter((_, i) => i !== idx)
      }));
    };

    const moveBlock = (idx, dir) => {
      const lang = activeStoryTab;
      setStory(prev => {
        const blocks = prev[lang] || [];
        const newIdx = dir === 'up' ? idx - 1 : idx + 1;
        if (newIdx < 0 || newIdx >= blocks.length) return prev;
        const next = [...blocks];
        [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
        return { ...prev, [lang]: next };
      });
    };

    const handleImageUpload = async (idx, file) => {
      if (!file) return;
      // Pin the language to the tab the user was on when they started the upload,
      // so when the async resolves we patch the correct tab — even if they've
      // switched tabs in the meantime.
      const lang = activeStoryTab;
      setUploadingBlockIdx(idx);
      try {
        const optimized = await compressImage(file, 1920, 0.85);
        const safeProject = (formData.en || initialData?.oldProject || 'project').trim() || 'project';
        // Story images live under `stories/` — a separate Storage root from
        // `photos/` — so any external listener on `photos/` (e.g. a Cloud
        // Function that mirrors uploads into the photos Firestore collection)
        // does not pick them up and surface them in the public photo grid.
        const path = `${storagePathPrefix || 'stories'}/${safeProject}/${lang}/${Date.now()}_${file.name}`;
        const url = await uploadFileToStorage(optimized || file, path);
        setStory(prev => ({
          ...prev,
          [lang]: (prev[lang] || []).map((b, i) => i === idx ? { ...b, url } : b)
        }));
      } catch (err) {
        console.error(err);
        alert('Image upload failed');
      } finally {
        setUploadingBlockIdx(null);
      }
    };

    const handleSave = () => {
      // Block save while an upload is mid-flight; otherwise the empty-url
      // block gets stripped below and the image silently disappears.
      if (uploadingBlockIdx !== null) {
        alert('Please wait for the image upload to finish.');
        return;
      }
      // Strip empty blocks before saving (a text block with no content, or
      // an image block with no url, is just noise on the public side).
      const cleanedStory = {
        en: (story.en || []).filter(b =>
          (b.type === 'text' && (b.content || '').trim()) ||
          (b.type === 'image' && (b.url || '').trim())
        ),
        cn: (story.cn || []).filter(b =>
          (b.type === 'text' && (b.content || '').trim()) ||
          (b.type === 'image' && (b.url || '').trim())
        ),
        th: (story.th || []).filter(b =>
          (b.type === 'text' && (b.content || '').trim()) ||
          (b.type === 'image' && (b.url || '').trim())
        ),
      };
      onSave({ ...formData, story: cleanedStory });
    };

    return (
      <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 md:p-4">
         <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-3xl shadow-2xl animate-fade-in-up max-h-[95vh] flex flex-col">
            {/* Header */}
            <div className="px-5 md:px-6 pt-5 md:pt-6 pb-3 border-b border-neutral-800 flex items-center justify-between flex-shrink-0">
              <h3 className="text-white text-base md:text-lg font-bold">Edit Project Info</h3>
              <button onClick={onClose} className="text-neutral-500 hover:text-white p-1" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto px-5 md:px-6 py-5 flex-1" style={{ WebkitOverflowScrolling: 'touch' }}>
              {/* Title fields */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-neutral-500 uppercase mb-1 block">Project ID / English Name (EN)</label>
                  <input className="w-full bg-black border border-neutral-700 rounded p-2 text-white text-sm" value={formData.en} onChange={e => setFormData({...formData, en: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs text-neutral-500 uppercase mb-1 block">Chinese Name (CN)</label>
                  <input className="w-full bg-black border border-neutral-700 rounded p-2 text-white text-sm" value={formData.cn} onChange={e => setFormData({...formData, cn: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs text-neutral-500 uppercase mb-1 block">Thai Name (TH)</label>
                  <input className="w-full bg-black border border-neutral-700 rounded p-2 text-white text-sm" value={formData.th} onChange={e => setFormData({...formData, th: e.target.value})} />
                </div>
              </div>

              {/* Story editor — collapsible */}
              <div className="mt-6 border-t border-neutral-800 pt-5">
                <button
                  onClick={() => setStoryExpanded(!storyExpanded)}
                  className="w-full flex items-center justify-between text-left group"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen size={14} className="text-neutral-400" />
                    <span className="text-sm font-bold text-white">Project Story</span>
                    <span className="text-xs text-neutral-500">(Optional)</span>
                  </div>
                  <ChevronDown size={16} className={`text-neutral-500 transition-transform ${storyExpanded ? 'rotate-180' : ''}`} />
                </button>

                {storyExpanded && (
                  <div className="mt-4">
                    {/* Language tabs */}
                    <div className="flex gap-1 mb-3 bg-black/40 p-1 rounded">
                      {['en', 'cn', 'th'].map(l => {
                        const count = (story[l] || []).length;
                        return (
                          <button
                            key={l}
                            onClick={() => setActiveStoryTab(l)}
                            className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-colors ${
                              activeStoryTab === l
                                ? 'bg-white text-black'
                                : 'text-neutral-500 hover:text-white'
                            }`}
                          >
                            {l === 'cn' ? '中文' : l === 'en' ? 'English' : 'ไทย'}
                            {count > 0 && (
                              <span className={`ml-1 text-[10px] ${activeStoryTab === l ? 'text-neutral-500' : 'text-neutral-600'}`}>
                                ({count})
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Block list */}
                    <div className="space-y-2 mb-3">
                      {currentBlocks.length === 0 && (
                        <div className="text-center py-6 text-neutral-600 text-xs italic">
                          No content yet — add a paragraph or image below.
                        </div>
                      )}

                      {currentBlocks.map((block, idx) => (
                        <div
                          key={idx}
                          className="bg-black/40 border border-neutral-800 rounded-lg p-3 group"
                        >
                          {/* Block toolbar */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-neutral-500 font-bold">
                              {block.type === 'text' ? <Type size={11} /> : <ImageIcon size={11} />}
                              <span>{block.type === 'text' ? 'Paragraph' : 'Image'}</span>
                              <span className="text-neutral-700">#{idx + 1}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => moveBlock(idx, 'up')}
                                disabled={idx === 0}
                                className="p-1 text-neutral-500 hover:text-white disabled:opacity-20 disabled:hover:text-neutral-500"
                                title="Move up"
                              >
                                <ArrowUp size={13} />
                              </button>
                              <button
                                onClick={() => moveBlock(idx, 'down')}
                                disabled={idx === currentBlocks.length - 1}
                                className="p-1 text-neutral-500 hover:text-white disabled:opacity-20 disabled:hover:text-neutral-500"
                                title="Move down"
                              >
                                <ArrowDown size={13} />
                              </button>
                              <button
                                onClick={() => deleteBlock(idx)}
                                className="p-1 text-neutral-500 hover:text-red-400"
                                title="Delete block"
                              >
                                <Trash size={13} />
                              </button>
                            </div>
                          </div>

                          {/* Block body */}
                          {block.type === 'text' && (
                            <textarea
                              value={block.content || ''}
                              onChange={e => updateBlock(idx, { content: e.target.value })}
                              placeholder="Write your paragraph here. Leave a blank line to start a new paragraph."
                              rows={5}
                              className="w-full bg-black border border-neutral-700 rounded p-2 text-white text-sm leading-relaxed resize-y"
                            />
                          )}

                          {block.type === 'image' && (
                            <div className="space-y-2">
                              {block.url ? (
                                <div className="relative">
                                  <img
                                    src={block.url}
                                    alt=""
                                    className="w-full max-h-64 object-contain bg-neutral-950 rounded"
                                  />
                                  <label className="absolute top-2 right-2 px-2 py-1 bg-black/70 hover:bg-black text-white text-[10px] uppercase tracking-wider rounded cursor-pointer">
                                    Replace
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={e => handleImageUpload(idx, e.target.files[0])}
                                    />
                                  </label>
                                </div>
                              ) : (
                                <label className={`flex flex-col items-center justify-center py-6 border border-dashed border-neutral-700 rounded cursor-pointer hover:border-neutral-500 hover:bg-black/30 transition-colors ${uploadingBlockIdx === idx ? 'opacity-50 pointer-events-none' : ''}`}>
                                  {uploadingBlockIdx === idx ? (
                                    <>
                                      <Loader2 size={20} className="text-neutral-500 animate-spin mb-2" />
                                      <span className="text-xs text-neutral-500">Uploading…</span>
                                    </>
                                  ) : (
                                    <>
                                      <UploadCloud size={20} className="text-neutral-500 mb-2" />
                                      <span className="text-xs text-neutral-500">Click to upload image</span>
                                    </>
                                  )}
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={e => handleImageUpload(idx, e.target.files[0])}
                                  />
                                </label>
                              )}
                              <input
                                type="text"
                                value={block.caption || ''}
                                onChange={e => updateBlock(idx, { caption: e.target.value })}
                                placeholder="Caption (optional)"
                                className="w-full bg-black border border-neutral-700 rounded p-2 text-neutral-400 text-xs italic"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Add buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={addTextBlock}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-black border border-neutral-700 rounded text-xs uppercase tracking-wider text-neutral-300 hover:border-neutral-500 hover:text-white transition-colors"
                      >
                        <Plus size={13} /> Paragraph
                      </button>
                      <button
                        onClick={addImageBlock}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-black border border-neutral-700 rounded text-xs uppercase tracking-wider text-neutral-300 hover:border-neutral-500 hover:text-white transition-colors"
                      >
                        <Plus size={13} /> Image
                      </button>
                    </div>

                    <p className="text-[10px] text-neutral-600 mt-3 leading-relaxed">
                      Each language is independent. A language with no blocks won't show the "Read story" link on the public site.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer actions */}
            <div className="flex gap-3 px-5 md:px-6 py-4 border-t border-neutral-800 flex-shrink-0">
              <button onClick={onClose} className="flex-1 py-2 text-neutral-400 hover:text-white text-sm">Cancel</button>
              <button
                onClick={handleSave}
                disabled={uploadingBlockIdx !== null}
                className={`flex-1 py-2 bg-white text-black font-bold rounded hover:bg-neutral-200 text-sm ${uploadingBlockIdx !== null ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {uploadingBlockIdx !== null ? 'Uploading…' : 'Save Changes'}
              </button>
            </div>
         </div>
      </div>
    );
  };

const GlobalNav = ({ profile, ui, onNavClick, lang, setLang, mobileMenuOpen, setMobileMenuOpen, onLoginClick }) => {
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const uiText = ui || UI_TEXT.en;

  const handleMobileSetClick = () => {
    setMobileMenuOpen(false);
    if (onLoginClick) onLoginClick();
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-[60] py-6 md:py-8 px-6 md:px-12 flex justify-between items-center transition-all duration-500 bg-gradient-to-b from-neutral-950/80 to-transparent backdrop-blur-[2px] pointer-events-auto">
        <div className="cursor-pointer flex items-center gap-2 hover:opacity-80 transition-opacity" onClick={() => onNavClick("home")}>
          {/* LOGO 尺寸: h-4 (16px) md:h-5 (20px) */}
          {profile.logoUrl ? <img src={profile.logoUrl} alt="Logo" className="h-4 md:h-5 w-auto object-contain" /> : <><Aperture className="w-4 h-4 text-white/40" /><span className="text-white/40 font-medium tracking-widest text-sm font-serif">{profile.brandName}</span></>}
        </div>
        
        <div className="hidden md:flex items-center gap-10">
          <div className="flex gap-8 text-xs font-bold tracking-[0.15em] uppercase text-neutral-400 font-sans">
            <button onClick={() => onNavClick("works")} className="hover:text-white transition-colors pb-1">{uiText.works}</button>
            <button onClick={() => onNavClick("about")} className="hover:text-white transition-colors pb-1">{uiText.about}</button>
          </div>
          <div className="relative group" onMouseEnter={() => setLangDropdownOpen(true)} onMouseLeave={() => setLangDropdownOpen(false)}>
            <button className="flex items-center gap-1 text-[10px] font-bold text-neutral-400 hover:text-white uppercase tracking-widest transition-colors">
              <Globe className="w-3 h-3 mr-1" /> {uiText.language} <ChevronDown className="w-3 h-3" />
            </button>
            <div className={`absolute top-full right-0 pt-4 transition-opacity duration-300 ${langDropdownOpen ? "opacity-100 visible" : "opacity-0 invisible"}`}>
              <div className="bg-neutral-900 border border-neutral-800 p-2 rounded flex flex-col gap-2 min-w-[80px] shadow-xl">
                {["en", "cn", "th"].map((l) => (
                  <button key={l} onClick={() => { setLang(l); setLangDropdownOpen(false); }} className={`text-[10px] font-bold uppercase text-left px-2 py-1 rounded ${lang === l ? "text-white" : "text-neutral-500 hover:bg-neutral-800"}`}>
                    {l === "cn" ? "中文" : l === "en" ? "English" : "ไทย"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {/* PC端设置按钮 - 顶部导航最右侧 */}
          {onLoginClick && (
            <button
              onClick={onLoginClick}
              className="text-neutral-500 hover:text-white transition-colors p-1"
              title="Admin"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="md:hidden flex items-center gap-4 z-[61]">
          <button onClick={() => setLang(lang === "en" ? "cn" : lang === "cn" ? "th" : "en")} className="text-[10px] font-bold uppercase text-neutral-400 border border-neutral-800 px-2 py-1 rounded">{lang}</button>
          <button className="text-white p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>{mobileMenuOpen ? <X /> : <Menu />}</button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center animate-fade-in-up">
          <div className="flex flex-col gap-12 text-4xl font-thin text-white tracking-widest items-center font-serif">
            <button onClick={() => onNavClick("works")} className="hover:text-neutral-400 transition-colors">{uiText.works}</button>
            <button onClick={() => onNavClick("about")} className="hover:text-neutral-400 transition-colors">{uiText.about}</button>
            {onLoginClick && (
              <button onClick={handleMobileSetClick} className="hover:text-neutral-400 transition-colors">{uiText.set}</button>
            )}
          </div>
        </div>
      )}
    </>
  );
};

// --- 3. 页面组件 ---

const HeroSlideshow = ({ slides, onIndexChange, onLinkClick }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    if (slides.length > 1) {
      const nextIndex = (currentIndex + 1) % slides.length;
      const img = new Image();
      img.src = slides[nextIndex].url;
    }
  }, [currentIndex, slides]);

  useEffect(() => {
    if (!slides || slides.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        setAnimKey(k => k + 1);
        return (prev + 1) % slides.length;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [slides]);

  useEffect(() => { onIndexChange && onIndexChange(currentIndex); }, [currentIndex, onIndexChange]);

  if (!slides || slides.length === 0) return null;

  const handleSlideClick = (slide) => {
    if (slide.link) {
      if (onLinkClick) onLinkClick(slide.link);
      else window.open(slide.link, "_blank");
    }
  };

  return (
    <div className="absolute inset-0 w-full h-full bg-black overflow-hidden z-0">
      {slides.map((slide, index) => {
        const isActive = index === currentIndex;
        return (
          <div
            key={index}
            className="absolute inset-0 w-full h-full"
            style={{
              opacity: isActive ? 1 : 0,
              transition: isActive ? 'opacity 1.8s ease-in-out' : 'opacity 1s ease-in-out',
              zIndex: isActive ? 2 : 1,
            }}
            onClick={() => isActive && handleSlideClick(slide)}
          >
            {slide.type === "video" ? (
              <video src={slide.url} autoPlay muted loop playsInline className="w-full h-full object-cover" />
            ) : (
              <img
                key={isActive ? animKey : index}
                src={slide.url}
                alt={slide.title}
                fetchPriority={index === 0 ? "high" : "auto"}
                loading={index === 0 ? "eager" : "lazy"}
                decoding="async"
                className={isActive ? "w-full h-full object-cover hero-img-reveal" : "w-full h-full object-cover"}
              />
            )}
          </div>
        );
      })}

      {/* 渐变遮罩 */}
      <div className="absolute inset-0 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.28) 0%, transparent 40%, rgba(0,0,0,0.65) 100%)" }}
      />

      {/* 扫描线 */}
      <div className="hero-scan-line z-10" />

      {/* 四角装饰 */}
      <div className="absolute inset-6 z-10 pointer-events-none">
        <div className="hero-corner hero-corner-tl" />
        <div className="hero-corner hero-corner-tr" />
        <div className="hero-corner hero-corner-bl" />
        <div className="hero-corner hero-corner-br" />
      </div>

      {/* 底部进度条 */}
      {slides.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 z-20 h-[1px] bg-white/10 pointer-events-none overflow-hidden">
          <div key={animKey} className="h-full bg-white/40 hero-progress-bar" />
        </div>
      )}

      {/* 幻灯片序号 */}
      {slides.length > 1 && (
        <div className="absolute right-6 md:right-10 bottom-10 z-20 pointer-events-none flex flex-col items-end gap-2"
          style={{ animation: 'heroCounterIn 1s ease 1.2s both' }}>
          <span className="font-mono text-white/25 text-[10px] tracking-widest">
            {String(currentIndex + 1).padStart(2,'0')} / {String(slides.length).padStart(2,'0')}
          </span>
          <div className="flex gap-1.5 items-center">
            {slides.map((_, i) => (
              <div key={i} className="rounded-full transition-all duration-500"
                style={{ width: i === currentIndex ? 18 : 4, height: 4, background: i === currentIndex ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)' }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const AboutPage = ({ profile, lang, onClose }) => {
  const content = { ...DEFAULT_PROFILE.content[lang], ...(profile.content?.[lang] || {}) };
  return (
    <div className="fixed inset-0 z-30 bg-neutral-950 overflow-y-auto animate-fade-in-up no-scrollbar">
      <div className="min-h-screen flex flex-col md:flex-row">
        <div className="w-full md:w-1/2 h-[50vh] md:h-screen relative">
          <img 
            src={profile.heroImage} 
            alt="Profile" 
            className="w-full h-full object-cover" 
          />
          <div className="absolute inset-0 bg-black/10 pointer-events-none"></div>
        </div>

        <div className="w-full md:w-1/2 p-8 md:p-24 flex flex-col justify-center">
          <div className="prose prose-invert prose-lg max-w-none text-neutral-300 font-light leading-relaxed whitespace-pre-line text-sm md:text-base font-sans mb-12">
            {content.aboutText}
          </div>
          <div className="border-t border-neutral-800 pt-8 grid grid-cols-1 gap-6">
            <div>
              <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Contact</h3>
              <a href={`mailto:${profile.email}`} className="text-white text-lg font-light hover:text-neutral-400 transition-colors block font-serif">{profile.email}</a>
              <p className="text-neutral-500 font-light text-sm mt-1">{profile.location}</p>
            </div>
            <div className="flex gap-6">
              {profile.social?.instagram && <a href={profile.social.instagram} target="_blank" className="text-neutral-500 hover:text-white transition-colors text-xs tracking-widest uppercase flex items-center gap-1"><Camera size={14} /> IG</a>}
              {profile.social?.tiktok && <a href={profile.social.tiktok} target="_blank" className="text-neutral-500 hover:text-white transition-colors text-xs tracking-widest uppercase flex items-center gap-1"><Music size={14} /> TK</a>}
              {profile.social?.rednote && <a href={profile.social.rednote} target="_blank" className="text-neutral-500 hover:text-white transition-colors text-xs tracking-widest uppercase flex items-center gap-1"><ExternalLink size={14} /> RED</a>}
              {profile.social?.twitter && <a href={profile.social.twitter} target="_blank" className="text-neutral-500 hover:text-white transition-colors text-xs tracking-widest uppercase flex items-center gap-1"><X size={14} /> X</a>}
              {profile.social?.youtube && <a href={profile.social.youtube} target="_blank" className="text-neutral-500 hover:text-white transition-colors text-xs tracking-widest uppercase flex items-center gap-1"><Play size={14} /> YT</a>}
            </div>
          </div>
        </div>

        <button onClick={onClose} className="fixed top-6 right-6 z-50 bg-black/20 hover:bg-black/50 text-white p-3 rounded-full transition-colors backdrop-blur-sm"><X className="w-5 h-5" /></button>
      </div>
    </div>
  );
};

// ImmersiveLightbox: 简洁版 - 黑白背景切换 + 竖图3:4裁切 + 左右滑动 + 长按保存
const ImmersiveLightbox = ({ initialIndex, images, onClose, onIndexChange, lang }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [imgKey, setImgKey] = useState(0);

  // 背景模式：false = 黑底（默认），true = 白底
  const [lightMode, setLightMode] = useState(false);

  // 图片原始尺寸（判断横/竖图）。null 表示未加载
  const [imgDims, setImgDims] = useState(null);

  // 手势状态（用 ref 不触发重渲染）
  const gestureRef = useRef({
    swipeStartX: null,
    swipeStartY: null,
    swipeEndX: null,
    touchMoved: false,
    touchStartTime: 0,
    tapTimer: null,
    lastTouchEndAt: 0,
  });

  const currentImage = images[currentIndex];

  // 预加载下一张
  useEffect(() => {
    if (images.length > 1) {
      const nextIndex = (currentIndex + 1) % images.length;
      const img = new Image();
      img.src = images[nextIndex].url;
    }
  }, [currentIndex, images]);

  const changeImage = (direction) => {
    let nextIndex;
    if (direction === "next") {
      nextIndex = (currentIndex + 1) % images.length;
    } else {
      nextIndex = (currentIndex - 1 + images.length) % images.length;
    }
    setCurrentIndex(nextIndex);
    setImgKey(k => k + 1);
    setImgDims(null);
    if (onIndexChange) onIndexChange(nextIndex);
  };

  const toggleLightMode = () => {
    setLightMode(prev => !prev);
  };

  // ---------- 触摸事件（只处理滑动切图 + 单击切背景）----------
  const onTouchStart = (e) => {
    const g = gestureRef.current;
    g.touchMoved = false;
    g.touchStartTime = Date.now();

    // 忽略多指手势（留给浏览器处理，不干扰）
    if (e.touches.length !== 1) {
      g.swipeStartX = null;
      return;
    }

    const t = e.touches[0];
    g.swipeStartX = t.clientX;
    g.swipeStartY = t.clientY;
    g.swipeEndX = null;
  };

  const onTouchMove = (e) => {
    const g = gestureRef.current;
    if (e.touches.length !== 1 || g.swipeStartX == null) return;

    const t = e.touches[0];
    const dx = Math.abs(t.clientX - g.swipeStartX);
    const dy = Math.abs(t.clientY - g.swipeStartY);
    if (dx > 10 || dy > 10) g.touchMoved = true;
    g.swipeEndX = t.clientX;
  };

  const onTouchEnd = (e) => {
    const g = gestureRef.current;
    const now = Date.now();
    const touchDuration = now - g.touchStartTime;
    g.lastTouchEndAt = now;

    // 滑动切图
    if (g.swipeStartX != null && g.swipeEndX != null) {
      const distance = g.swipeStartX - g.swipeEndX;
      if (Math.abs(distance) > 50) {
        if (distance > 0) changeImage("next");
        else changeImage("prev");
        g.swipeStartX = null;
        g.swipeEndX = null;
        return;
      }
    }

    // 单击切背景
    if (!g.touchMoved && touchDuration < 300) {
      if (g.tapTimer) clearTimeout(g.tapTimer);
      g.tapTimer = setTimeout(() => {
        toggleLightMode();
        g.tapTimer = null;
      }, 50);
    }

    g.swipeStartX = null;
    g.swipeEndX = null;
  };

  // 键盘
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowRight") changeImage("next");
      if (e.key === "ArrowLeft") changeImage("prev");
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, images, onClose]);

  // 清理
  useEffect(() => {
    return () => {
      if (gestureRef.current.tapTimer) clearTimeout(gestureRef.current.tapTimer);
    };
  }, []);

  // 锁定 body 滚动（防止 Lightbox 内滑动穿透到背后页面）
  useEffect(() => {
    const scrollY = window.scrollY;
    const bodyStyle = document.body.style;
    const prevOverflow = bodyStyle.overflow;
    const prevPosition = bodyStyle.position;
    const prevTop = bodyStyle.top;
    const prevWidth = bodyStyle.width;

    bodyStyle.overflow = 'hidden';
    bodyStyle.position = 'fixed';
    bodyStyle.top = `-${scrollY}px`;
    bodyStyle.width = '100%';

    return () => {
      bodyStyle.overflow = prevOverflow;
      bodyStyle.position = prevPosition;
      bodyStyle.top = prevTop;
      bodyStyle.width = prevWidth;
      // 恢复到之前的滚动位置
      window.scrollTo(0, scrollY);
    };
  }, []);

  // 点击容器空白切换背景
  const onContainerClick = (e) => {
    if (e.target !== e.currentTarget) return;
    if (Date.now() - gestureRef.current.lastTouchEndAt < 500) return;
    toggleLightMode();
  };

  // 点击图片切换背景
  const onImageClick = (e) => {
    e.stopPropagation();
    if (Date.now() - gestureRef.current.lastTouchEndAt < 500) return;
    toggleLightMode();
  };

  const preventPropagation = (e) => e.stopPropagation();

  if (!currentImage) return null;

  const displayTitle = currentImage.projectTitles?.[lang] || currentImage.project;
  const isPortrait = imgDims !== null && imgDims.h > imgDims.w;
  const isLoaded = imgDims !== null;

  const bgColor = lightMode ? '#ffffff' : '#000000';
  const textColor = lightMode ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.6)';
  const iconColorClass = lightMode ? 'text-neutral-800 hover:text-black' : 'text-neutral-300 hover:text-white';

  return (
    <div
      className="z-[100] flex items-center justify-center animate-fade-in"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onClick={onContainerClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: bgColor,
        transition: 'background-color 0.4s ease',
        touchAction: 'none', // 禁止原生触摸滚动，不影响长按菜单
        overscrollBehavior: 'contain', // 防止下拉刷新等浏览器手势
      }}
    >
      {/* 纯色背景兜底 */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: -1, backgroundColor: bgColor }} />

      {/* 关闭按钮 */}
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        onTouchStart={preventPropagation}
        onTouchEnd={preventPropagation}
        className={`absolute top-6 right-6 z-[110] ${iconColorClass} transition-colors duration-300 p-4`}
      >
        <X className="w-6 h-6" />
      </button>

      {/* PC 端侧边箭头 */}
      <div className="hidden md:flex absolute inset-y-0 left-4 z-20 items-center justify-center pointer-events-none">
        <ChevronLeft className={`${iconColorClass} transition-colors`} size={48} strokeWidth={0.5} />
      </div>
      <div className="hidden md:flex absolute inset-y-0 right-4 z-20 items-center justify-center pointer-events-none">
        <ChevronRight className={`${iconColorClass} transition-colors`} size={48} strokeWidth={0.5} />
      </div>

      {/* PC 端隐形点击翻页区域（左右各 4vw 的边缘，避开图片主体） */}
      <div className="hidden md:block absolute top-24 bottom-24 left-0 z-10 cursor-pointer" style={{ width: '4vw' }} onClick={(e) => { e.stopPropagation(); changeImage("prev"); }} />
      <div className="hidden md:block absolute top-24 bottom-24 right-0 z-10 cursor-pointer" style={{ width: '4vw' }} onClick={(e) => { e.stopPropagation(); changeImage("next"); }} />

      {/* 图片舞台 */}
      <div
        className="relative z-0 flex items-center justify-center pointer-events-none"
        style={{
          width: '100%',
          height: '85vh',
          overflow: 'hidden',
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 0.25s ease',
        }}
      >
        {isPortrait ? (
          // 竖图：手机端 3:4 裁切铺满；PC 端原图比例居中
          <div
            className="pointer-events-none relative overflow-hidden"
            style={{
              width: '100vw',
              aspectRatio: '3 / 4',
              maxHeight: '85vh',
              maxWidth: '100vw',
            }}
          >
            <img
              key={`p-${imgKey}`}
              src={currentImage.url}
              alt="Photo"
              onClick={onImageClick}
              onLoad={(e) => setImgDims({ w: e.target.naturalWidth, h: e.target.naturalHeight })}
              className="lb-img-enter pointer-events-auto select-none w-full h-full object-cover md:object-contain"
              style={{ cursor: 'pointer' }}
            />
          </div>
        ) : (
          // 横图：两边拉满
          <img
            key={`l-${imgKey}`}
            src={currentImage.url}
            alt="Photo"
            onClick={onImageClick}
            onLoad={(e) => setImgDims({ w: e.target.naturalWidth, h: e.target.naturalHeight })}
            className="lb-img-enter pointer-events-auto select-none w-screen md:w-auto md:max-w-[92vw]"
            style={{
              maxHeight: '85vh',
              objectFit: 'contain',
              cursor: 'pointer',
            }}
          />
        )}
      </div>

      {/* 隐藏预加载探测图 */}
      {!isLoaded && (
        <img
          src={currentImage.url}
          alt=""
          onLoad={(e) => setImgDims({ w: e.target.naturalWidth, h: e.target.naturalHeight })}
          style={{ display: 'none' }}
        />
      )}

      {/* 底部信息栏 */}
      <div className="absolute bottom-8 left-8 right-8 z-30 pointer-events-none flex justify-between items-end">
        <div style={{ color: textColor }} className="font-serif font-thin text-xs tracking-widest">
          {currentImage.year} — {displayTitle}
        </div>

        <div className="flex items-center gap-4 pointer-events-auto">
          <div className="md:hidden flex items-center gap-4">
            <button
              onClick={(e) => { e.stopPropagation(); changeImage("prev"); }}
              onTouchStart={preventPropagation}
              onTouchEnd={preventPropagation}
              className={`${iconColorClass} p-2`}
            >
              <ChevronLeft size={20} strokeWidth={1} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); changeImage("next"); }}
              onTouchStart={preventPropagation}
              onTouchEnd={preventPropagation}
              className={`${iconColorClass} p-2`}
            >
              <ChevronRight size={20} strokeWidth={1} />
            </button>
          </div>
          <div style={{ color: textColor }} className="font-mono text-xs tracking-widest">
            {currentIndex + 1} / {images.length}
          </div>
        </div>
      </div>
    </div>
  );
};

const ProjectRow = ({ projectTitle, photos, onImageClick, storyBlocks, readStoryLabel, onStoryClick }) => {
  const [showOverlay, setShowOverlay] = useState(false);
  const hoverTimeoutRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const animationRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!scrollContainerRef.current) return;
    const { left, width } = scrollContainerRef.current.getBoundingClientRect();
    const x = e.clientX - left;
    const stopScroll = () => { if (animationRef.current) { cancelAnimationFrame(animationRef.current); animationRef.current = null; } };
    if (x > width * 0.8) {
      stopScroll();
      const scrollRight = () => { if (scrollContainerRef.current) { scrollContainerRef.current.scrollLeft += 5; animationRef.current = requestAnimationFrame(scrollRight); } };
      scrollRight();
    } else if (x < width * 0.2) {
      stopScroll();
      const scrollLeft = () => { if (scrollContainerRef.current) { scrollContainerRef.current.scrollLeft -= 5; animationRef.current = requestAnimationFrame(scrollLeft); } };
      scrollLeft();
    } else { stopScroll(); }
  };

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    if (window.innerWidth >= 768) { 
      hoverTimeoutRef.current = setTimeout(() => setShowOverlay(true), 600); 
    } 
  };

  const handleMouseLeave = () => { 
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setShowOverlay(false);
    if (animationRef.current) cancelAnimationFrame(animationRef.current); 
  };

  const isProjectTitleVisible = showOverlay && window.innerWidth >= 768;
  const hasStory = Array.isArray(storyBlocks) && storyBlocks.length > 0;

  return (
    <div
      className={`relative group/row mb-8 md:mb-12 transition-all duration-1000 ${hasStory ? 'md:pt-6' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
    >

      {/* Mobile title bar */}
      <div className="md:hidden mb-2 px-1">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-serif text-white/90 tracking-widest uppercase">{projectTitle}</h3>
          <div className="h-[1px] flex-grow bg-white/10"></div>
        </div>
        {hasStory && (
          <button
            onClick={onStoryClick}
            className="mt-1.5 inline-flex items-center gap-1 text-[10px] tracking-[0.2em] uppercase text-white/40 active:text-white transition-colors font-sans"
          >
            {readStoryLabel} <span aria-hidden="true">→</span>
          </button>
        )}
      </div>

      {/* Desktop "Read story" — sits inside the row's reserved md:pt-6 area
          (above the photo strip). Earlier this used `-translate-y-6` to float
          above the row, but the parent column in WorksPage has overflow-hidden,
          which clipped the button on the first row of each year. Placing it
          inside the row keeps it visible regardless of parent overflow. */}
      {hasStory && (
        <button
          onClick={onStoryClick}
          className="hidden md:inline-flex absolute top-0 right-4 items-center gap-1 text-[10px] tracking-[0.25em] uppercase text-white/40 hover:text-white transition-colors font-sans z-20"
        >
          {readStoryLabel} <span aria-hidden="true">→</span>
        </button>
      )}

      <div className={`hidden md:flex absolute inset-0 z-10 items-center justify-start pl-4 pointer-events-none transition-opacity duration-500 ease-out ${isProjectTitleVisible ? "opacity-100" : "opacity-0"}`}>
        <h3 className="text-2xl md:text-3xl font-thin text-white/80 tracking-widest uppercase drop-shadow-2xl mix-blend-difference font-serif">{projectTitle}</h3>
      </div>

      <div className="md:hidden absolute right-0 top-0 bottom-8 w-12 bg-gradient-to-l from-black/50 to-transparent z-10 pointer-events-none flex items-center justify-center">
         <ChevronRight className="text-white/50 animate-pulse" size={20} />
      </div>

      <div ref={scrollContainerRef} className={`flex overflow-x-auto no-scrollbar gap-1 md:gap-1 transition-opacity duration-500 ease-out ${isProjectTitleVisible ? "opacity-30" : "opacity-100"}`} style={{ scrollBehavior: "auto", WebkitOverflowScrolling: 'touch' }}>
        {photos.map((photo) => (
          <div key={photo.id} className="flex-shrink-0 aspect-square bg-neutral-900 overflow-hidden cursor-pointer w-[32vw] md:w-[9vw]" onClick={() => onImageClick(photo, photos)}>
            <img 
              src={photo.thumbnailUrl || photo.url} 
              alt="Work" 
              loading="lazy" 
              decoding="async" 
              className="w-full h-full object-cover transition-transform duration-700 ease-out hover:scale-110" 
            />
          </div>
        ))}
        <div className="w-8 flex-shrink-0"></div>
      </div>
    </div>
  );
};

const WorksPage = ({ photos, profile, ui, onImageClick, lang }) => {
  const [activeStory, setActiveStory] = useState(null);
  const uiText = ui || UI_TEXT.en;

  const groupedByYearAndProject = photos.reduce((acc, photo) => {
    const year = photo.year ? String(photo.year).trim() : "Unsorted";
    const project = photo.project ? String(photo.project).trim() : "Uncategorized";
    if (!acc[year]) acc[year] = {};
    if (!acc[year][project]) acc[year][project] = [];
    acc[year][project].push(photo);
    return acc;
  }, {});
  const sortedYears = Object.keys(groupedByYearAndProject).sort((a, b) => b - a);
  
  const getSortedProjects = (year) => {
      const projs = Object.keys(groupedByYearAndProject[year]);
      return projs.sort((a, b) => {
        const minA = Math.min(...groupedByYearAndProject[year][a].map(p => p.order || 0));
        const minB = Math.min(...groupedByYearAndProject[year][b].map(p => p.order || 0));
        return minA - minB;
      });
  };

  // Pull the story for the *current* language only — other languages don't
  // surface in this view, so we don't bother passing them down.
  const getStoryForLang = (firstPhoto) => {
    const story = firstPhoto?.projectStory;
    if (!story || typeof story !== 'object') return null;
    const blocks = story[lang];
    if (!Array.isArray(blocks) || blocks.length === 0) return null;
    return blocks;
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white animate-fade-in-up">
      <div className="pt-28 md:pt-32 pb-32 px-4 md:px-12 container mx-auto max-w-[1920px]">
        {sortedYears.map((year) => (
          <div key={year} className="mb-16 md:mb-12 flex flex-col md:flex-row gap-4 md:gap-8">
            {/* CRITICAL FIX: 彻底移除了 sticky，年份自然滚动 */}
            <div className="md:w-48 flex-shrink-0 relative h-fit pointer-events-none z-10">
              <span className="text-4xl md:text-2xl font-serif font-thin text-white/30 md:text-white/50 tracking-widest block leading-none md:-ml-2 transition-all font-serif">{year}</span>
            </div>
            <div className="flex-grow flex flex-col gap-8 overflow-hidden mt-4 md:mt-0">
              {getSortedProjects(year).map((projectKey) => {
                const projectPhotos = groupedByYearAndProject[year][projectKey].sort((a,b) => (a.order || 0) - (b.order || 0));
                const firstPhoto = projectPhotos[0];
                const displayTitle = firstPhoto.projectTitles?.[lang] || projectKey;
                const storyBlocks = getStoryForLang(firstPhoto);

                return (
                  <ProjectRow
                    key={projectKey}
                    projectTitle={displayTitle}
                    photos={projectPhotos}
                    onImageClick={onImageClick}
                    storyBlocks={storyBlocks}
                    readStoryLabel={uiText.readStory}
                    onStoryClick={() => setActiveStory({ title: displayTitle, blocks: storyBlocks })}
                  />
                );
              })}
            </div>
          </div>
        ))}
        {photos.length === 0 && <div className="text-center py-40 text-neutral-700 font-thin tracking-widest uppercase">Collection Empty</div>}
        <div className="text-center pt-20 border-t border-neutral-900">
          <p className="text-neutral-600 text-[10px] tracking-[0.3em] uppercase font-sans">© {new Date().getFullYear()} {profile.brandName}</p>
        </div>
      </div>

      <ProjectStoryModal
        isOpen={!!activeStory}
        onClose={() => setActiveStory(null)}
        projectTitle={activeStory?.title || ''}
        blocks={activeStory?.blocks || []}
      />
    </div>
  );
};

// --- 4. 后台管理组件 ---

// [FIXED] 修复 "dragged is not defined" 报错
const PhotosManager = ({ photos, onAddPhoto, onDeletePhoto, onBatchUpdate }) => {
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploadYear, setUploadYear] = useState(new Date().getFullYear().toString());
  
  // Multi-language Inputs
  const [uploadProjectEn, setUploadProjectEn] = useState("");
  const [uploadProjectCn, setUploadProjectCn] = useState("");
  const [uploadProjectTh, setUploadProjectTh] = useState("");

  const [localPhotos, setLocalPhotos] = useState(photos);
  // [关键修复] 补全 dragged 状态定义
  const [dragged, setDragged] = useState(null);
  // State for Edit Modal
  const [editingProjectData, setEditingProjectData] = useState(null);

  useEffect(() => { setLocalPhotos(photos); }, [photos]);

  const grouped = localPhotos.reduce((acc, p) => {
    const y = p.year ? String(p.year).trim() : "Unsorted";
    const proj = p.project ? String(p.project).trim() : "Uncategorized";
    if (!acc[y]) acc[y] = {};
    if (!acc[y][proj]) acc[y][proj] = [];
    acc[y][proj].push(p);
    return acc;
  }, {});

  const getSortedProjects = (year) => {
      const projs = Object.keys(grouped[year]);
      return projs.sort((a, b) => {
        const minA = Math.min(...grouped[year][a].map(p => p.order || 0));
        const minB = Math.min(...grouped[year][b].map(p => p.order || 0));
        return minA - minB;
      });
  };

  const handleBatchUpload = async () => {
    if (files.length === 0) return;
    if (!uploadProjectEn.trim()) return alert("Please enter Project Name (EN) as main ID.");
    setUploading(true);
    try {
      const promises = Array.from(files).map(async (file, idx) => {
        const timestamp = Date.now();
        const thumbFile = await compressImage(file, 400, 0.6); 
        let thumbUrl = "";
        if (thumbFile) thumbUrl = await uploadFileToStorage(thumbFile, `photos/${uploadYear}/${uploadProjectEn.trim()}/${timestamp}_${idx}_thumb.jpg`);
        
        const optimizedFile = await compressImage(file, 1920, 0.85);
        const url = await uploadFileToStorage(optimizedFile || file, `photos/${uploadYear}/${uploadProjectEn.trim()}/${timestamp}_${idx}`);
        
        return onAddPhoto({ 
            title: file.name.split('.')[0], 
            year: uploadYear.trim(), 
            project: uploadProjectEn.trim(), 
            projectTitles: {
                en: uploadProjectEn.trim(),
                cn: uploadProjectCn.trim(),
                th: uploadProjectTh.trim()
            },
            url, 
            thumbnailUrl: thumbUrl, 
            order: 9999, 
            isVisible: true 
        });
      });
      await Promise.all(promises);
      setFiles([]);
      setUploadProjectEn("");
      setUploadProjectCn("");
      setUploadProjectTh("");
      alert("Uploaded!");
    } catch(e) { alert(e.message); }
    setUploading(false);
  };

  const handleProjectUpload = async (e, year, project) => {
      const fs = e.target.files;
      if (!fs.length) return;
      setUploading(true);
      try {
        const promises = Array.from(fs).map(async (file, idx) => {
          const ts = Date.now();
          const thumb = await compressImage(file, 400, 0.6);
          let tUrl = "";
          if (thumb) tUrl = await uploadFileToStorage(thumb, `photos/${year}/${project}/${ts}_${idx}_thumb.jpg`);
          
          const optimizedFile = await compressImage(file, 1920, 0.85);
          const url = await uploadFileToStorage(optimizedFile || file, `photos/${year}/${project}/${ts}_${idx}`);
          return onAddPhoto({ title: file.name.split('.')[0], year, project, url, thumbnailUrl: tUrl, order: 9999, isVisible: true });
        });
        await Promise.all(promises);
        alert("Added!");
      } catch(e) { alert(e.message); }
      setUploading(false);
  };

  const handleDeleteProject = async (project, year) => {
      const toDelete = photos.filter(p => (p.year === year || (!p.year && year==='Unsorted')) && (p.project === project));
      if (confirm(`Delete project "${project}" (${toDelete.length} photos)?`)) {
         setUploading(true);
         await Promise.all(toDelete.map(p => onDeletePhoto(p.id)));
         setUploading(false);
      }
  };
  
  const openEditProject = (project, year) => {
     const projectPhotos = photos.filter(p => p.year === year && p.project === project);
     const firstPhoto = projectPhotos[0];
     const titles = firstPhoto?.projectTitles || { en: project, cn: '', th: '' };
     // Pull existing story (if any). We use the first photo as the source of truth —
     // the story is replicated across all photos in a project so they stay in sync.
     const existingStory = firstPhoto?.projectStory || { en: [], cn: [], th: [] };
     setEditingProjectData({
         oldYear: year,
         oldProject: project,
         en: titles.en || project,
         cn: titles.cn || '',
         th: titles.th || '',
         story: {
             en: Array.isArray(existingStory.en) ? existingStory.en : [],
             cn: Array.isArray(existingStory.cn) ? existingStory.cn : [],
             th: Array.isArray(existingStory.th) ? existingStory.th : [],
         }
     });
  };

  const handleSaveProjectEdit = async (newData) => {
      if(!editingProjectData) return;
      setUploading(true);
      const { oldYear, oldProject } = editingProjectData;
      const toUpdate = photos.filter(p => p.year === oldYear && p.project === oldProject);

      // newData shape: { en, cn, th, story: { en: [...], cn: [...], th: [...] } }
      const { story, ...titles } = newData;

      const updates = toUpdate.map(p => ({
          id: p.id,
          project: titles.en,
          projectTitles: titles,
          projectStory: story || { en: [], cn: [], th: [] }
      }));

      await onBatchUpdate(updates);
      setUploading(false);
      setEditingProjectData(null);
  };

  const moveProject = (year, proj, dir) => {
      const projs = getSortedProjects(year);
      const idx = projs.indexOf(proj);
      if (idx === -1) return;
      const newIdx = dir === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= projs.length) return;
      
      const newOrderProjs = [...projs];
      [newOrderProjs[idx], newOrderProjs[newIdx]] = [newOrderProjs[newIdx], newOrderProjs[idx]];
      
      let counter = 1;
      const newLocal = [...localPhotos];
      const otherYearPhotos = newLocal.filter(p => p.year !== year);
      const thisYearPhotos = [];

      newOrderProjs.forEach(pName => {
         const pPhotos = grouped[year][pName];
         pPhotos.sort((a,b) => (a.order||0)-(b.order||0));
         pPhotos.forEach(p => {
            thisYearPhotos.push({ ...p, order: counter++ });
         });
      });
      
      setLocalPhotos([...otherYearPhotos, ...thisYearPhotos]);
  };

  const handleSaveOrder = () => {
      onBatchUpdate(localPhotos.map((p, i) => ({ id: p.id, order: i + 1 })));
      alert("Order Saved");
  };

  const onDragStart = (e, p) => setDragged(p);
  const onDragEnter = (e, target) => {
      e.preventDefault();
      if (!dragged || dragged.id === target.id) return;
      if (dragged.project !== target.project || dragged.year !== target.year) return;

      const items = [...localPhotos];
      const f = items.findIndex(i => i.id === dragged.id);
      const t = items.findIndex(i => i.id === target.id);
      
      if (f < 0 || t < 0) return;
      const item = items.splice(f, 1)[0];
      items.splice(t, 0, item);
      setLocalPhotos(items);
  };

  return (
    <div className="space-y-12">
       <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl sticky top-0 z-20 shadow-xl">
         <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
           <div className="md:col-span-1">
             <input className="w-full bg-black border border-neutral-700 p-2 text-white rounded text-sm" value={uploadYear} onChange={e => setUploadYear(e.target.value)} placeholder="Year" />
           </div>
           <div className="md:col-span-1">
             <input className="w-full bg-black border border-neutral-700 p-2 text-white rounded text-sm" value={uploadProjectEn} onChange={e => setUploadProjectEn(e.target.value)} placeholder="Project Name (EN)" />
           </div>
           <div className="md:col-span-1">
             <input className="w-full bg-black border border-neutral-700 p-2 text-white rounded text-sm" value={uploadProjectCn} onChange={e => setUploadProjectCn(e.target.value)} placeholder="项目名称 (CN)" />
           </div>
           <div className="md:col-span-1">
             <input className="w-full bg-black border border-neutral-700 p-2 text-white rounded text-sm" value={uploadProjectTh} onChange={e => setUploadProjectTh(e.target.value)} placeholder="ชื่อโครงการ (TH)" />
           </div>
           <div className="md:col-span-1 relative border border-dashed border-neutral-600 bg-black rounded flex items-center justify-center cursor-pointer hover:border-white">
             <span className="text-xs text-neutral-400">{files.length ? `${files.length} files` : "Select Photos"}</span>
             <input type="file" multiple className="absolute inset-0 opacity-0" onChange={e => setFiles(e.target.files)} />
           </div>
         </div>
         <button onClick={handleBatchUpload} disabled={uploading} className="w-full bg-white text-black font-bold py-3 rounded hover:bg-neutral-200">{uploading ? "Uploading..." : "Create Project & Upload"}</button>
       </div>
       
       <div className="space-y-8 pb-24">
          <div className="flex justify-end"><button onClick={handleSaveOrder} className="bg-white text-black px-4 py-2 rounded font-bold text-sm">Save Order</button></div>
          {Object.keys(grouped).sort((a,b)=>b-a).map(year => (
             <div key={year}>
                <h4 className="text-neutral-500 font-serif text-2xl border-b border-neutral-800 pb-2 mb-4">{year}</h4>
                {getSortedProjects(year).map(proj => (
                   <div key={proj} className="bg-neutral-900/30 p-4 rounded-xl border border-neutral-800 mb-6">
                      <div className="flex justify-between mb-4">
                         <div className="flex items-center gap-2">
                            <span className="text-white font-bold">{proj}</span>
                            <button onClick={() => openEditProject(proj, year)} className="text-neutral-500 hover:text-white"><Edit size={14}/></button>
                            <button onClick={() => handleDeleteProject(proj, year)} className="text-red-500 hover:text-red-400"><Trash size={14}/></button>
                         </div>
                         <div className="flex gap-1">
                            <button onClick={() => moveProject(year, proj, 'up')} className="p-1 bg-neutral-800 rounded"><ArrowUp size={14}/></button>
                            <button onClick={() => moveProject(year, proj, 'down')} className="p-1 bg-neutral-800 rounded"><ArrowDown size={14}/></button>
                         </div>
                      </div>
                      <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                         {grouped[year][proj].map(p => (
                            <div 
                              key={p.id} 
                              draggable 
                              onDragStart={e => onDragStart(e, p)} 
                              onDragEnter={e => onDragEnter(e, p)} 
                              onDragOver={e => e.preventDefault()}
                              className={`aspect-square bg-black rounded relative group cursor-move ${dragged?.id === p.id ? 'opacity-50' : 'opacity-100'}`}
                            >
                               <img src={p.thumbnailUrl || p.url} className="w-full h-full object-cover" />
                               <div className="absolute top-1 left-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 text-neutral-400 pointer-events-none">
                                  <Menu size={14} />
                               </div>
                               <button onClick={() => { if(confirm("Delete?")) onDeletePhoto(p.id); }} className="absolute top-0 right-0 bg-red-500 text-white p-1 opacity-0 group-hover:opacity-100 z-10"><Trash size={10}/></button>
                            </div>
                         ))}
                         <div className="aspect-square border border-dashed border-neutral-700 flex items-center justify-center relative cursor-pointer hover:border-white">
                            <Plus className="text-neutral-500" />
                            <input type="file" multiple className="absolute inset-0 opacity-0" onChange={e => handleProjectUpload(e, year, proj)} />
                         </div>
                      </div>
                   </div>
                ))}
             </div>
          ))}
       </div>

       {/* Project Edit Modal */}
       <ProjectEditModal 
          isOpen={!!editingProjectData} 
          onClose={() => setEditingProjectData(null)}
          initialData={editingProjectData}
          onSave={handleSaveProjectEdit}
          storagePathPrefix={editingProjectData ? `stories/${editingProjectData.oldYear}` : 'stories'}
       />
    </div>
  );
};

const HomeSettings = ({ settings, onUpdate }) => {
  const [formData, setFormData] = useState(settings.profile || {});
  const [activeLangTab, setActiveLangTab] = useState('cn');
  const [slides, setSlides] = useState(settings.profile?.heroSlides || []);
  const [slideForm, setSlideForm] = useState({ title: '', link: '', url: '' });
  const [editingSlide, setEditingSlide] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [draggedSlide, setDraggedSlide] = useState(null);

  useEffect(() => { 
    if(settings.profile) {
        setFormData(settings.profile);
        setSlides(settings.profile.heroSlides || []);
    }
  }, [settings]);

  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
  const handleContentChange = (lang, field, value) => {
    setFormData(prev => {
      const newContent = { ...prev.content };
      if (!newContent[lang]) newContent[lang] = {};
      newContent[lang][field] = value;
      return { ...prev, content: newContent };
    });
  };
  const currentLangContent = formData.content?.[activeLangTab] || {};

  const handleFileUpload = async (e) => {
    if (!e.target.files[0]) return;
    setUploading(true);
    try {
      const file = await compressImage(e.target.files[0], 1920, 0.85); 
      const url = await uploadFileToStorage(file || e.target.files[0], `slides/slide_${Date.now()}`);
      setSlideForm(prev => ({ ...prev, url }));
    } catch (err) { alert(err.message); }
    setUploading(false);
  };

  const handleSaveSlide = () => {
    if (!slideForm.url) return alert("Please upload an image");
    let newSlides = [...slides];
    if (editingSlide !== null) {
      newSlides[editingSlide] = { ...slideForm, type: 'image' };
      setEditingSlide(null);
    } else {
      newSlides.push({ ...slideForm, type: 'image' });
    }
    setSlides(newSlides);
    setSlideForm({ title: '', link: '', url: '' });
    onUpdate({ ...settings, profile: { ...settings.profile, heroSlides: newSlides } });
  };

  const handleDeleteSlide = (idx) => {
    if (confirm("Delete slide?")) {
       const newSlides = slides.filter((_, i) => i !== idx);
       setSlides(newSlides);
       onUpdate({ ...settings, profile: { ...settings.profile, heroSlides: newSlides } });
    }
  };

  const onDragStart = (e, index) => setDraggedSlide(slides[index]);
  const onDragOver = (e, index) => {
    e.preventDefault();
    if (draggedSlide === slides[index]) return;
    const items = [...slides];
    const dIdx = items.indexOf(draggedSlide);
    items.splice(dIdx, 1);
    items.splice(index, 0, draggedSlide);
    setSlides(items);
  };
  const onDragEnd = () => {
    setDraggedSlide(null);
    onUpdate({ ...settings, profile: { ...settings.profile, heroSlides: slides } });
  };

  const handleSaveAll = () => {
    onUpdate({ ...settings, profile: { ...formData, heroSlides: slides } });
    alert('Home Page Settings Saved!');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
       {/* Slogan Settings */}
       <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800 space-y-6">
          <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
             <h3 className="text-lg font-bold text-white flex items-center gap-2"><Type className="w-5 h-5"/> Slogan Settings</h3>
             <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-400">Show Slogan?</span>
                    {/* CSS Toggle */}
                    <button 
                        onClick={() => handleChange('showSlogan', !formData.showSlogan)}
                        className={`w-12 h-6 rounded-full p-1 transition-colors flex items-center ${formData.showSlogan ? 'bg-green-500' : 'bg-neutral-600'}`}
                    >
                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${formData.showSlogan ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                 </div>
                 <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-400">Show Slide Title?</span>
                    <button 
                        onClick={() => handleChange('showSlideTitle', !formData.showSlideTitle)}
                        className={`w-12 h-6 rounded-full p-1 transition-colors flex items-center ${formData.showSlideTitle ? 'bg-green-500' : 'bg-neutral-600'}`}
                    >
                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${formData.showSlideTitle ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                 </div>
             </div>
          </div>

          <div className="space-y-4">
             <div className="flex gap-2 mb-2">
                {['cn', 'en', 'th'].map(l => <button key={l} onClick={() => setActiveLangTab(l)} className={`px-3 py-1 text-xs uppercase rounded ${activeLangTab===l?'bg-white text-black':'bg-neutral-800 text-neutral-400'}`}>{l}</button>)}
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs text-neutral-500 mb-1">Main Title</label>
                    <input className="w-full bg-black border border-neutral-700 rounded p-2 text-white" value={currentLangContent.title || ''} onChange={(e) => handleContentChange(activeLangTab, 'title', e.target.value)} />
                </div>
                <div>
                    <label className="block text-xs text-neutral-500 mb-1">Subtitle</label>
                    <input className="w-full bg-black border border-neutral-700 rounded p-2 text-white" value={currentLangContent.bio || ''} onChange={(e) => handleContentChange(activeLangTab, 'bio', e.target.value)} />
                </div>
             </div>
          </div>
       </div>

       {/* Hero Slides Settings */}
       <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800 space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2"><ImageIcon className="w-5 h-5"/> Hero Slides</h3>
          
          <div className="flex flex-col md:flex-row gap-6 p-4 bg-black/30 rounded-lg">
             <div className="w-full md:w-1/3 aspect-video bg-black border border-neutral-700 flex items-center justify-center relative overflow-hidden group rounded">
               {slideForm.url ? <img src={slideForm.url} className="w-full h-full object-cover" /> : <span className="text-xs text-neutral-500">Upload Image (2K)</span>}
               <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} />
               {uploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader2 className="animate-spin text-white" /></div>}
             </div>
             <div className="w-full md:w-2/3 space-y-3">
               <input className="w-full bg-black border border-neutral-700 rounded p-2 text-white" placeholder="Slide Title (Optional)" value={slideForm.title} onChange={e => setSlideForm({...slideForm, title: e.target.value})} />
               <input className="w-full bg-black border border-neutral-700 rounded p-2 text-white" placeholder="Link URL (Optional)" value={slideForm.link} onChange={e => setSlideForm({...slideForm, link: e.target.value})} />
               <div className="flex justify-end gap-2">
                 {editingSlide !== null && <button onClick={() => { setEditingSlide(null); setSlideForm({title:'',link:'',url:''}); }} className="px-4 py-2 text-neutral-400 hover:text-white">Cancel</button>}
                 <button onClick={handleSaveSlide} className="px-6 py-2 bg-white text-black font-bold rounded hover:bg-neutral-200">{editingSlide !== null ? 'Update Slide' : 'Add Slide'}</button>
               </div>
             </div>
          </div>

          <div className="space-y-2">
            {slides.map((s, i) => (
              <div key={i} draggable onDragStart={(e) => onDragStart(e, i)} onDragOver={(e) => onDragOver(e, i)} onDragEnd={onDragEnd} className="bg-neutral-800 p-3 rounded flex gap-4 items-center cursor-move group">
                 <Menu className="text-neutral-500" size={20} />
                 <img src={s.url} className="w-16 h-10 object-cover rounded bg-black" />
                 <div className="flex-grow text-sm text-white">{s.title || 'Untitled Slide'}</div>
                 <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={() => { setEditingSlide(i); setSlideForm(s); }} className="p-2 hover:bg-neutral-700 rounded text-white"><Edit size={14}/></button>
                   <button onClick={() => handleDeleteSlide(i)} className="p-2 hover:bg-red-900/50 rounded text-red-400"><Trash size={14}/></button>
                 </div>
              </div>
            ))}
          </div>
       </div>

       <button onClick={handleSaveAll} className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-neutral-200 transition-colors text-lg shadow-lg">Save All Home Settings</button>
    </div>
  );
};

const ProfileSettings = ({ settings, onUpdate }) => {
  const [formData, setFormData] = useState(settings.profile || {});
  const [activeLangTab, setActiveLangTab] = useState('cn');
  const [uploading, setUploading] = useState(false);

  useEffect(() => { if(settings.profile) setFormData(settings.profile); }, [settings.profile]);

  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
  const handleSocialChange = (field, value) => setFormData(prev => ({ ...prev, social: { ...(prev.social || {}), [field]: value } }));
  const handleContentChange = (lang, field, value) => setFormData(prev => ({ ...prev, content: { ...prev.content, [lang]: { ...prev.content[lang], [field]: value } } }));

  const handleImageUpload = async (e, field) => {
    if (!e.target.files[0]) return;
    setUploading(true);
    try {
      const url = await uploadFileToStorage(e.target.files[0], `profile/${field}_${Date.now()}`);
      handleChange(field, url);
    } catch(err) { alert(err.message); }
    setUploading(false);
  };

  const handleSave = () => { onUpdate({ ...settings, profile: formData }); alert('Profile saved!'); };
  
  const currentContent = formData.content?.[activeLangTab] || {};

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800 space-y-6">
         <h3 className="text-lg font-bold text-white flex items-center gap-2"><User className="w-5 h-5" /> Basic Info</h3>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-4">
                <div className="relative group cursor-pointer aspect-[3/4] bg-black rounded border border-neutral-700 overflow-hidden">
                    {formData.heroImage ? <img src={formData.heroImage} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-neutral-500 text-xs">Portrait</div>}
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleImageUpload(e, 'heroImage')} />
                    {uploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader2 className="animate-spin"/></div>}
                </div>
                <div className="flex gap-4">
                    <div className="w-1/2 relative group cursor-pointer aspect-square bg-black rounded border border-neutral-700 overflow-hidden flex items-center justify-center">
                        {formData.logoUrl ? <img src={formData.logoUrl} className="w-1/2 object-contain" /> : <span className="text-xs text-neutral-500">Logo</span>}
                        <input type="file" className="absolute inset-0 opacity-0" onChange={(e) => handleImageUpload(e, 'logoUrl')} />
                    </div>
                    <div className="w-1/2 relative group cursor-pointer aspect-square bg-black rounded border border-neutral-700 overflow-hidden flex items-center justify-center">
                        {formData.faviconUrl ? <img src={formData.faviconUrl} className="w-1/2 object-contain" /> : <span className="text-xs text-neutral-500">Favicon</span>}
                        <input type="file" className="absolute inset-0 opacity-0" onChange={(e) => handleImageUpload(e, 'faviconUrl')} />
                    </div>
                </div>
             </div>
             
             <div className="space-y-4">
                <div>
                    <label className="block text-xs text-neutral-500 mb-1">Brand Name</label>
                    <input className="w-full bg-black border border-neutral-700 rounded p-2 text-white" value={formData.brandName || ''} onChange={(e) => handleChange('brandName', e.target.value)} />
                </div>
                <div>
                    <label className="block text-xs text-neutral-500 mb-1">Email (Contact)</label>
                    <input className="w-full bg-black border border-neutral-700 rounded p-2 text-white" value={formData.email || ''} onChange={(e) => handleChange('email', e.target.value)} />
                </div>
                <div>
                    <label className="block text-xs text-neutral-500 mb-1">Location</label>
                    <input className="w-full bg-black border border-neutral-700 rounded p-2 text-white" value={formData.location || ''} onChange={(e) => handleChange('location', e.target.value)} />
                </div>
                <div>
                    <label className="block text-xs text-neutral-500 mb-1">Browser Title</label>
                    <input className="w-full bg-black border border-neutral-700 rounded p-2 text-white" value={formData.siteTitle || ''} onChange={(e) => handleChange('siteTitle', e.target.value)} />
                </div>
                {/* Security Section */}
                <div>
                    <label className="block text-xs text-neutral-500 mb-1 flex items-center gap-1"><Lock size={12}/> Admin Passcode</label>
                    <input className="w-full bg-black border border-neutral-700 rounded p-2 text-white" placeholder="Default: 8888" value={formData.adminPasscode || ''} onChange={(e) => handleChange('adminPasscode', e.target.value)} />
                </div>
             </div>
         </div>
      </div>

      <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800 space-y-4">
        <h3 className="text-lg font-bold text-white">Social Media</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <input className="bg-black p-2 rounded border border-neutral-700 w-full text-white text-sm" placeholder="IG URL" value={formData.social?.instagram || ''} onChange={(e) => handleSocialChange('instagram', e.target.value)} />
           <input className="bg-black p-2 rounded border border-neutral-700 w-full text-white text-sm" placeholder="TikTok URL" value={formData.social?.tiktok || ''} onChange={(e) => handleSocialChange('tiktok', e.target.value)} />
           <input className="bg-black p-2 rounded border border-neutral-700 w-full text-white text-sm" placeholder="Red Note (小红书) URL" value={formData.social?.rednote || ''} onChange={(e) => handleSocialChange('rednote', e.target.value)} />
           <input className="bg-black p-2 rounded border border-neutral-700 w-full text-white text-sm" placeholder="X URL" value={formData.social?.twitter || ''} onChange={(e) => handleSocialChange('twitter', e.target.value)} />
           <input className="bg-black p-2 rounded border border-neutral-700 w-full text-white text-sm" placeholder="YouTube URL" value={formData.social?.youtube || ''} onChange={(e) => handleSocialChange('youtube', e.target.value)} />
        </div>
      </div>

      <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800 space-y-4">
         <div className="flex justify-between">
            <h3 className="text-lg font-bold text-white">Biography Text</h3>
            <div className="flex gap-2">{['cn', 'en', 'th'].map(l => <button key={l} onClick={() => setActiveLangTab(l)} className={`px-2 text-xs uppercase ${activeLangTab===l?'text-white':'text-neutral-500'}`}>{l}</button>)}</div>
         </div>
         <textarea className="w-full bg-black border border-neutral-700 rounded p-2 text-white h-64" value={currentContent.aboutText || ''} onChange={(e) => handleContentChange(activeLangTab, 'aboutText', e.target.value)} />
      </div>
      <button onClick={handleSave} className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-neutral-200 transition-colors text-lg shadow-lg">Save Profile</button>
    </div>
  );
};

const AdminDashboard = ({ photos, settings, onLogout, onAddPhoto, onDeletePhoto, onUpdateSettings, onBatchUpdate }) => {
  const [tab, setTab] = useState("photos");
  return (
    <div className="h-screen overflow-hidden bg-neutral-900 text-neutral-200 font-sans flex flex-col">
      <div className="h-16 border-b border-neutral-800 flex items-center justify-between px-6 bg-neutral-950 flex-shrink-0">
         <h1 className="text-xl font-bold text-white flex items-center gap-2 font-serif"><Settings className="w-5 h-5" /> T8DAY CMS</h1>
         <button onClick={onLogout} className="flex items-center gap-2 text-red-500 hover:text-red-400 text-sm font-bold bg-neutral-900 px-4 py-2 rounded"><LogOut className="w-4 h-4" /> Logout</button>
      </div>
      
      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-neutral-800 p-4 md:p-6 flex flex-col bg-neutral-950 flex-shrink-0">
          <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible no-scrollbar">
            <button onClick={() => setTab("photos")} className={`flex-shrink-0 w-auto md:w-full text-left px-4 py-3 rounded transition-colors flex items-center gap-3 ${tab === "photos" ? "bg-white text-black font-bold" : "text-neutral-500 hover:text-white"}`}><Camera size={18}/> Photos</button>
            <button onClick={() => setTab("home")} className={`flex-shrink-0 w-auto md:w-full text-left px-4 py-3 rounded transition-colors flex items-center gap-3 ${tab === "home" ? "bg-white text-black font-bold" : "text-neutral-500 hover:text-white"}`}><Home size={18}/> Home Page</button>
            <button onClick={() => setTab("profile")} className={`flex-shrink-0 w-auto md:w-full text-left px-4 py-3 rounded transition-colors flex items-center gap-3 ${tab === "profile" ? "bg-white text-black font-bold" : "text-neutral-500 hover:text-white"}`}><User size={18}/> Profile</button>
          </div>
        </div>
        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          {tab === "photos" && <PhotosManager photos={photos} onAddPhoto={onAddPhoto} onDeletePhoto={onDeletePhoto} onBatchUpdate={onBatchUpdate} />}
          {tab === "home" && <HomeSettings settings={settings} onUpdate={onUpdateSettings} />}
          {tab === "profile" && <ProfileSettings settings={settings} onUpdate={onUpdateSettings} />}
        </div>
      </div>
    </div>
  );
};

const MainView = ({ photos, settings, onLoginClick, isOffline }) => {
  const getInitialState = () => {
    const path = window.location.pathname;
    if (path === '/about') return { view: 'home', showAbout: true };
    if (path === '/works') return { view: 'works', showAbout: false };
    return { view: 'home', showAbout: false };
  };

  const [state, setState] = useState(getInitialState);
  const { view, showAbout } = state;
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [initialLightboxIndex, setInitialLightboxIndex] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [lang, setLang] = useState("en");
  const [lightboxImages, setLightboxImages] = useState([]); 

  const rawProfile = settings?.profile || {};
  const profile = { ...DEFAULT_PROFILE, ...rawProfile, content: { cn: { ...DEFAULT_PROFILE.content.cn, ...(rawProfile.content?.cn || {}) }, en: { ...DEFAULT_PROFILE.content.en, ...(rawProfile.content?.en || {}) }, th: { ...DEFAULT_PROFILE.content.th, ...(rawProfile.content?.th || {}) } } };
  const slides = profile.heroSlides && profile.heroSlides.length > 0 ? profile.heroSlides : DEFAULT_SLIDES;
  const content = profile.content[lang];
  const ui = UI_TEXT[lang];
  const currentSlideTitle = slides[currentSlideIndex]?.title || profile.brandName;
  const visiblePhotos = photos.filter((p) => p.isVisible !== false);

  useEffect(() => {
    const handlePopState = () => {
      setState(getInitialState());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (visiblePhotos.length === 0) return;
    
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    if (pathParts.length >= 2 && pathParts[0] === 'works') {
      const projectSlug = pathParts[1]; 
      const imageIndexStr = pathParts[2] || "01"; 
      
      const targetPhotos = visiblePhotos.filter(p => {
        const pSlug = slugify(`${p.project} ${p.year}`);
        const pSlugSimple = slugify(p.project);
        return pSlug === projectSlug || pSlugSimple === projectSlug;
      });

      if (targetPhotos.length > 0) {
        targetPhotos.sort((a,b) => (a.order || 999) - (b.order || 999));
        
        const imageIndex = parseInt(imageIndexStr, 10) - 1; 
        const safeIndex = isNaN(imageIndex) ? 0 : Math.max(0, Math.min(imageIndex, targetPhotos.length - 1));
        
        setLightboxImages(targetPhotos);
        setInitialLightboxIndex(safeIndex);
        setLightboxOpen(true);
        setState({ view: 'works', showAbout: false });
      }
    }
  }, [visiblePhotos]);

  const navigate = (path, newView, newShowAbout) => {
    window.history.pushState({}, '', path);
    setState({ view: newView, showAbout: newShowAbout });
  };

  const handleNavClick = (target) => {
    setMobileMenuOpen(false);
    if (target === "home") {
      navigate('/', 'home', false);
    } else if (target === "works") {
      navigate('/works', 'works', false);
    } else if (target === "about") {
      navigate('/about', 'home', true);
    }
  };

  const handleCloseAbout = () => {
    navigate('/', 'home', false);
  };

  const handleLinkNavigation = (link) => {
    try {
      const url = new URL(link, window.location.origin);
      if (url.origin === window.location.origin) {
        window.history.pushState({}, '', url.pathname);
        
        const pathParts = url.pathname.split('/').filter(Boolean);
        if (pathParts[0] === 'works') {
           setState({ view: 'works', showAbout: false });
           const projectSlug = pathParts[1];
           if (projectSlug) {
             const targetPhotos = visiblePhotos.filter(p => {
                const pSlug = slugify(`${p.project} ${p.year}`);
                const pSlugSimple = slugify(p.project);
                return pSlug === projectSlug || pSlugSimple === projectSlug;
             });
             if (targetPhotos.length > 0) {
                targetPhotos.sort((a,b) => (a.order || 999) - (b.order || 999));
                const imageIndexStr = pathParts[2] || "01";
                const idx = parseInt(imageIndexStr, 10) - 1;
                const safeIndex = isNaN(idx) ? 0 : Math.max(0, Math.min(idx, targetPhotos.length - 1));
                setLightboxImages(targetPhotos);
                setInitialLightboxIndex(safeIndex);
                setLightboxOpen(true);
             }
           }
        } else if (pathParts[0] === 'about') {
           setState({ view: 'home', showAbout: true });
        } else {
           setState({ view: 'home', showAbout: false });
        }
      } else {
        window.location.href = link;
      }
    } catch (e) {
      window.location.href = link;
    }
  };

  const handleImageClick = (item, projectPhotos) => {
    const index = projectPhotos.findIndex((p) => p.id === item.id);
    if (index !== -1) { 
      setLightboxImages(projectPhotos);
      setInitialLightboxIndex(index); 
      setLightboxOpen(true);
      
      const slug = slugify(`${item.project} ${item.year}`);
      const newPath = `/works/${slug}/${(index + 1).toString().padStart(2, '0')}`;
      window.history.pushState({}, '', newPath);
    }
  };

  const handleLightboxIndexChange = (newIndex) => {
    if (lightboxImages.length > 0) {
      const item = lightboxImages[newIndex];
      const slug = slugify(`${item.project} ${item.year}`);
      const newPath = `/works/${slug}/${(newIndex + 1).toString().padStart(2, '0')}`;
      window.history.replaceState({}, '', newPath);
    }
  };

  const handleLightboxClose = () => {
    setLightboxOpen(false);
    window.history.pushState({}, '', '/works');
  };

  return (
    <div className="bg-neutral-950 text-neutral-200 font-sans selection:bg-white selection:text-black relative">
      <MetaUpdater profile={settings.profile} />
      <div className="noise-bg"></div>
      <GlobalNav profile={profile} ui={ui} onNavClick={handleNavClick} lang={lang} setLang={setLang} mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} onLoginClick={onLoginClick} />
      {view === "home" && !showAbout && (
        <div className="relative h-[100dvh] w-full overflow-hidden">
          <HeroSlideshow slides={slides} onIndexChange={setCurrentSlideIndex} onLinkClick={handleLinkNavigation} />
          
          {/* 品牌展示层：左下角电影风格布局 */}
          <div className="absolute inset-0 pointer-events-none z-10">
            {/* 左侧竖排标签 */}
            <div className="absolute left-6 md:left-10 top-1/2 -translate-y-1/2 flex flex-col items-center gap-3"
              style={{ animation: 'heroTagIn 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.8s both' }}>
              <div style={{ writingMode: 'vertical-rl', letterSpacing: '0.3em', fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-body)', textTransform: 'uppercase', fontWeight: 600 }}>
                PHOTOGRAPHY
              </div>
              <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.15)' }} />
              <div style={{ writingMode: 'vertical-rl', letterSpacing: '0.3em', fontSize: 9, color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-body)', textTransform: 'uppercase' }}>
                {profile.location || 'BANGKOK'}
              </div>
            </div>

            {/* 主品牌文字 — 左下 */}
            <div className="absolute bottom-0 left-0 px-6 md:px-12 pb-14 md:pb-20 max-w-3xl w-full">
              {profile.showSlogan && (
                <div className="flex items-center gap-3 mb-5"
                  style={{ animation: 'heroTagIn 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.5s both' }}>
                  <div style={{ width: 24, height: 1, background: 'rgba(255,255,255,0.35)' }} />
                  <span style={{ fontSize: 9, letterSpacing: '0.45em', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-body)', textTransform: 'uppercase', fontWeight: 700 }}>
                    {content.title}
                  </span>
                </div>
              )}

              {profile.showSlideTitle && (
                <div className="hero-brand-line mb-4">
                  <h1
                    className="text-4xl sm:text-5xl md:text-7xl font-thin text-white tracking-wide leading-none font-serif"
                    style={{
                      display: 'inline-block',
                      animation: 'heroTextReveal 1.4s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both',
                    }}>
                    {slides[currentSlideIndex]?.title || profile.brandName}
                  </h1>
                </div>
              )}

              {profile.showSlogan && (
                <div style={{ animation: 'heroTagIn 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.9s both' }}>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontFamily: 'var(--font-body)', fontWeight: 300, letterSpacing: '0.08em', borderLeft: '1px solid rgba(255,255,255,0.12)', paddingLeft: 12, maxWidth: 320, lineHeight: 1.7 }}>
                    {content.bio}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {view === "works" && !showAbout && <WorksPage photos={visiblePhotos} profile={profile} ui={ui} onImageClick={handleImageClick} lang={lang} />}
      {showAbout && <AboutPage profile={profile} lang={lang} onClose={() => navigate('/', 'home', false)} />}
      {lightboxOpen && <ImmersiveLightbox initialIndex={initialLightboxIndex} images={lightboxImages} onClose={handleLightboxClose} onIndexChange={handleLightboxIndexChange} lang={lang} />}
    </div>
  );
};

class ErrorBoundaryWrapper extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
          <AlertCircle size={48} className="text-red-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
          <p className="text-neutral-500 mb-4">{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()} className="bg-white text-black px-4 py-2 rounded">Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const AppContent = () => {
  const [user, setUser] = useState(null);
  const [viewMode, setViewMode] = useState("public");
  const [photos, setPhotos] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsLoading(prev => {
        if (prev) {
          console.warn("Loading timed out, switching to offline mode");
          setIsOffline(true);
          // Even if timed out, keep existing data if any
          return false;
        }
        return prev;
      });
    }, 8000); // Extended timeout for mobile

    const initAuth = async () => {
      if (!auth) return; 
      try { 
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) { 
          await signInWithCustomToken(auth, __initial_auth_token); 
        } else { 
          await signInAnonymously(auth); 
        } 
      } catch (e) { 
          console.error("Auth Failed", e); 
          // Don't block app if auth fails (e.g. domain restriction)
      }
    };
    initAuth();
    
    const unsubAuth = auth ? onAuthStateChanged(auth, setUser) : () => {};
    return () => { clearTimeout(timeout); unsubAuth(); };
  }, []);

  useEffect(() => {
    // Removed strict user check to allow loading public data even if auth is pending/failed
    // assuming Firestore rules allow public read
    if (!db) return;
    
    const unsubPhotos = onSnapshot(getPublicCollection("photos"), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      
      data.sort((a, b) => {
          const orderA = typeof a.order === 'number' ? a.order : 9999;
          const orderB = typeof b.order === 'number' ? b.order : 9999;
          return orderA - orderB;
      });

      setPhotos(data);
      setIsLoading(false);
    }, (err) => { 
      console.error("Data Load Error", err); 
      // If permission denied (e.g. auth failed), we still stop loading
      // The UI will show empty state or default config
      setIsOffline(true); 
      setIsLoading(false); 
    });
    
    const unsubSettings = onSnapshot(getPublicDoc("settings", "global"), (snap) => { 
      if (snap.exists()) setSettings({ ...DEFAULT_SETTINGS, ...snap.data() }); 
    });
    
    return () => { unsubPhotos(); unsubSettings(); };
  }, [user]); // Re-subscribe if user status changes (e.g. becomes admin)

  const handleLoginAttempt = (pass) => { 
    const correctPass = settings.profile?.adminPasscode || APP_CONFIG.adminPasscode;
    if (pass === correctPass) { 
        setShowLogin(false); 
        setViewMode("admin"); 
    } else { 
        alert("Wrong Passcode"); 
    } 
  };
  const handleAddPhoto = async (d) => await addDoc(getPublicCollection("photos"), { ...d, createdAt: serverTimestamp() });
  const handleDeletePhoto = async (id) => await deleteDoc(getPublicDoc("photos", id));
  const handleUpdateSettings = async (s) => await setDoc(getPublicDoc("settings", "global"), s, { merge: true });
  
  const handleBatchUpdate = async (updates) => {
    try {
      const promises = updates.map(u => {
        const { id, ...data } = u;
        return updateDoc(getPublicDoc("photos", id), data);
      });
      await Promise.all(promises);
    } catch(e) {
      console.error("Batch update failed:", e);
      alert("Update failed: " + e.message);
    }
  };

  if (isLoading && photos.length === 0 && !isOffline) return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-neutral-500">
      <Loader2 className="w-8 h-8 animate-spin mb-4 text-white" />
      <p className="tracking-[0.2em] text-xs uppercase font-bold font-serif mb-8">Loading T8DAY...</p>
      <button 
        onClick={() => { setIsOffline(true); setIsLoading(false); }}
        className="px-4 py-2 border border-neutral-700 rounded text-xs uppercase hover:bg-neutral-800 transition-colors"
      >
        Launch Demo Mode
      </button>
    </div>
  );

  return (
    <>
      {viewMode === "public" ? <MainView photos={photos} settings={settings} onLoginClick={() => setShowLogin(true)} isOffline={isOffline} /> : <AdminDashboard photos={photos} settings={settings} onLogout={() => setViewMode("public")} onAddPhoto={handleAddPhoto} onDeletePhoto={handleDeletePhoto} onUpdateSettings={handleUpdateSettings} onBatchUpdate={handleBatchUpdate} />}
      <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} onLogin={handleLoginAttempt} />
    </>
  );
};

export default function App() {
  return (
    <ErrorBoundaryWrapper>
      <AppContent />
    </ErrorBoundaryWrapper>
  );
}
