import React, { useState, useEffect, useRef } from 'react';
import { Users, GraduationCap, Copy, Check, Send, ArrowLeft, Sparkles, RefreshCw, QrCode, Wifi, WifiOff, Plus, Key, Eye, EyeOff, ShieldCheck, ShieldAlert, Zap } from 'lucide-react';

const QUESTION = '이번 수업을 신청하게 된 이유는 무엇인가요?';
const SUBTITLE = '무엇을 보고 이 프로그램을 신청하셨나요?';
const NTFY_BASE = 'https://ntfy.sh';
const GEMINI_MODEL = 'gemini-2.5-flash-lite';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const QUEUE_INTERVAL_MS = 2000; // 텍스트 호출은 훨씬 여유롭게 가능

// 파스텔 배경 팔레트 (종이·문구점 감성)
const VIBE_COLORS = [
  { bg: '#FFE8D6', border: '#E9967A' }, // peach
  { bg: '#E8F0D6', border: '#8FA865' }, // sage
  { bg: '#D6E8F0', border: '#6B94B8' }, // sky
  { bg: '#F0D6E8', border: '#B86B94' }, // rose
  { bg: '#F5E8D6', border: '#B8946B' }, // sand
  { bg: '#E0D6F0', border: '#8B6BB8' }, // lavender
  { bg: '#D6F0E8', border: '#6BB894' }, // mint
  { bg: '#F0E8D6', border: '#B8A36B' }, // butter
];

// 폴백용 키워드 → 이모지 사전 (API 실패 시 사용)
const KEYWORD_EMOJI = [
  { kws: ['친구', '추천', '소개'], e: '🤝👥' },
  { kws: ['ai', 'AI', '인공지능', '에이아이'], e: '🤖✨' },
  { kws: ['로봇'], e: '🤖⚙️' },
  { kws: ['게임', '놀이'], e: '🎮🕹️' },
  { kws: ['포스터', '광고', '홍보'], e: '📋✨' },
  { kws: ['재미', '재밌', '흥미'], e: '😄🎉' },
  { kws: ['미래', '꿈', '진로'], e: '🚀🌟' },
  { kws: ['과학', '실험', '탐구'], e: '🔬🧪' },
  { kws: ['그림', '디자인', '예술'], e: '🎨🖌️' },
  { kws: ['코딩', '프로그래밍', '컴퓨터'], e: '💻⌨️' },
  { kws: ['선생님', '강의', '수업'], e: '👩‍🏫📚' },
  { kws: ['엄마', '아빠', '부모'], e: '👨‍👩‍👧💝' },
  { kws: ['학교', '교실'], e: '🏫📝' },
  { kws: ['책', '독서'], e: '📚📖' },
  { kws: ['음악', '노래'], e: '🎵🎧' },
  { kws: ['스포츠', '운동'], e: '⚽🏃' },
  { kws: ['자연', '숲', '나무', '꽃'], e: '🌳🌸' },
  { kws: ['우주', '별', '행성'], e: '🌌🪐' },
  { kws: ['동물', '강아지', '고양이'], e: '🐶🐱' },
  { kws: ['음식', '맛있', '요리'], e: '🍜🍰' },
  { kws: ['여행', '모험'], e: '✈️🗺️' },
  { kws: ['만들', '제작', '공작'], e: '🛠️✨' },
  { kws: ['영상', '유튜브', '동영상'], e: '📺🎬' },
  { kws: ['호기심', '궁금'], e: '🤔💭' },
  { kws: ['좋', '최고'], e: '👍✨' },
];

const DEFAULT_EMOJI = '💬✨';

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Gaegu:wght@300;400;700&family=Caveat:wght@400;600;700&family=Gowun+Dodum&family=Nanum+Pen+Script&display=swap');

:root {
  --paper: #FAF5EB;
  --paper-2: #F3EBD9;
  --paper-3: #E8DFC8;
  --ink: #221E18;
  --ink-2: #6A5F4E;
  --accent: #C84D30;
  --blue: #3B6B8C;
  --green: #5E7547;
  --yellow: #E8B847;
}

.font-hand { font-family: 'Gaegu', 'Nanum Pen Script', cursive; }
.font-display { font-family: 'Gaegu', 'Caveat', cursive; font-weight: 700; letter-spacing: -0.01em; }
.font-body { font-family: 'Gowun Dodum', 'Gaegu', sans-serif; }
.font-caveat { font-family: 'Caveat', cursive; }
.font-mono-code { font-family: 'Courier New', monospace; letter-spacing: 0.05em; }
.font-emoji { font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'EmojiOne Color', sans-serif; }

