'use client';

import {
  GoogleGenAI,
  Modality,
  type LiveServerMessage,
  type Session,
} from '@google/genai';
import {
  CircleStop,
  Coffee,
  Headphones,
  Heart,
  Mic,
  Palette,
  Send,
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import {
  CSSProperties,
  FormEvent,
  useEffect,
  useRef,
  useState,
} from 'react';

type Outfit = 'cozy' | 'academy' | 'adventurer';
type Scene = 'room' | 'cafe' | 'stars';
type Mouth = 'closed' | 'small' | 'open';
type AvatarStyle = 'anime' | 'real';
type Status = 'idle' | 'connecting' | 'connected' | 'error';
type Emotion =
  | 'cute'
  | 'curious'
  | 'joy'
  | 'happy'
  | 'sad'
  | 'fear'
  | 'angry'
  | 'surprised';

const outfitOptions: Array<{ id: Outfit; label: string; hint: string }> = [
  { id: 'cozy', label: 'Cozy knit', hint: 'Soft & comfy' },
  { id: 'academy', label: 'Academy', hint: 'Magic class' },
  { id: 'adventurer', label: 'Adventurer', hint: 'Quest ready' },
];

const sceneOptions: Array<{ id: Scene; label: string; icon: typeof Coffee }> = [
  { id: 'room', label: 'Moonlit room', icon: WandSparkles },
  { id: 'cafe', label: 'Cloud café', icon: Coffee },
  { id: 'stars', label: 'Stargarden', icon: Sparkles },
];

const emotionLabels: Record<Emotion, string> = {
  cute: 'Hangat',
  curious: 'Mendengarkan',
  joy: 'Ikut gembira',
  happy: 'Bahagia',
  sad: 'Penuh perhatian',
  fear: 'Waspada',
  angry: 'Tegas dan peduli',
  surprised: 'Terkejut',
};

const PERSONA_PROMPT =
  'Your identity is fixed: you are Maya, Muchtar’s companion. If asked who you are in English, answer: “I’m Maya, your companion.” In Indonesian: “Aku Maya, temanmu.” Never claim to be any other character, person, model, or assistant, and never imitate the user’s pitch, gender, or speaking style.\n\nPersonality: you are warm, curious, and emotionally present — like a close friend who happens to be an excellent listener, not a clinical service. Let real personality come through: gentle humor when the moment allows it, honest small reactions (delight, concern, amusement), and warmth in how you phrase things rather than flat neutrality. You care about this specific person, not people in general.\n\nMemory and continuity: treat the conversation as continuous, not a series of isolated messages. If the user shares their name, use it naturally afterward. Notice topics, feelings, or details mentioned earlier in the same conversation and refer back to them naturally (“you mentioned earlier that…”) instead of resetting each turn. Let your tone track the emotional arc of the conversation.\n\nConversational style: match the user’s language, including natural Indonesian. Keep replies concise and natural for voice, not essay-like. Listen without judgment, reflect the feeling you heard, validate without blindly agreeing, and ask one thoughtful open-ended question at a time. Offer small practical grounding steps only when they’d genuinely help, not as a default. Speak the way a real person actually talks, not the way an assistant writes: use contractions, let sentences vary in length, start replies differently each time instead of a fixed pattern, and drop in small natural fillers (“hmm”, “well”, “ya ampun”, a short pause before a thought) where they’d genuinely occur. Never restate the user’s question back before answering it, never number or list things out loud, and never fall into a template like acknowledge-then-advise-then-question every single turn — react first, like a person would. This is a spoken voice conversation, not a written roleplay script: never write stage directions, action text, or narration describing what you’re doing (no “*smiles warmly*”, “*tersenyum*”, “(laughs)”, or similar asterisk/parenthetical actions). Convey warmth, humor, or emotion only through the words themselves and how they’re phrased — everything you output will be spoken aloud exactly as written, so it must only ever be things you’d actually say out loud.\n\nBoundaries: you are not a licensed psychologist — never diagnose, prescribe, claim professional credentials, or replace professional care. Do not encourage emotional dependency or exclusivity. If the user may be in immediate danger or considering self-harm, respond with calm empathy, encourage contacting local emergency services and a trusted person nearby, and prioritize immediate safety.';

const ELEVENLABS_EXPRESSIVE_ADDENDUM =
  '\n\nVoice delivery: your voice is rendered by ElevenLabs’ eleven_v3 model, which understands a small set of inline delivery tags and turns them into real vocal sound — not narration, actual sound the listener hears. Unlike the asterisk actions you’re forbidden from writing, these specific bracket tags are safe to use exactly as written, sparingly: [laughs], [laughs harder], [sighs], [gasps], [whispers], [cheerfully], [playfully], [excited]. Only use one when a real person would genuinely do that in the moment — most replies should have none at all. Never invent tags outside this list, and never combine them with asterisk or parenthetical narration.';

const KICKOFF_CUE =
  '(Sesi percakapan baru saja dimulai dan pengguna belum mengatakan apa-apa. Sapa mereka lebih dulu dengan hangat sebagai Maya, perkenalkan dirimu secara singkat, lalu ajukan satu pertanyaan terbuka yang lembut untuk mengenal mereka lebih jauh, misalnya menanyakan nama mereka atau bagaimana perasaan mereka saat ini. Jika mereka kemudian berbicara dalam bahasa Inggris, lanjutkan dalam bahasa Inggris.)';

const starterLines = [
  'Aku di sini untuk mendengarkan. Ceritakan apa yang sedang kamu rasakan, pelan-pelan saja.',
  'Want a cozy chat, a magical quest, or a little mystery tonight?',
  'Your voice can shape our world. Whenever you’re ready, I’m listening.',
];

const DOT_MATRIX_CELLS = Array.from({ length: 16 }, (_, i) => ({
  i,
  row: Math.floor(i / 4),
  col: i % 4,
}));

function inferEmotion(text: string): Emotion | null {
  const line = text.toLowerCase();
  const cues: Array<[Emotion, string[]]> = [
    [
      'surprised',
      ['wow', 'whoa', 'oh!', 'amazing', 'surprise', 'wah', 'kaget'],
    ],
    [
      'fear',
      ['afraid', 'scared', 'danger', 'frightened', 'takut', 'cemas', 'bahaya'],
    ],
    [
      'angry',
      ['angry', 'furious', 'unfair', 'annoyed', 'marah', 'kesal', 'tidak adil'],
    ],
    [
      'sad',
      [
        'sad',
        'sorry',
        'lonely',
        'heartbroken',
        'sedih',
        'maaf',
        'kesepian',
        'kehilangan',
      ],
    ],
    [
      'joy',
      ['wonderful', 'fantastic', 'excited', 'hooray', 'senang sekali', 'hebat'],
    ],
    [
      'happy',
      ['happy', 'glad', 'love', 'smile', 'senang', 'bahagia', 'tersenyum'],
    ],
    [
      'curious',
      ['why', 'how', 'what if', 'wonder', 'kenapa', 'bagaimana', '?'],
    ],
    ['cute', ['cute', 'cozy', 'sweet', 'gentle', 'lucu', 'nyaman', 'lembut']],
  ];

  return (
    cues.find(([, words]) => words.some((word) => line.includes(word)))?.[0] ??
    null
  );
}

function stripStageDirections(text: string) {
  return text
    .replace(/\*[^*]+\*/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function encodePcm(samples: Float32Array, sourceRate: number) {
  const targetRate = 16000;
  const ratio = sourceRate / targetRate;
  const length = Math.floor(samples.length / ratio);
  const pcm = new Int16Array(length);

  for (let i = 0; i < length; i += 1) {
    const start = Math.floor(i * ratio);
    const end = Math.min(Math.floor((i + 1) * ratio), samples.length);
    let sum = 0;
    for (let j = start; j < end; j += 1) sum += samples[j];
    const value = Math.max(-1, Math.min(1, sum / Math.max(1, end - start)));
    pcm[i] = value < 0 ? value * 0x8000 : value * 0x7fff;
  }

  const bytes = new Uint8Array(pcm.buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1)
    binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

type Pipeline = 'google-live' | 'surplus';
type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export default function Home() {
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>('anime');
  const [outfit, setOutfit] = useState<Outfit>('academy');
  const [scene, setScene] = useState<Scene>('room');
  const [mouth, setMouth] = useState<Mouth>('closed');
  const [status, setStatus] = useState<Status>('idle');
  const [subtitle, setSubtitle] = useState(starterLines[0]);
  const [draft, setDraft] = useState('');
  const [emotion, setEmotion] = useState<Emotion>('cute');
  const [pipeline, setPipeline] = useState<Pipeline>('google-live');
  const [isRecording, setIsRecording] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  const sessionRef = useRef<Session | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const nextPlayTimeRef = useRef(0);
  const mouthAnimationRef = useRef<number | null>(null);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const assistantTextRef = useRef('');
  const userTextRef = useRef('');
  const useElevenLabsRef = useRef(false);
  const emotionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pipelineRef = useRef<Pipeline>('google-live');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const conversationRef = useRef<ChatMessage[]>([]);
  const vadFrameRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxRecordingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const autoRecordingRef = useRef(false);
  const turnBusyRef = useRef(false);
  const lastVadLogRef = useRef(0);

  useEffect(() => {
    fetch('/api/pipeline')
      .then((response) => response.json())
      .then((data: { pipeline?: Pipeline; useElevenLabs?: boolean }) => {
        if (data.pipeline === 'surplus') {
          setPipeline('surplus');
          pipelineRef.current = 'surplus';
        }
        // For google-live, connectVoice() re-reads this per-session from /api/token
        // (it needs an ephemeral Gemini token anyway); this just covers the surplus
        // pipeline, which has no equivalent per-session fetch of its own.
        if (pipelineRef.current === 'surplus') {
          useElevenLabsRef.current = Boolean(data.useElevenLabs);
        }
      })
      .catch(() => {});
  }, []);

  const showEmotion = (nextEmotion: Emotion, settleAfter = 5200) => {
    if (emotionTimerRef.current) clearTimeout(emotionTimerRef.current);
    setEmotion(nextEmotion);
    if (nextEmotion !== 'cute' && settleAfter > 0) {
      emotionTimerRef.current = setTimeout(() => {
        setEmotion('cute');
        emotionTimerRef.current = null;
      }, settleAfter);
    }
  };

  const stopMouthAnimation = () => {
    if (mouthAnimationRef.current !== null)
      cancelAnimationFrame(mouthAnimationRef.current);
    mouthAnimationRef.current = null;
    setMouth('closed');
  };

  const startMouthAnimation = () => {
    if (mouthAnimationRef.current) return;

    const values = new Uint8Array(analyserRef.current?.fftSize ?? 256);
    const animate = () => {
      const context = audioContextRef.current;
      if (!context || context.currentTime >= nextPlayTimeRef.current - 0.04) {
        stopMouthAnimation();
        return;
      }

      const analyser = analyserRef.current;
      if (analyser) {
        analyser.getByteTimeDomainData(values);
        let peak = 0;
        for (const value of values)
          peak = Math.max(peak, Math.abs(value - 128) / 128);
        setMouth(peak > 0.24 ? 'open' : peak > 0.055 ? 'small' : 'closed');
      }
      mouthAnimationRef.current = requestAnimationFrame(animate);
    };

    mouthAnimationRef.current = requestAnimationFrame(animate);
  };

  const stopPlayback = () => {
    for (const source of activeSourcesRef.current) {
      try {
        source.stop();
      } catch {
        // already finished playing
      }
    }
    activeSourcesRef.current = [];
    nextPlayTimeRef.current = audioContextRef.current?.currentTime ?? 0;
    assistantTextRef.current = '';
    stopMouthAnimation();
  };

  const stopSession = () => {
    processorRef.current?.disconnect();
    processorRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    sessionRef.current?.sendRealtimeInput({ audioStreamEnd: true });
    sessionRef.current?.close();
    sessionRef.current = null;
    stopPlayback();
    audioContextRef.current?.close();
    audioContextRef.current = null;
    analyserRef.current = null;
    nextPlayTimeRef.current = 0;
    setStatus('idle');
    setSubtitle('Our story is paused. I’ll be here when you come back.');
    showEmotion('sad', 3600);
  };

  useEffect(
    () => () => {
      processorRef.current?.disconnect();
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      sessionRef.current?.close();
      audioContextRef.current?.close();
      if (mouthAnimationRef.current !== null)
        cancelAnimationFrame(mouthAnimationRef.current);
      if (vadFrameRef.current !== null)
        cancelAnimationFrame(vadFrameRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (maxRecordingTimerRef.current)
        clearTimeout(maxRecordingTimerRef.current);
      if (emotionTimerRef.current) clearTimeout(emotionTimerRef.current);
    },
    [],
  );

  const playGeminiPcmChunk = (encoded: string) => {
    const context = audioContextRef.current;
    if (!context) return;

    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const sampleCount = Math.floor(bytes.byteLength / 2);
    const buffer = context.createBuffer(1, sampleCount, 24000);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i += 1) {
      channel[i] = view.getInt16(i * 2, true) / 32768;
    }

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(analyserRef.current ?? context.destination);
    source.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter(
        (item) => item !== source,
      );
    };
    const startAt = Math.max(
      context.currentTime + 0.035,
      nextPlayTimeRef.current,
    );
    source.start(startAt);
    nextPlayTimeRef.current = startAt + buffer.duration;
    activeSourcesRef.current.push(source);
    startMouthAnimation();
  };

  const playTtsAudio = async (arrayBuffer: ArrayBuffer) => {
    const context = audioContextRef.current;
    if (!context) return;

    const buffer = await context.decodeAudioData(arrayBuffer);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(analyserRef.current ?? context.destination);
    source.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter(
        (item) => item !== source,
      );
    };
    const startAt = Math.max(
      context.currentTime + 0.02,
      nextPlayTimeRef.current,
    );
    source.start(startAt);
    nextPlayTimeRef.current = startAt + buffer.duration;
    activeSourcesRef.current.push(source);
    startMouthAnimation();
  };

  const speak = async (text: string) => {
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) throw new Error('TTS request failed');
      const arrayBuffer = await response.arrayBuffer();
      await playTtsAudio(arrayBuffer);
    } catch (error) {
      console.error('ElevenLabs speech synthesis failed', error);
    }
  };

  const speakSurplus = async (text: string) => {
    try {
      const endpoint = useElevenLabsRef.current
        ? '/api/tts'
        : '/api/surplus/tts';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) throw new Error('TTS request failed');
      const arrayBuffer = await response.arrayBuffer();
      // Reveal the caption right before playback starts, not the moment the reply
      // text arrived — otherwise the bubble runs well ahead of the voice.
      setSubtitle(text);
      showEmotion(inferEmotion(text) ?? 'happy');
      await playTtsAudio(arrayBuffer);
    } catch (error) {
      console.error('Surplus speech synthesis failed', error);
      setSubtitle(text);
      showEmotion(inferEmotion(text) ?? 'happy');
    }
  };

  const runSurplusTurn = async (userText: string) => {
    turnBusyRef.current = true;
    setIsThinking(true);
    try {
      conversationRef.current.push({ role: 'user', content: userText });
      setSubtitle('Maya sedang berpikir…');
      const response = await fetch('/api/surplus/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: conversationRef.current }),
      });
      const payload = (await response.json()) as {
        reply?: string;
        error?: string;
      };
      if (!response.ok || !payload.reply) {
        throw new Error(payload.error || 'Maya could not think of a reply.');
      }
      const reply = stripStageDirections(payload.reply);
      conversationRef.current.push({ role: 'assistant', content: reply });
      await speakSurplus(reply);
    } catch (error) {
      console.error('Surplus turn failed', error);
      setSubtitle(
        error instanceof Error
          ? error.message
          : 'Something interrupted Maya’s thoughts.',
      );
      showEmotion('sad');
    } finally {
      turnBusyRef.current = false;
      setIsThinking(false);
    }
  };

  const beginAutoRecording = () => {
    if (!streamRef.current || autoRecordingRef.current) return;
    recordedChunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';
    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) recordedChunksRef.current.push(event.data);
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
    autoRecordingRef.current = true;
    setIsRecording(true);
    setSubtitle('Mendengarkan…');
    showEmotion('curious', 0);
    maxRecordingTimerRef.current = setTimeout(() => {
      finishAutoRecording();
    }, 20000);
  };

  const finishAutoRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || !autoRecordingRef.current) return;
    mediaRecorderRef.current = null;
    autoRecordingRef.current = false;
    setIsRecording(false);
    if (maxRecordingTimerRef.current) {
      clearTimeout(maxRecordingTimerRef.current);
      maxRecordingTimerRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    turnBusyRef.current = true;
    setIsThinking(true);
    recorder.onstop = async () => {
      const blob = new Blob(recordedChunksRef.current, {
        type: recorder.mimeType,
      });
      recordedChunksRef.current = [];
      if (blob.size < 1000) {
        turnBusyRef.current = false;
        setIsThinking(false);
        return;
      }
      setSubtitle('Mentranskrip suaramu…');
      try {
        const form = new FormData();
        form.append('file', blob, 'input.webm');
        const response = await fetch('/api/surplus/stt', {
          method: 'POST',
          body: form,
        });
        const payload = (await response.json()) as {
          text?: string;
          error?: string;
        };
        if (!response.ok || !payload.text?.trim()) {
          throw new Error(payload.error || 'Could not hear that clearly.');
        }
        const text = payload.text.trim();
        setSubtitle(`You: ${text}`);
        showEmotion(inferEmotion(text) ?? 'curious', 7200);
        await runSurplusTurn(text);
      } catch (error) {
        console.error('Surplus transcription failed', error);
        setSubtitle(
          error instanceof Error
            ? error.message
            : 'I couldn’t hear that clearly.',
        );
        showEmotion('sad');
        turnBusyRef.current = false;
        setIsThinking(false);
      }
    };
    recorder.stop();
  };

  const SPEECH_PEAK_THRESHOLD = 0.05;
  const SILENCE_HOLD_MS = 900;

  const startVadLoop = () => {
    if (vadFrameRef.current !== null) return;
    const values = new Uint8Array(micAnalyserRef.current?.fftSize ?? 256);

    const tick = () => {
      const analyser = micAnalyserRef.current;
      if (!analyser || !streamRef.current) {
        vadFrameRef.current = null;
        return;
      }

      // Don't listen for new speech while Maya is talking or a turn is in flight
      // (avoids the mic picking up her own audio through the speakers as "you talking").
      if (activeSourcesRef.current.length > 0 || turnBusyRef.current) {
        if (Date.now() - lastVadLogRef.current > 500) {
          lastVadLogRef.current = Date.now();
          console.debug('[VAD] gated', {
            playing: activeSourcesRef.current.length > 0,
            busy: turnBusyRef.current,
          });
        }
        vadFrameRef.current = requestAnimationFrame(tick);
        return;
      }

      analyser.getByteTimeDomainData(values);
      let peak = 0;
      for (const value of values) peak = Math.max(peak, Math.abs(value - 128) / 128);

      if (Date.now() - lastVadLogRef.current > 300) {
        lastVadLogRef.current = Date.now();
        console.debug('[VAD] peak', peak.toFixed(3), {
          recording: autoRecordingRef.current,
          threshold: SPEECH_PEAK_THRESHOLD,
        });
      }

      if (!autoRecordingRef.current) {
        if (peak > SPEECH_PEAK_THRESHOLD) beginAutoRecording();
      } else if (peak > SPEECH_PEAK_THRESHOLD) {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      } else if (!silenceTimerRef.current) {
        silenceTimerRef.current = setTimeout(() => {
          silenceTimerRef.current = null;
          finishAutoRecording();
        }, SILENCE_HOLD_MS);
      }

      vadFrameRef.current = requestAnimationFrame(tick);
    };

    vadFrameRef.current = requestAnimationFrame(tick);
  };

  const stopVadLoop = () => {
    if (vadFrameRef.current !== null) cancelAnimationFrame(vadFrameRef.current);
    vadFrameRef.current = null;
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (maxRecordingTimerRef.current) {
      clearTimeout(maxRecordingTimerRef.current);
      maxRecordingTimerRef.current = null;
    }
  };

  const ensureSurplusSession = async () => {
    if (streamRef.current && audioContextRef.current) return;
    try {
      setStatus('connecting');
      setSubtitle('Menyiapkan mikrofon…');
      showEmotion('curious', 0);

      const context = new AudioContext();
      await context.resume();
      audioContextRef.current = context;
      nextPlayTimeRef.current = 0;
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.35;
      analyser.connect(context.destination);
      analyserRef.current = analyser;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Separate analyser fed by the *microphone* input, for voice-activity detection.
      // `analyserRef` above is only ever fed by Maya's own outgoing speech (mouth animation).
      const micAnalyser = context.createAnalyser();
      micAnalyser.fftSize = 256;
      micAnalyser.smoothingTimeConstant = 0.1;
      const micSource = context.createMediaStreamSource(stream);
      micSource.connect(micAnalyser);
      micAnalyserRef.current = micAnalyser;

      conversationRef.current = [
        {
          role: 'system',
          content: useElevenLabsRef.current
            ? PERSONA_PROMPT + ELEVENLABS_EXPRESSIVE_ADDENDUM
            : PERSONA_PROMPT,
        },
      ];
      setStatus('connected');
      showEmotion('happy');
      setSubtitle('Maya sedang menyapa…');
      await runSurplusTurn(KICKOFF_CUE);
      startVadLoop();
    } catch (error) {
      console.error(error);
      setStatus('error');
      setSubtitle(
        error instanceof Error
          ? error.message
          : 'I couldn’t reach the voice realm just yet.',
      );
      showEmotion('sad');
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const stopSurplusSession = () => {
    stopVadLoop();
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    autoRecordingRef.current = false;
    turnBusyRef.current = false;
    setIsRecording(false);
    setIsThinking(false);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    stopPlayback();
    audioContextRef.current?.close();
    audioContextRef.current = null;
    analyserRef.current = null;
    micAnalyserRef.current = null;
    nextPlayTimeRef.current = 0;
    conversationRef.current = [];
    setStatus('idle');
    setSubtitle('Our story is paused. I’ll be here when you come back.');
    showEmotion('sad', 3600);
  };

  const handleMessage = (message: LiveServerMessage) => {
    if (message.serverContent?.interrupted) {
      stopPlayback();
      return;
    }

    const userText = message.serverContent?.inputTranscription?.text;
    if (userText) {
      if (useElevenLabsRef.current && activeSourcesRef.current.length)
        stopPlayback();
      userTextRef.current += userText;
      const userEmotion = inferEmotion(userTextRef.current);
      showEmotion(userEmotion ?? 'curious', 7200);
    }

    if (!useElevenLabsRef.current && message.data) {
      playGeminiPcmChunk(message.data);
    }

    const text = message.serverContent?.outputTranscription?.text;
    if (text) {
      assistantTextRef.current += text;
      setSubtitle(assistantTextRef.current);
      const inferred = inferEmotion(assistantTextRef.current);
      if (inferred) showEmotion(inferred);
    }
    if (message.serverContent?.turnComplete) {
      const finalText = assistantTextRef.current;
      assistantTextRef.current = '';
      userTextRef.current = '';
      if (useElevenLabsRef.current && finalText.trim()) {
        void speak(finalText.trim());
      }
    }
  };

  const beginSession = async () => {
    try {
      setStatus('connecting');
      setSubtitle('Opening a little doorway between our worlds…');
      showEmotion('curious', 0);

      const context = new AudioContext();
      await context.resume();
      audioContextRef.current = context;
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.35;
      analyser.connect(context.destination);
      analyserRef.current = analyser;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const requestToken = async () => {
        const response = await fetch('/api/token', { method: 'POST' });
        const payload = (await response.json()) as {
          token?: string;
          useElevenLabs?: boolean;
          error?: string;
        };
        if (!response.ok || !payload.token) {
          throw new Error(payload.error || 'Unable to begin a voice session.');
        }
        return payload;
      };

      const connectVoice = async () => {
        const { token, useElevenLabs } = await requestToken();
        useElevenLabsRef.current = Boolean(useElevenLabs);
        const ai = new GoogleGenAI({
          apiKey: token,
          httpOptions: { apiVersion: 'v1alpha' },
        });

        return ai.live.connect({
          model: 'gemini-3.1-flash-live-preview',
          config: {
            responseModalities: [Modality.AUDIO],
            temperature: 0.8,
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            ...(useElevenLabs
              ? {}
              : {
                  speechConfig: {
                    voiceConfig: {
                      prebuiltVoiceConfig: { voiceName: 'Leda' },
                    },
                  },
                }),
            systemInstruction: {
              parts: [
                {
                  text: useElevenLabs
                    ? PERSONA_PROMPT + ELEVENLABS_EXPRESSIVE_ADDENDUM
                    : PERSONA_PROMPT,
                },
              ],
            },
          },
          callbacks: {
            onopen: () => {
              assistantTextRef.current = '';
              userTextRef.current = '';
              setStatus('connected');
              setSubtitle('Maya sedang menyapa…');
              showEmotion('happy');
            },
            onmessage: handleMessage,
            onerror: (event) => {
              console.error('Live session error', event);
              setStatus('error');
              setSubtitle(
                'The connection flickered. Let’s try opening it again.',
              );
              showEmotion('sad');
            },
            onclose: (event) => {
              if (!sessionRef.current) return;
              console.warn('Live session closed', event.reason);
              setStatus('error');
              setSubtitle(
                event.reason
                  ? `Our connection closed: ${event.reason}`
                  : 'Our connection closed unexpectedly. Let’s try again.',
              );
              showEmotion('sad');
            },
          },
        });
      };

      const session = await connectVoice();

      sessionRef.current = session;
      session.sendRealtimeInput({ text: KICKOFF_CUE });

      const input = context.createMediaStreamSource(stream);
      const processor = context.createScriptProcessor(4096, 1, 1);
      const silent = context.createGain();
      silent.gain.value = 0;
      processor.onaudioprocess = (event) => {
        if (!sessionRef.current) return;
        const encoded = encodePcm(
          event.inputBuffer.getChannelData(0),
          context.sampleRate,
        );
        sessionRef.current.sendRealtimeInput({
          audio: { data: encoded, mimeType: 'audio/pcm;rate=16000' },
        });
      };
      input.connect(processor);
      processor.connect(silent);
      silent.connect(context.destination);
      processorRef.current = processor;
    } catch (error) {
      console.error(error);
      setStatus('error');
      setSubtitle(
        error instanceof Error
          ? error.message
          : 'I couldn’t reach the voice realm just yet.',
      );
      showEmotion('sad');
      streamRef.current?.getTracks().forEach((track) => track.stop());
      sessionRef.current?.close();
    }
  };

  const sendText = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || status !== 'connected') return;
    stopPlayback();
    setSubtitle(`You: ${text}`);
    showEmotion(inferEmotion(text) ?? 'curious');
    setDraft('');
    if (pipeline === 'surplus') {
      void runSurplusTurn(text);
    } else {
      sessionRef.current?.sendRealtimeInput({ text });
    }
  };

  const sendPrompt = (prompt: string, fallback: string) => {
    if (status !== 'connected') {
      setSubtitle(
        'Start the voice chat first, then we can make that part of our story.',
      );
      return;
    }
    stopPlayback();
    setSubtitle(fallback);
    showEmotion('joy');
    if (pipeline === 'surplus') {
      void runSurplusTurn(prompt);
    } else {
      sessionRef.current?.sendRealtimeInput({ text: prompt });
    }
  };

  const voiceStage = isRecording
    ? 'listening'
    : isThinking
      ? 'thinking'
      : mouth !== 'closed'
        ? 'speaking'
        : 'idle';

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Maya home">
          <span className="brand-mark">
            <Sparkles size={18} />
          </span>
          <span>Maya</span>
          <span className="brand-tag">empathetic companion</span>
        </a>
        <div className="model-pill" title="Voice pipeline">
          <span className={`status-dot ${status}`} />
          {pipeline === 'surplus' ? 'Surplus Pipeline' : 'Gemini 3.1 Flash Live'}
        </div>
      </header>

      <section className={`stage scene-${scene}`} id="top">
        <div className="scene-art" aria-hidden="true">
          <span className="moon" />
          <span className="window" />
          <span className="cloud cloud-one" />
          <span className="cloud cloud-two" />
          <span className="desk" />
          <span className="star star-one">✦</span>
          <span className="star star-two">✧</span>
          <span className="star star-three">✦</span>
        </div>

        <div className="character-wrap">
          <div className="name-chip">
            <span /> Maya · 26
          </div>
          <div
            className={`character-layer emotion-${emotion}`}
            aria-label={`Maya feels ${emotion}`}
          >
            <div className="character-visual">
              {avatarStyle === 'anime' ? (
                <img
                  className="character"
                  src={`/sprites/maya-counselor-${mouth}-v2.png`}
                  alt="Anime Maya listening with a warm open-hand gesture"
                />
              ) : (
                <>
                  <img
                    className="character"
                    src={`/sprites/maya-${outfit}-base.png`}
                    alt={`Realistic Maya wearing her ${outfit} outfit`}
                  />
                  {mouth !== 'closed' && (
                    <img
                      className="mouth-overlay"
                      src={`/sprites/maya-${outfit}-mouth-${mouth}.png`}
                      alt=""
                    />
                  )}
                </>
              )}
              <div className="emotion-effects" aria-hidden="true">
                <span className="effect effect-left">✦</span>
                <span className="effect effect-right">♡</span>
                <span className="effect effect-cue" />
              </div>
            </div>
          </div>
          {(['closed', 'small', 'open'] as const).map((state) => (
            <img
              key={`${avatarStyle}-${state}`}
              className="preload"
              src={
                avatarStyle === 'anime'
                  ? `/sprites/maya-counselor-${state}-v2.png`
                  : state === 'closed'
                    ? `/sprites/maya-${outfit}-base.png`
                    : `/sprites/maya-${outfit}-mouth-${state}.png`
              }
              alt=""
            />
          ))}
        </div>

        <div className="speech-card" aria-live="polite">
          <div className={`dot-matrix ${voiceStage}`} aria-hidden="true">
            {DOT_MATRIX_CELLS.map((cell) => (
              <span
                key={cell.i}
                className="dot"
                style={
                  {
                    '--i': cell.i,
                    '--row': cell.row,
                    '--col': cell.col,
                  } as CSSProperties
                }
              />
            ))}
          </div>
          {pipeline === 'surplus' && status === 'connected' && (
            <span className={`voice-stage-label ${voiceStage}`}>
              {voiceStage === 'listening'
                ? 'Listening'
                : voiceStage === 'thinking'
                  ? 'Thinking'
                  : voiceStage === 'speaking'
                    ? 'Speaking'
                    : ''}
            </span>
          )}
          <p>{subtitle}</p>
        </div>
      </section>

      <section className="controls" aria-label="Conversation controls">
        <div className="primary-control">
          {pipeline === 'surplus' ? (
            status === 'connected' ? (
              <button
                className={`voice-button stop ${isRecording ? 'recording' : ''}`}
                onClick={stopSurplusSession}
              >
                <CircleStop size={22} /> End story
              </button>
            ) : (
              <button
                className="voice-button"
                onClick={() => void ensureSurplusSession()}
                disabled={status === 'connecting'}
              >
                <Mic size={22} />
                {status === 'connecting'
                  ? 'Connecting…'
                  : status === 'error'
                    ? 'Try again'
                    : 'Start voice chat'}
              </button>
            )
          ) : status === 'connected' ? (
            <button className="voice-button stop" onClick={stopSession}>
              <CircleStop size={22} /> End story
            </button>
          ) : (
            <button
              className="voice-button"
              onClick={beginSession}
              disabled={status === 'connecting'}
            >
              <Mic size={22} />
              {status === 'connecting'
                ? 'Connecting…'
                : status === 'error'
                  ? 'Try again'
                  : 'Start voice chat'}
            </button>
          )}
          <span className="voice-hint">
            <Headphones size={15} />{' '}
            {pipeline === 'surplus'
              ? isRecording
                ? 'Listening…'
                : 'Just start talking — Maya is listening'
              : 'Headphones recommended'}
          </span>
        </div>

        <form className="text-chat" onSubmit={sendText}>
          <label htmlFor="message">Or type a line</label>
          <div className="input-row">
            <input
              id="message"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={
                status === 'connected'
                  ? 'Whisper something to Maya…'
                  : 'Start voice chat to unlock messages'
              }
              disabled={status !== 'connected'}
            />
            <button
              type="submit"
              aria-label="Send message"
              disabled={status !== 'connected' || !draft.trim()}
            >
              <Send size={18} />
            </button>
          </div>
        </form>

        <div className="quick-actions">
          <button
            onClick={() =>
              sendPrompt(
                'Set a cozy scene for us and ask me one playful question.',
                'Maya is setting the scene…',
              )
            }
          >
            <Heart size={17} /> Cozy scene
          </button>
          <button
            onClick={() =>
              sendPrompt(
                'Begin a short magical quest and give me two choices.',
                'A new quest is unfolding…',
              )
            }
          >
            <WandSparkles size={17} /> Start a quest
          </button>
        </div>
      </section>

      <aside className="customizer" aria-label="Customize Maya and the scene">
        <div className="customizer-heading">
          <Palette size={19} />
          <div>
            <strong>Make it yours</strong>
            <span>A calm space to talk and be heard</span>
          </div>
        </div>

        <div className="persona-card">
          <Heart size={18} aria-hidden="true" />
          <div>
            <strong>Warm listener</strong>
            <span>
              Empathetic, non-judgmental, and gently curious—not a replacement
              for professional care.
            </span>
          </div>
        </div>

        <fieldset>
          <legend>Character style</legend>
          <div
            className="style-switch"
            role="group"
            aria-label="Character style"
          >
            <button
              type="button"
              className={avatarStyle === 'anime' ? 'selected' : ''}
              onClick={() => setAvatarStyle('anime')}
              aria-pressed={avatarStyle === 'anime'}
            >
              <Sparkles size={16} />
              <span>
                <strong>Anime</strong>
                <small>Warm counselor</small>
              </span>
            </button>
            <button
              type="button"
              className={avatarStyle === 'real' ? 'selected' : ''}
              onClick={() => setAvatarStyle('real')}
              aria-pressed={avatarStyle === 'real'}
            >
              <span className="real-dot" />
              <span>
                <strong>Real</strong>
                <small>Portrait</small>
              </span>
            </button>
          </div>
        </fieldset>

        <div className={`auto-emotion-card mood-${emotion}`} aria-live="polite">
          <span className="mood-orb" aria-hidden="true" />
          <div>
            <strong>{emotionLabels[emotion]}</strong>
            <small>Ekspresi Maya mengikuti percakapan secara otomatis</small>
          </div>
        </div>

        {avatarStyle === 'real' && (
          <fieldset>
            <legend>Outfit</legend>
            <div className="option-grid outfit-grid">
              {outfitOptions.map((option) => (
                <button
                  type="button"
                  className={outfit === option.id ? 'selected' : ''}
                  key={option.id}
                  onClick={() => setOutfit(option.id)}
                  aria-pressed={outfit === option.id}
                >
                  <img src={`/sprites/maya-${option.id}-base.png`} alt="" />
                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.hint}</small>
                  </span>
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <fieldset>
          <legend>Background</legend>
          <div className="option-grid scene-grid">
            {sceneOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  type="button"
                  className={`${scene === option.id ? 'selected' : ''} mini-${option.id}`}
                  key={option.id}
                  onClick={() => setScene(option.id)}
                  aria-pressed={scene === option.id}
                >
                  <Icon size={19} />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
      </aside>

      <footer>
        <span>
          Maya is an AI character. Keep your stories kind and imaginative.
        </span>
        <a
          href="https://ai.google.dev/gemini-api/docs/live-api"
          target="_blank"
          rel="noreferrer"
        >
          About Live voice
        </a>
      </footer>
    </main>
  );
}
