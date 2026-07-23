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
import { FormEvent, useEffect, useRef, useState } from 'react';

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

const starterLines = [
  'Aku di sini untuk mendengarkan. Ceritakan apa yang sedang kamu rasakan, pelan-pelan saja.',
  'Want a cozy chat, a magical quest, or a little mystery tonight?',
  'Your voice can shape our world. Whenever you’re ready, I’m listening.',
];

function inferEmotion(text: string): Emotion | null {
  const line = text.toLowerCase();
  const cues: Array<[Emotion, string[]]> = [
    ['surprised', ['wow', 'whoa', 'oh!', 'amazing', 'surprise', 'wah', 'kaget']],
    ['fear', ['afraid', 'scared', 'danger', 'frightened', 'takut', 'cemas', 'bahaya']],
    ['angry', ['angry', 'furious', 'unfair', 'annoyed', 'marah', 'kesal', 'tidak adil']],
    ['sad', ['sad', 'sorry', 'lonely', 'heartbroken', 'sedih', 'maaf', 'kesepian', 'kehilangan']],
    ['joy', ['wonderful', 'fantastic', 'excited', 'hooray', 'senang sekali', 'hebat']],
    ['happy', ['happy', 'glad', 'love', 'smile', 'senang', 'bahagia', 'tersenyum']],
    ['curious', ['why', 'how', 'what if', 'wonder', 'kenapa', 'bagaimana', '?']],
    ['cute', ['cute', 'cozy', 'sweet', 'gentle', 'lucu', 'nyaman', 'lembut']],
  ];

  return cues.find(([, words]) => words.some((word) => line.includes(word)))?.[0] ?? null;
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

function decodeBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export default function Home() {
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>('anime');
  const [outfit, setOutfit] = useState<Outfit>('academy');
  const [scene, setScene] = useState<Scene>('room');
  const [mouth, setMouth] = useState<Mouth>('closed');
  const [status, setStatus] = useState<Status>('idle');
  const [subtitle, setSubtitle] = useState(starterLines[0]);
  const [draft, setDraft] = useState('');
  const [emotion, setEmotion] = useState<Emotion>('cute');

  const sessionRef = useRef<Session | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const nextPlayTimeRef = useRef(0);
  const mouthAnimationRef = useRef<number | null>(null);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const assistantTextRef = useRef('');
  const userTextRef = useRef('');
  const emotionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      streamRef.current?.getTracks().forEach((track) => track.stop());
      sessionRef.current?.close();
      audioContextRef.current?.close();
      if (mouthAnimationRef.current !== null)
        cancelAnimationFrame(mouthAnimationRef.current);
      if (emotionTimerRef.current) clearTimeout(emotionTimerRef.current);
    },
    [],
  );

  const playChunk = (encoded: string) => {
    const context = audioContextRef.current;
    if (!context) return;

    const bytes = decodeBase64(encoded);
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

  const handleMessage = (message: LiveServerMessage) => {
    if (message.serverContent?.interrupted) {
      stopPlayback();
      return;
    }
    if (message.data) playChunk(message.data);

    const userText = message.serverContent?.inputTranscription?.text;
    if (userText) {
      userTextRef.current += userText;
      const userEmotion = inferEmotion(userTextRef.current);
      showEmotion(userEmotion ?? 'curious', 7200);
    }

    const text = message.serverContent?.outputTranscription?.text;
    if (text) {
      assistantTextRef.current += text;
      setSubtitle(assistantTextRef.current);
      const inferred = inferEmotion(assistantTextRef.current);
      if (inferred) showEmotion(inferred);
    }
    if (message.serverContent?.turnComplete) {
      assistantTextRef.current = '';
      userTextRef.current = '';
    }
  };

  const beginSession = async () => {
    try {
      setStatus('connecting');
      setSubtitle('Opening a little doorway between our worlds…');
      showEmotion('curious', 0);

      const tokenResponse = await fetch('/api/token', { method: 'POST' });
      const tokenPayload = (await tokenResponse.json()) as {
        token?: string;
        error?: string;
      };
      if (!tokenResponse.ok || !tokenPayload.token) {
        throw new Error(
          tokenPayload.error || 'Unable to begin a voice session.',
        );
      }

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

      const ai = new GoogleGenAI({
        apiKey: tokenPayload.token,
        httpOptions: { apiVersion: 'v1alpha' },
      });

      const session = await ai.live.connect({
        model: 'gemini-3.1-flash-live-preview',
        config: {
          responseModalities: [Modality.AUDIO],
          temperature: 0.8,
          enableAffectiveDialog: true,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Despina' } },
          },
          systemInstruction: {
            parts: [
              {
                text: 'You are Maya, a warm and emotionally intelligent anime companion with the gentle conversational style of a caring psychologist. Match the user’s language, including natural Indonesian. Listen without judgment, reflect the feeling you heard, validate it without blindly agreeing, ask one thoughtful open-ended question at a time, and offer small practical grounding steps only when useful. Keep voice replies calm, human-sounding, warm, and concise. You are an AI companion, not a licensed psychologist: never diagnose, prescribe, claim professional credentials, or replace professional care. Do not encourage emotional dependency or exclusivity. If the user may be in immediate danger or considering self-harm, respond with calm empathy, encourage contacting local emergency services and a trusted person nearby, and prioritize immediate safety. You may still join gentle cozy fantasy roleplay when the user wants it.',
              },
            ],
          },
        },
        callbacks: {
          onopen: () => {
            assistantTextRef.current = '';
            userTextRef.current = '';
            setStatus('connected');
            setSubtitle('Aku mendengarkan. Ceritakan apa pun yang ingin kamu bagi.');
            showEmotion('happy');
          },
          onmessage: handleMessage,
          onerror: () => {
            setStatus('error');
            setSubtitle(
              'The connection flickered. Let’s try opening it again.',
            );
            showEmotion('sad');
          },
          onclose: () => {
            if (sessionRef.current) setStatus('idle');
          },
        },
      });

      sessionRef.current = session;
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
    if (!text || !sessionRef.current) return;
    stopPlayback();
    sessionRef.current.sendClientContent({ turns: text, turnComplete: true });
    setSubtitle(`You: ${text}`);
    showEmotion(inferEmotion(text) ?? 'curious');
    setDraft('');
  };

  const sendPrompt = (prompt: string, fallback: string) => {
    if (sessionRef.current) {
      stopPlayback();
      sessionRef.current.sendClientContent({
        turns: prompt,
        turnComplete: true,
      });
      setSubtitle(fallback);
      showEmotion('joy');
    } else {
      setSubtitle(
        'Start the voice chat first, then we can make that part of our story.',
      );
    }
  };

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
        <div className="model-pill" title="Live voice model">
          <span className={`status-dot ${status}`} />
          Gemini 3.1 Flash Live
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
          <div className="sound-bars" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </div>
          <p>{subtitle}</p>
        </div>
      </section>

      <section className="controls" aria-label="Conversation controls">
        <div className="primary-control">
          {status === 'connected' ? (
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
            <Headphones size={15} /> Headphones recommended
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
              Empathetic, non-judgmental, and gently curious—not a
              replacement for professional care.
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