.bg-paper { background-color: var(--paper); }
.bg-paper-2 { background-color: var(--paper-2); }
.bg-paper-3 { background-color: var(--paper-3); }
.bg-ink { background-color: var(--ink); }
.bg-accent { background-color: var(--accent); }
.bg-blue-ink { background-color: var(--blue); }
.bg-green-ink { background-color: var(--green); }
.bg-yellow-ink { background-color: var(--yellow); }
.text-ink { color: var(--ink); }
.text-ink-2 { color: var(--ink-2); }
.text-accent { color: var(--accent); }
.text-paper { color: var(--paper); }
.text-blue-ink { color: var(--blue); }
.text-green-ink { color: var(--green); }
.border-ink { border-color: var(--ink); }
.border-accent { border-color: var(--accent); }
.border-blue-ink { border-color: var(--blue); }
.border-green-ink { border-color: var(--green); }

.paper-bg {
  background-color: var(--paper);
  background-image:
    radial-gradient(circle at 15% 25%, rgba(200, 77, 48, 0.04) 0%, transparent 45%),
    radial-gradient(circle at 85% 75%, rgba(59, 107, 140, 0.035) 0%, transparent 45%),
    radial-gradient(circle at 50% 50%, rgba(232, 184, 71, 0.025) 0%, transparent 60%);
}

.paper-grain {
  background-image:
    repeating-linear-gradient(0deg, rgba(34, 30, 24, 0.012) 0px, transparent 1px, transparent 2px, rgba(34, 30, 24, 0.012) 3px),
    repeating-linear-gradient(90deg, rgba(34, 30, 24, 0.012) 0px, transparent 1px, transparent 2px, rgba(34, 30, 24, 0.012) 3px);
}

.card-paper {
  background-color: #FEFCF7;
  box-shadow:
    0 1px 2px rgba(34, 30, 24, 0.08),
    0 8px 20px rgba(34, 30, 24, 0.12),
    inset 0 0 0 1px rgba(34, 30, 24, 0.04);
}

.btn-ink {
  background-color: var(--ink);
  color: var(--paper);
  transition: all 0.2s ease;
  box-shadow: 3px 3px 0 var(--accent);
}
.btn-ink:hover:not(:disabled) { transform: translate(-1px, -1px); box-shadow: 4px 4px 0 var(--accent); }
.btn-ink:active:not(:disabled) { transform: translate(2px, 2px); box-shadow: 1px 1px 0 var(--accent); }
.btn-ink:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-paper {
  background-color: #FEFCF7;
  color: var(--ink);
  border: 2px solid var(--ink);
  transition: all 0.2s ease;
  box-shadow: 3px 3px 0 var(--ink);
}
.btn-paper:hover:not(:disabled) { transform: translate(-1px, -1px); box-shadow: 4px 4px 0 var(--ink); }
.btn-paper:active:not(:disabled) { transform: translate(2px, 2px); box-shadow: 1px 1px 0 var(--ink); }
.btn-paper:disabled { opacity: 0.5; cursor: not-allowed; }

@keyframes pop-in {
  0% { opacity: 0; transform: scale(0.6) translateY(25px) rotate(var(--final-rot, 0deg)); }
  60% { opacity: 1; transform: scale(1.08) translateY(-6px) rotate(var(--final-rot, 0deg)); }
  100% { opacity: 1; transform: scale(1) translateY(0) rotate(var(--final-rot, 0deg)); }
}
.animate-pop-in { animation: pop-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both; }

@keyframes emoji-bounce {
  0% { opacity: 0; transform: scale(0.3) rotate(-15deg); }
  60% { opacity: 1; transform: scale(1.15) rotate(3deg); }
  100% { opacity: 1; transform: scale(1) rotate(0deg); }
}
.animate-emoji { animation: emoji-bounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both; }

@keyframes gentle-float {
  0%, 100% { transform: translateY(0) rotate(var(--final-rot, 0deg)); }
  50% { transform: translateY(-3px) rotate(calc(var(--final-rot, 0deg) + 0.3deg)); }
}
.hover-float:hover { animation: gentle-float 2s ease-in-out infinite; }

@keyframes draw-line { to { stroke-dashoffset: 0; } }
.draw-line path { stroke-dasharray: 300; stroke-dashoffset: 300; animation: draw-line 1.2s ease-out forwards; }

@keyframes spin-slow { to { transform: rotate(360deg); } }
.spin-slow { animation: spin-slow 2s linear infinite; }

.tape {
  position: absolute;
  width: 60px;
  height: 18px;
  background: rgba(232, 184, 71, 0.55);
  top: -8px;
  left: 50%;
  margin-left: -30px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

input::placeholder, textarea::placeholder { color: var(--ink-2); opacity: 0.6; }
`;

// ============ UTILITIES ============
function generateRoomCode() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let code = 'sk-';
  for (let i = 0; i < 14; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function getRoomFromHash() {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.slice(1);
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  return params.get('room');
}

function setRoomInHash(room) {
  if (typeof window === 'undefined') return;
  if (room) window.location.hash = `room=${room}`;
  else history.replaceState(null, '', window.location.pathname + window.location.search);
}

function buildShareUrl(room) {
  if (typeof window === 'undefined') return '';
  const base = window.location.origin + window.location.pathname + window.location.search;
  return `${base}#room=${room}`;
}

async function publishAnswer(room, answer) {
  const response = await fetch(`${NTFY_BASE}/${encodeURIComponent(room)}`, {
    method: 'POST',
    body: JSON.stringify(answer),
    headers: { 'Title': 'answer', 'X-Tags': 'sketch' },
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`서버 오류 (${response.status}) ${text ? '- ' + text : ''}`);
  }
}

// 답변 텍스트의 해시로 결정적인 색상 팔레트 선택
function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function pickColor(text) {
  return VIBE_COLORS[hashString(text) % VIBE_COLORS.length];
}

// 키워드 폴백: API 없이도 동작
function fallbackEmoji(text) {
  const lower = text.toLowerCase();
  for (const { kws, e } of KEYWORD_EMOJI) {
    if (kws.some(k => lower.includes(k.toLowerCase()))) return e;
  }
  return DEFAULT_EMOJI;
}

// Gemini 텍스트 API로 이모지 추출
async function extractEmojisWithGemini(apiKey, text) {
  const prompt = `다음 설문 답변을 시각적으로 표현할 이모지 2~3개를 골라주세요.
답변: "${text}"

규칙:
- 답변의 핵심 의미/감정/대상을 잘 담은 이모지여야 합니다
- 이모지만 연속으로 2~3개 출력 (공백/쉼표/설명/따옴표 없이)
- 반드시 다음 형식의 JSON만 출력: {"emojis":"🤖✨"}`;

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.9, maxOutputTokens: 60, responseMimeType: 'application/json' },
    }),
  });

  if (!response.ok) {
    let errDetail = '';
    try { const j = await response.json(); errDetail = j?.error?.message || ''; }
    catch (e) { errDetail = await response.text().catch(() => ''); }
    if (response.status === 429) throw new Error(`할당량 초과 (429) — 자동 재시도`);
    if (response.status === 403) throw new Error(`API 키 권한 오류 (403): ${errDetail.slice(0, 100)}`);
    throw new Error(`Gemini API 오류 (${response.status}): ${errDetail.slice(0, 100)}`);
  }

  const data = await response.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  // JSON 파싱 (responseMimeType 덕분에 대부분 순수 JSON)
  try {
    const parsed = JSON.parse(raw.trim());
    if (parsed.emojis && typeof parsed.emojis === 'string') return parsed.emojis.trim();
  } catch (e) {
    // 혹시 markdown이 섞인 경우 추출
    const m = raw.match(/\{[^}]*"emojis"\s*:\s*"([^"]+)"[^}]*\}/);
    if (m) return m[1];
    // 최후: 이모지만 추출
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F000}-\u{1F02F}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
    const emojis = (raw.match(emojiRegex) || []).slice(0, 3).join('');
    if (emojis) return emojis;
  }
  throw new Error('이모지 파싱 실패');
}

async function testGeminiKey(apiKey) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
    { method: 'GET' }
  );
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.error?.message || `키 검증 실패 (${response.status})`);
  }
  const data = await response.json();
  return Array.isArray(data?.models) && data.models.length > 0;
}

const RoughUnderline = ({ color = 'var(--accent)' }) => (
  <svg className="draw-line" viewBox="0 0 300 12" preserveAspectRatio="none" style={{ width: '100%', height: '12px' }}>
    <path d="M 5 7 Q 40 2, 80 6 T 160 5 Q 200 8, 240 4 T 295 6" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" />
  </svg>
);

// ============ MAIN ============
export default function SketchSurvey() {
  const [mode, setMode] = useState('landing');
  const [room, setRoom] = useState(() => getRoomFromHash());
  const [answers, setAnswers] = useState([]);
  const [studentText, setStudentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('idle');

  const [apiKey, setApiKey] = useState('');
  const [keyStatus, setKeyStatus] = useState('unset');
  const [keyError, setKeyError] = useState('');
  const [skipKey, setSkipKey] = useState(false); // 폴백 모드 선택

  const queueRef = useRef([]);
  const lastCallRef = useRef(0);
  const processingRef = useRef(false);
  const apiKeyRef = useRef('');
  const skipKeyRef = useRef(false);

  useEffect(() => { apiKeyRef.current = apiKey; }, [apiKey]);
  useEffect(() => { skipKeyRef.current = skipKey; }, [skipKey]);

  useEffect(() => {
    const s = document.createElement('style');
    s.textContent = STYLES;
    document.head.appendChild(s);
    document.body.style.margin = '0';
    document.body.style.fontFamily = "'Gowun Dodum', sans-serif";
    return () => { try { document.head.removeChild(s); } catch(e){} };
  }, []);

  useEffect(() => {
    const handler = () => setRoom(getRoomFromHash());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  function processQueue() {
    if (processingRef.current) return;
    processingRef.current = true;

    const tick = async () => {
      if (queueRef.current.length === 0) { processingRef.current = false; return; }
      const now = Date.now();
      const wait = Math.max(0, lastCallRef.current + QUEUE_INTERVAL_MS - now);
      if (wait > 0) { setTimeout(tick, wait); return; }
      const task = queueRef.current.shift();
      lastCallRef.current = Date.now();

      let emojis = null;
      let usedFallback = false;

      if (apiKeyRef.current && !skipKeyRef.current) {
        try {
          emojis = await extractEmojisWithGemini(apiKeyRef.current, task.text);
        } catch (err) {
          const msg = (err && err.message) || '';
          // 429는 한 번 재시도 (맨 뒤로), 그 외는 바로 폴백
          const retries = task.retries || 0;
          if (msg.includes('429') && retries < 1) {
            queueRef.current.push({ ...task, retries: retries + 1 });
            setAnswers(prev => prev.map(a => a.id === task.id
              ? { ...a, status: 'pending', statusMsg: '할당량 대기 중...' } : a));
            setTimeout(tick, 0);
            return;
          }
          // 폴백으로 전환
          emojis = fallbackEmoji(task.text);
          usedFallback = true;
        }
      } else {
        emojis = fallbackEmoji(task.text);
        usedFallback = true;
      }

      setAnswers(prev => prev.map(a => a.id === task.id
        ? { ...a, status: 'ready', emojis, usedFallback, statusMsg: '' } : a));
      setTimeout(tick, 0);
    };
    tick();
  }

  function enqueueTask(answer) {
    queueRef.current.push({ id: answer.id, text: answer.text });
    processQueue();
  }

  function retryOne(id, text) {
    setAnswers(prev => prev.map(a => a.id === id
      ? { ...a, status: 'pending', statusMsg: '다시 시도 중...' } : a));
    queueRef.current.push({ id, text, retries: 0 });
    processQueue();
  }

  useEffect(() => {
    if (mode !== 'teacher' || !room) return;

    setConnectionStatus('connecting');
    setAnswers([]);
    queueRef.current = [];
    const url = `${NTFY_BASE}/${encodeURIComponent(room)}/sse?since=all`;
    let es;
    try { es = new EventSource(url); }
    catch (e) { setConnectionStatus('error'); return; }

    const seen = new Set();

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.event === 'open') { setConnectionStatus('connected'); return; }
        if (data.event !== 'message' || !data.message) return;
        const answer = JSON.parse(data.message);
        if (!answer || !answer.id || seen.has(answer.id)) return;
        seen.add(answer.id);

        const enriched = { ...answer, status: 'pending', emojis: null, statusMsg: '생각 중...' };
        setAnswers(prev => {
          if (prev.some(a => a.id === answer.id)) return prev;
          return [...prev, enriched].sort((a, b) => a.timestamp - b.timestamp);
        });
        enqueueTask(answer);
      } catch (err) {}
    };
    es.onerror = () => setConnectionStatus('connecting');

    return () => { try { es.close(); } catch(e){} };
  }, [mode, room]);

  useEffect(() => {
    if (mode === 'teacher' && !room) {
      const newCode = generateRoomCode();
      setRoomInHash(newCode);
      setRoom(newCode);
    }
  }, [mode, room]);

  async function handleTestKey(key) {
    setKeyStatus('testing');
    setKeyError('');
    try {
      await testGeminiKey(key);
      setApiKey(key);
      setKeyStatus('valid');
      setSkipKey(false);
    } catch (err) {
      setKeyStatus('invalid');
      setKeyError(err.message || '키가 유효하지 않습니다');
    }
  }

  function useFallbackMode() {
    setSkipKey(true);
    setKeyStatus('skipped');
  }

  function resetKey() {
    setApiKey('');
    setKeyStatus('unset');
    setKeyError('');
    setSkipKey(false);
  }

  async function handleSubmit() {
    const t = studentText.trim();
    if (!t || submitting || !room) return;
    setSubmitting(true);
    setErrorMsg('');

    const id = Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    const rotation = (Math.random() * 7) - 3.5;
    const answer = { id, text: t, timestamp: Date.now(), rotation };

    try {
      await publishAnswer(room, answer);
      setSubmitted(true);
      setStudentText('');
    } catch (e) {
      setErrorMsg((e && (e.message || e.toString())) || '알 수 없는 오류');
    }
    setSubmitting(false);
  }

  function newRoom() {
    if (!window.confirm('새 방을 만들면 모든 답변이 사라지고 새 참여 링크가 생성됩니다. 계속하시겠어요?')) return;
    const code = generateRoomCode();
    setRoomInHash(code);
    setRoom(code);
    setAnswers([]);
    queueRef.current = [];
  }

  function copyLink() {
    const url = buildShareUrl(room);
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => window.prompt('링크를 복사하세요:', url));
  }

  // ========== LANDING ==========
  if (mode === 'landing') {
    return (
      <div className="min-h-screen paper-bg paper-grain flex items-center justify-center p-6">
        <div className="max-w-3xl w-full">
          <div className="text-center mb-10">
            <div className="inline-block text-accent font-caveat text-3xl mb-2 transform -rotate-2">~ 스티커 설문 ~</div>
            <h1 className="font-display text-ink text-6xl md:text-7xl mb-2 leading-none">
              답변이 모이는<br/><span className="text-accent">우리 반 스티커 보드</span>
            </h1>
            <div className="max-w-sm mx-auto"><RoughUnderline /></div>
            <p className="font-body text-ink-2 text-lg mt-5">
              답변이 워드클라우드 대신 <span className="font-hand text-ink font-bold text-xl">스티커 카드</span>로 쌓입니다
            </p>
            {room && (
              <div className="mt-4 inline-block px-4 py-2 bg-paper-2 border-2 border-ink" style={{ borderRadius: '4px' }}>
                <span className="font-hand text-ink text-base">참여 중인 방: </span>
                <span className="font-mono-code text-accent text-base font-bold">{room.slice(-8)}</span>
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <button onClick={() => setMode('teacher')}
              className="card-paper p-8 text-left border-2 border-ink transition-all hover:-translate-y-1 hover:shadow-2xl"
              style={{ borderRadius: '4px' }}>
              <div className="flex items-start justify-between mb-4">
                <div className="bg-ink text-paper p-3" style={{ borderRadius: '4px' }}>
                  <GraduationCap size={28} strokeWidth={2} />
                </div>
                <span className="font-caveat text-accent text-2xl transform rotate-3">projector!</span>
              </div>
              <h2 className="font-display text-3xl text-ink mb-2">교사 화면</h2>
              <p className="font-body text-ink-2 text-sm leading-relaxed">
                수업 중 프로젝터·큰 화면에 띄우세요.<br/>
                학생 답변이 실시간 스티커로 쌓입니다.
              </p>
            </button>

            <button onClick={() => room ? setMode('student') : null} disabled={!room}
              className={`card-paper p-8 text-left border-2 border-ink transition-all ${room ? 'hover:-translate-y-1 hover:shadow-2xl' : 'opacity-60 cursor-not-allowed'}`}
              style={{ borderRadius: '4px' }}>
              <div className="flex items-start justify-between mb-4">
                <div className="bg-accent text-paper p-3" style={{ borderRadius: '4px' }}>
                  <Users size={28} strokeWidth={2} />
                </div>
                <span className="font-caveat text-blue-ink text-2xl transform -rotate-2">on phone!</span>
              </div>
              <h2 className="font-display text-3xl text-ink mb-2">학생 참여</h2>
              <p className="font-body text-ink-2 text-sm leading-relaxed">
                {room
                  ? <>각자 휴대폰·노트북으로 접속해서<br/>답변을 제출하는 화면입니다.</>
                  : <><span className="text-accent font-bold">선생님이 공유한 링크</span>로 접속하셔야<br/>참여하실 수 있습니다.</>}
              </p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ========== STUDENT ==========
  if (mode === 'student') {
    if (!room) {
      return (
        <div className="min-h-screen paper-bg paper-grain flex items-center justify-center p-6">
          <div className="max-w-md card-paper p-8 border-2 border-ink text-center" style={{ borderRadius: '4px' }}>
            <div className="text-4xl mb-3">🔗</div>
            <h2 className="font-display text-2xl text-ink mb-2">참여 링크가 필요해요</h2>
            <p className="font-body text-ink-2 text-sm mb-5">선생님이 공유한 링크나 QR 코드로 접속해 주세요.</p>
            <button onClick={() => setMode('landing')} className="btn-paper px-5 py-2 font-hand" style={{ borderRadius: '4px' }}>처음으로</button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen paper-bg paper-grain flex items-start md:items-center justify-center p-4 md:p-6">
        <div className="max-w-lg w-full">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => { setMode('landing'); setSubmitted(false); setErrorMsg(''); }}
              className="font-hand text-ink-2 flex items-center gap-1 hover:text-ink text-lg">
              <ArrowLeft size={18} /> 처음으로
            </button>
            <div className="font-hand text-ink-2 text-sm">
              방: <span className="font-mono-code text-accent font-bold">{room.slice(-6)}</span>
            </div>
          </div>

          {!submitted ? (
            <div className="card-paper p-7 md:p-9 border-2 border-ink relative" style={{ borderRadius: '4px' }}>
              <div className="tape" />
              <div className="font-caveat text-accent text-xl mb-1 transform -rotate-1">Question ✏️</div>
              <h2 className="font-display text-3xl md:text-4xl text-ink mb-2 leading-tight">{QUESTION}</h2>
              <p className="font-body text-ink-2 text-sm mb-6">{SUBTITLE}</p>

              <div className="mb-5">
                <textarea
                  value={studentText}
                  onChange={(e) => setStudentText(e.target.value)}
                  placeholder="예: 친구가 추천해줘서, AI에 관심이 있어서, 포스터의 로봇 그림이 멋져서..."
                  maxLength={60} rows={3}
                  className="w-full font-hand text-xl bg-paper-2 border-2 border-ink p-4 resize-none focus:outline-none focus:border-accent text-ink"
                  style={{ borderRadius: '4px' }}
                />
                <div className="flex justify-between mt-1 font-body text-xs text-ink-2">
                  <span>짧고 구체적일수록 재미있는 스티커가 나와요</span>
                  <span>{studentText.length} / 60</span>
                </div>
              </div>

              {errorMsg && (
                <div className="mb-4 p-3 border-2 border-accent bg-paper-2" style={{ borderRadius: '4px' }}>
                  <div className="font-hand font-bold text-accent text-base mb-1">⚠️ 제출 실패</div>
                  <div className="font-body text-ink text-sm break-all">{errorMsg}</div>
                </div>
              )}

              <button onClick={handleSubmit} disabled={!studentText.trim() || submitting}
                className="btn-ink w-full py-4 font-display text-2xl flex items-center justify-center gap-2"
                style={{ borderRadius: '4px' }}>
                {submitting
                  ? <><RefreshCw className="spin-slow" size={20} /> 제출 중...</>
                  : <><Send size={20} /> 제출하기</>}
              </button>
            </div>
          ) : (
            <div className="card-paper p-9 border-2 border-ink text-center relative" style={{ borderRadius: '4px' }}>
              <div className="tape" />
              <div className="inline-block mb-4 p-4 bg-paper-2 rounded-full">
                <Sparkles size={40} className="text-accent" />
              </div>
              <h2 className="font-display text-4xl text-ink mb-3">제출 완료!</h2>
              <p className="font-body text-ink-2 mb-1">답변이 스티커로 만들어지고 있어요.</p>
              <p className="font-caveat text-accent text-xl mb-7">앞 화면을 확인해보세요 ✨</p>
              <button onClick={() => setSubmitted(false)} className="btn-paper px-6 py-3 font-hand text-lg" style={{ borderRadius: '4px' }}>
                답변 하나 더 제출하기
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ========== TEACHER ==========
  const shareUrl = room ? buildShareUrl(room) : '';
  const qrUrl = shareUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(shareUrl)}&bgcolor=FAF5EB&color=221E18&margin=10` : '';
  const needsKeyPanel = keyStatus !== 'valid' && !skipKey;

  return (
    <div className="min-h-screen paper-bg paper-grain">
      <header className="border-b-2 border-ink bg-paper-2" style={{ borderBottomStyle: 'dashed' }}>
        <div className="max-w-7xl mx-auto px-5 py-4 flex items-center justify-between gap-3 flex-wrap">
          <button onClick={() => setMode('landing')} className="font-hand text-ink-2 flex items-center gap-1 hover:text-ink text-base">
            <ArrowLeft size={16} /> 메뉴
          </button>
          <div className="flex items-center gap-2 flex-wrap">
            <ConnectionBadge status={connectionStatus} />
            <ModeBadge keyStatus={keyStatus} skipKey={skipKey} onReset={resetKey} />
            <button onClick={() => setShowQR(!showQR)} className="btn-paper px-3 py-2 font-hand text-sm flex items-center gap-2" style={{ borderRadius: '4px' }}>
              <QrCode size={16} /> {showQR ? 'QR 숨기기' : 'QR 보이기'}
            </button>
            <button onClick={copyLink} className="btn-paper px-3 py-2 font-hand text-sm flex items-center gap-2" style={{ borderRadius: '4px' }}>
              {copied ? <><Check size={16} /> 복사됨</> : <><Copy size={16} /> 링크 복사</>}
            </button>
            <button onClick={newRoom} className="btn-paper px-3 py-2 font-hand text-sm flex items-center gap-2" style={{ borderRadius: '4px' }}>
              <Plus size={16} /> 새 방
            </button>
          </div>
        </div>
      </header>

      {needsKeyPanel && (
        <ApiKeySetup onTest={handleTestKey} onFallback={useFallbackMode} status={keyStatus} errorMsg={keyError} />
      )}

      <div className="max-w-7xl mx-auto px-5 pt-8 pb-4">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="font-caveat text-accent text-2xl mb-1 transform -rotate-1 inline-block">오늘의 질문 ✏️</div>
            <h1 className="font-display text-ink text-4xl md:text-5xl lg:text-6xl leading-tight mb-2">{QUESTION}</h1>
            <div className="max-w-md"><RoughUnderline /></div>
            <p className="font-body text-ink-2 mt-3 text-base">{SUBTITLE}</p>
          </div>

          {showQR && room && (
            <div className="card-paper p-4 border-2 border-ink text-center relative" style={{ borderRadius: '4px' }}>
              <div className="tape" />
              <div className="font-hand text-ink text-sm mb-2 font-bold mt-2">📱 QR로 참여하기</div>
              <img src={qrUrl} alt="QR code" className="w-44 h-44 mx-auto" />
              <div className="font-caveat text-accent text-lg mt-1">scan me!</div>
              <div className="font-mono-code text-ink-2 text-xs mt-1">방: {room.slice(-8)}</div>
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center gap-3 flex-wrap font-hand text-ink-2">
          <span>총 <span className="font-bold text-ink text-lg">{answers.length}</span>개의 답변</span>
          {answers.some(a => a.status === 'pending') && (
            <span className="text-sm text-blue-ink">· 만드는 중 {answers.filter(a => a.status === 'pending').length}개</span>
          )}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-5 pb-16">
        {answers.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 md:gap-7 pt-6">
            {answers.map((ans, i) => <StickerCard key={ans.id} answer={ans} index={i} onRetry={retryOne} />)}
          </div>
        )}
      </main>
    </div>
  );
}

// ============ API KEY SETUP ============
function ApiKeySetup({ onTest, onFallback, status, errorMsg }) {
  const [input, setInput] = useState('');
  const [show, setShow] = useState(false);

  return (
    <div className="bg-paper-3 border-b-2 border-ink" style={{ borderBottomStyle: 'dashed' }}>
      <div className="max-w-3xl mx-auto px-5 py-6">
        <div className="flex items-start gap-3 mb-3">
          <Key size={22} className="text-accent mt-1 flex-shrink-0" />
          <div className="flex-1">
            <h2 className="font-display text-2xl text-ink mb-1">Gemini API 키 입력 (선택)</h2>
            <p className="font-body text-ink-2 text-sm">
              AI가 답변에 어울리는 이모지를 골라줍니다.{' '}
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer"
                className="text-accent underline font-bold">AI Studio에서 무료 키 발급 →</a>
            </p>
            <p className="font-body text-ink-2 text-xs mt-1">
              🔒 키는 선생님 브라우저 메모리에만 있으며 학생들에게 전달되지 않습니다.
            </p>
          </div>
        </div>

        <div className="flex gap-2 mt-4 flex-wrap">
          <div className="flex-1 relative min-w-[200px]">
            <input
              type={show ? 'text' : 'password'} value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="AIza... 로 시작하는 키를 붙여넣으세요"
              className="w-full font-mono-code text-sm bg-paper border-2 border-ink p-3 pr-10 focus:outline-none focus:border-accent text-ink"
              style={{ borderRadius: '4px' }}
              disabled={status === 'testing'}
            />
            <button onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-2 hover:text-ink p-1">
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <button
            onClick={() => input.trim() && onTest(input.trim())}
            disabled={!input.trim() || status === 'testing'}
            className="btn-ink px-5 py-3 font-hand text-base flex items-center gap-2"
            style={{ borderRadius: '4px' }}>
            {status === 'testing'
              ? <><RefreshCw className="spin-slow" size={16} /> 확인 중</>
              : <>확인 후 저장</>}
          </button>
          <button onClick={onFallback} className="btn-paper px-5 py-3 font-hand text-base flex items-center gap-2" style={{ borderRadius: '4px' }}>
            <Zap size={16} /> 키 없이 바로 시작
          </button>
        </div>

        {status === 'invalid' && errorMsg && (
          <div className="mt-3 p-3 border-2 border-accent bg-paper" style={{ borderRadius: '4px' }}>
            <div className="font-hand font-bold text-accent text-sm mb-1">⚠️ 유효하지 않은 키</div>
            <div className="font-body text-ink text-xs break-all">{errorMsg}</div>
          </div>
        )}

        <p className="font-body text-ink-2 text-xs mt-3">
          💡 <strong>"키 없이 바로 시작"</strong>을 선택하면 내장 키워드 사전으로 이모지를 매칭합니다. 가장 안정적이지만 AI만큼 창의적이진 않아요.
        </p>
      </div>
    </div>
  );
}

function ConnectionBadge({ status }) {
  const config = {
    idle:       { icon: WifiOff, text: '대기 중', color: 'var(--ink-2)' },
    connecting: { icon: RefreshCw, text: '연결 중...', color: 'var(--yellow)', spin: true },
    connected:  { icon: Wifi, text: '실시간 연결됨', color: 'var(--green)' },
    error:      { icon: WifiOff, text: '연결 오류', color: 'var(--accent)' },
  }[status] || { icon: WifiOff, text: '?', color: 'var(--ink-2)' };
  const Icon = config.icon;
  return (
    <div className="flex items-center gap-1.5 px-3 py-2 border-2 font-hand text-sm"
      style={{ borderColor: config.color, color: config.color, borderRadius: '4px' }}>
      <Icon size={14} className={config.spin ? 'spin-slow' : ''} />
      <span>{config.text}</span>
    </div>
  );
}

function ModeBadge({ keyStatus, skipKey, onReset }) {
  if (keyStatus === 'valid') {
    return (
      <button onClick={onReset} title="AI 모드 활성 (클릭하면 변경)"
        className="flex items-center gap-1.5 px-3 py-2 border-2 font-hand text-sm border-green-ink text-green-ink hover:bg-paper-2"
        style={{ borderRadius: '4px' }}>
        <ShieldCheck size={14} /> <span>AI 모드</span>
      </button>
    );
  }
  if (skipKey) {
    return (
      <button onClick={onReset} title="폴백 모드 활성 (클릭하면 변경)"
        className="flex items-center gap-1.5 px-3 py-2 border-2 font-hand text-sm border-blue-ink text-blue-ink hover:bg-paper-2"
        style={{ borderRadius: '4px' }}>
        <Zap size={14} /> <span>빠른 모드</span>
      </button>
    );
  }
  return null;
}

// ============ STICKER CARD ============
function StickerCard({ answer, index, onRetry }) {
  const rot = answer.rotation || 0;
  const color = pickColor(answer.text);
  const ready = answer.status === 'ready' && answer.emojis;

  return (
    <div
      className="card-paper p-3 hover-float relative animate-pop-in"
      style={{
        '--final-rot': `${rot}deg`,
        transform: `rotate(${rot}deg)`,
        animationDelay: `${Math.min(index * 40, 600)}ms`,
        borderRadius: '3px',
      }}
    >
      <div
        className="aspect-square relative overflow-hidden flex items-center justify-center"
        style={{
          backgroundColor: color.bg,
          borderRadius: '2px',
          border: `1px solid ${color.border}`,
        }}
      >
        {ready ? (
          <div
            className="font-emoji leading-none animate-emoji select-none"
            style={{
              fontSize: 'clamp(48px, 8vw, 76px)',
              textShadow: '0 3px 6px rgba(0,0,0,0.08)',
              letterSpacing: '-2px',
            }}
          >
            {answer.emojis}
          </div>
        ) : answer.status === 'pending' ? (
          <div className="flex flex-col items-center justify-center gap-2 p-2">
            <div className="w-9 h-9 border-[3px] rounded-full spin-slow"
              style={{ borderColor: color.border, borderTopColor: 'transparent' }} />
            <div className="font-caveat text-ink-2 text-base text-center leading-tight">
              {answer.statusMsg || '생각 중...'}
            </div>
          </div>
        ) : (
          <button onClick={() => onRetry(answer.id, answer.text)}
            className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-3 hover:bg-black/5 transition-colors">
            <div className="text-2xl">🎨</div>
            <div className="font-caveat text-ink text-base">↻ 다시 시도</div>
          </button>
        )}

        {ready && answer.usedFallback && (
          <div className="absolute top-1 right-1 bg-white/70 text-ink-2 text-[9px] font-hand px-1.5 py-0.5 rounded"
            title="내장 사전으로 매칭된 이모지">
            FAST
          </div>
        )}
      </div>
      <div className="mt-2 px-1 pb-1 text-center font-hand text-ink leading-tight" style={{ fontSize: '1.05rem' }}>
        "{answer.text}"
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="inline-block mb-6 relative">
        <div className="flex gap-2 items-center justify-center text-5xl select-none font-emoji" style={{ letterSpacing: '4px' }}>
          <span style={{ transform: 'rotate(-8deg)', display: 'inline-block' }}>✏️</span>
          <span style={{ transform: 'rotate(6deg)', display: 'inline-block' }}>💭</span>
          <span style={{ transform: 'rotate(-4deg)', display: 'inline-block' }}>🎨</span>
        </div>
      </div>
      <h3 className="font-display text-3xl text-ink mb-2">답변을 기다리고 있어요</h3>
      <p className="font-body text-ink-2 max-w-md mx-auto mb-6">
        학생들이 답변을 제출하면 여기에 스티커로 나타납니다.<br/>
        상단 <span className="font-hand text-ink font-bold">📱 QR</span> 또는 <span className="font-hand text-ink font-bold">🔗 링크 복사</span>로 참여 링크를 공유해 보세요.
      </p>
      <div className="inline-block font-caveat text-accent text-2xl transform -rotate-2">↑ 참여 링크 공유하기</div>
    </div>
  );
}
