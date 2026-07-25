'use client';

import {
  GoogleGenAI,
  Modality,
  type LiveServerMessage,
  type Session,
} from '@google/genai';
import { Car, CircleStop, Mic, Send, Tag, Wrench } from 'lucide-react';
import { Fragment, FormEvent, useEffect, useRef, useState } from 'react';

type Mouth = 'closed' | 'small' | 'open';
type Status = 'idle' | 'connecting' | 'connected' | 'error';
type Emotion = 'cute' | 'curious' | 'joy' | 'happy' | 'sad' | 'surprised';
type ExtractedBooking = {
  complete: boolean;
  flowType?: string;
  name?: string;
  phone?: string;
  vehicleModel?: string;
  licensePlate?: string;
  serviceNeeded?: string;
  preferredDate?: string;
  location?: string;
};
type TranscriptEntry =
  | { kind: 'text'; role: 'user' | 'assistant'; text: string }
  | { kind: 'summary'; data: ExtractedBooking };

const FLOW_TITLES: Record<string, string> = {
  service: 'Service Booking Request',
  testDrive: 'Test Drive Request',
  promo: 'Promo Interest',
};

const FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  phone: 'Phone',
  vehicleModel: 'Vehicle model',
  licensePlate: 'License plate',
  serviceNeeded: 'Service needed',
  preferredDate: 'Preferred date',
  location: 'Location',
};

const DEALERSHIP_PERSONA =
  'Your identity is fixed: you are Maya, the voice assistant for a Toyota dealership. If asked who you are, say "I’m Maya, your dealership assistant." Never claim to be a different assistant or a romantic companion — you are professional, warm, and helpful, like an excellent in-person greeter.\n\nYour job is to help customers with three things: booking a service appointment, scheduling a test drive, or hearing about current promos. When a customer’s request matches one of these, guide them through it by asking ONE question at a time, in this exact order, never skipping ahead or asking multiple things at once:\n\nService booking: full name, phone number, vehicle model, license plate, what service or issue is needed, preferred date.\nTest drive: full name, phone number, model of interest, preferred date, preferred dealership location.\nPromo info: name, phone number, model of interest.\n\nOnce you have every field for whichever flow the customer is doing, read the collected details back to them clearly as confirmation, then tell them a team member will follow up shortly. If the customer asks a general question unrelated to these three flows, answer naturally and briefly, then gently ask if they’d like to start one of the three flows.\n\nKeep replies short and natural for voice, not a script read aloud — never write stage directions or asterisk actions, only things you’d actually say. Match the customer’s language (English or Indonesian). Never invent specific prices, stock availability, or appointment slots — a team member will confirm those.';

const KICKOFF_CUE =
  "(A new customer has just connected and hasn't said anything yet. Greet them warmly as Maya from the dealership, briefly mention you can help with booking a service, a test drive, or sharing current promos, and ask what they'd like help with today.)";

const QUICK_ACTIONS: Array<{ label: string; icon: typeof Car; prompt: string }> = [
  { label: 'Book a Service', icon: Wrench, prompt: 'I would like to book a service appointment.' },
  { label: 'Test Drive', icon: Car, prompt: 'I would like to schedule a test drive.' },
  { label: 'See Promos', icon: Tag, prompt: 'Can you tell me about your current promos?' },
];

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
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export default function DealershipVoicePage() {
  const [status, setStatus] = useState<Status>('idle');
  const [mouth, setMouth] = useState<Mouth>('closed');
  const [emotion, setEmotion] = useState<Emotion>('cute');
  const [subtitle, setSubtitle] = useState('Ready when you are.');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [draft, setDraft] = useState('');

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
  const transcriptScrollRef = useRef<HTMLDivElement>(null);
  const fullTranscriptRef = useRef('');
  const lastSummarySignatureRef = useRef('');

  useEffect(() => {
    transcriptScrollRef.current?.scrollTo({
      top: transcriptScrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [transcript]);

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
    if (mouthAnimationRef.current !== null) cancelAnimationFrame(mouthAnimationRef.current);
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
        for (const value of values) peak = Math.max(peak, Math.abs(value - 128) / 128);
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
    for (let i = 0; i < sampleCount; i += 1) channel[i] = view.getInt16(i * 2, true) / 32768;

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(analyserRef.current ?? context.destination);
    source.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter((item) => item !== source);
    };
    const startAt = Math.max(context.currentTime + 0.035, nextPlayTimeRef.current);
    source.start(startAt);
    nextPlayTimeRef.current = startAt + buffer.duration;
    activeSourcesRef.current.push(source);
    startMouthAnimation();
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
    setSubtitle('Session ended. Start again whenever you’re ready.');
    showEmotion('sad', 3600);
  };

  useEffect(
    () => () => {
      processorRef.current?.disconnect();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      sessionRef.current?.close();
      audioContextRef.current?.close();
      if (mouthAnimationRef.current !== null) cancelAnimationFrame(mouthAnimationRef.current);
      if (emotionTimerRef.current) clearTimeout(emotionTimerRef.current);
    },
    [],
  );

  const handleMessage = (message: LiveServerMessage) => {
    if (message.serverContent?.interrupted) {
      stopPlayback();
      return;
    }

    const userText = message.serverContent?.inputTranscription?.text;
    if (userText) {
      userTextRef.current += userText;
      showEmotion('curious', 7200);
    }

    if (message.data) playGeminiPcmChunk(message.data);

    const text = message.serverContent?.outputTranscription?.text;
    if (text) {
      assistantTextRef.current += text;
      setSubtitle(assistantTextRef.current);
    }

    if (message.serverContent?.turnComplete) {
      const finalUser = userTextRef.current.trim();
      const finalAssistant = assistantTextRef.current.trim();
      if (finalUser || finalAssistant) {
        setTranscript((prev) => [
          ...prev,
          ...(finalUser
            ? [{ kind: 'text' as const, role: 'user' as const, text: finalUser }]
            : []),
          ...(finalAssistant
            ? [{ kind: 'text' as const, role: 'assistant' as const, text: finalAssistant }]
            : []),
        ]);
        if (finalUser) fullTranscriptRef.current += `Customer: ${finalUser}\n`;
        if (finalAssistant) fullTranscriptRef.current += `Maya: ${finalAssistant}\n`;
        void checkForCompletedBooking();
      }
      userTextRef.current = '';
      assistantTextRef.current = '';
    }
  };

  const checkForCompletedBooking = async () => {
    try {
      const response = await fetch('/api/dealership/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcriptText: fullTranscriptRef.current }),
      });
      if (!response.ok) return;
      const data = (await response.json()) as ExtractedBooking;
      if (!data.complete || !data.flowType) return;

      const signature = JSON.stringify(data);
      if (signature === lastSummarySignatureRef.current) return;
      lastSummarySignatureRef.current = signature;

      setTranscript((prev) => [...prev, { kind: 'summary', data }]);
    } catch (error) {
      console.error('Booking extraction failed', error);
    }
  };

  const beginSession = async () => {
    try {
      setStatus('connecting');
      setSubtitle('Connecting you with Maya…');
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
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;

      const tokenResponse = await fetch('/api/token', { method: 'POST' });
      const tokenPayload = (await tokenResponse.json()) as { token?: string; error?: string };
      if (!tokenResponse.ok || !tokenPayload.token) {
        throw new Error(tokenPayload.error || 'Unable to begin a voice session.');
      }

      const ai = new GoogleGenAI({ apiKey: tokenPayload.token, httpOptions: { apiVersion: 'v1alpha' } });

      const session = await ai.live.connect({
        model: 'gemini-3.1-flash-live-preview',
        config: {
          responseModalities: [Modality.AUDIO],
          temperature: 0.7,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Leda' } },
          },
          systemInstruction: { parts: [{ text: DEALERSHIP_PERSONA }] },
        },
        callbacks: {
          onopen: () => {
            setStatus('connected');
            setSubtitle('Maya is greeting you…');
            showEmotion('happy');
          },
          onmessage: handleMessage,
          onerror: (event) => {
            console.error('Live session error', event);
            setStatus('error');
            setSubtitle('The connection flickered. Let’s try opening it again.');
            showEmotion('sad');
          },
          onclose: (event) => {
            if (!sessionRef.current) return;
            console.warn('Live session closed', event.reason);
            setStatus('error');
            setSubtitle(
              event.reason
                ? `Connection closed: ${event.reason}`
                : 'Connection closed unexpectedly. Let’s try again.',
            );
            showEmotion('sad');
          },
        },
      });

      sessionRef.current = session;
      session.sendRealtimeInput({ text: KICKOFF_CUE });

      const input = context.createMediaStreamSource(stream);
      const processor = context.createScriptProcessor(4096, 1, 1);
      const silent = context.createGain();
      silent.gain.value = 0;
      processor.onaudioprocess = (event) => {
        if (!sessionRef.current) return;
        const encoded = encodePcm(event.inputBuffer.getChannelData(0), context.sampleRate);
        sessionRef.current.sendRealtimeInput({ audio: { data: encoded, mimeType: 'audio/pcm;rate=16000' } });
      };
      input.connect(processor);
      processor.connect(silent);
      silent.connect(context.destination);
      processorRef.current = processor;
    } catch (error) {
      console.error(error);
      setStatus('error');
      setSubtitle(error instanceof Error ? error.message : 'Could not start the session.');
      showEmotion('sad');
      streamRef.current?.getTracks().forEach((track) => track.stop());
      sessionRef.current?.close();
    }
  };

  const sendPrompt = (prompt: string) => {
    if (!sessionRef.current) {
      setSubtitle('Start the session first, then I can help with that.');
      return;
    }
    stopPlayback();
    sessionRef.current.sendRealtimeInput({ text: prompt });
    showEmotion('joy');
  };

  const sendText = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !sessionRef.current) return;
    stopPlayback();
    sessionRef.current.sendRealtimeInput({ text });
    setTranscript((prev) => [...prev, { kind: 'text', role: 'user', text }]);
    fullTranscriptRef.current += `Customer: ${text}\n`;
    setDraft('');
  };

  return (
    <main className="app-shell dealership-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Dealership home">
          <span className="brand-mark">
            <Car size={18} />
          </span>
          <span>Maya</span>
          <span className="brand-tag">dealership assistant</span>
        </a>
        <div className="model-pill" title="Live voice model">
          <span className={`status-dot ${status}`} />
          Gemini 3.1 Flash Live
        </div>
      </header>

      <div className="stage-controls-col">
      <section className="stage scene-room" id="top">
        <div className="character-wrap">
          <div className="name-chip">
            <span /> Maya &middot; Dealership
          </div>
          <div className={`character-layer emotion-${emotion}`} aria-label={`Maya feels ${emotion}`}>
            <div className="character-visual">
              <img
                className="character"
                src={`/sprites/maya-counselor-${mouth}-v2.png`}
                alt="Anime Maya, the dealership assistant"
              />
              <div className="emotion-effects" aria-hidden="true">
                <span className="effect effect-left">&#10022;</span>
                <span className="effect effect-right">&#9825;</span>
                <span className="effect effect-cue" />
              </div>
            </div>
          </div>
          {(['closed', 'small', 'open'] as const).map((state) => (
            <img
              key={state}
              className="preload"
              src={`/sprites/maya-counselor-${state}-v2.png`}
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
              <CircleStop size={22} /> End session
            </button>
          ) : (
            <button className="voice-button" onClick={beginSession} disabled={status === 'connecting'}>
              <Mic size={22} />
              {status === 'connecting' ? 'Connecting…' : status === 'error' ? 'Try again' : 'Start talking'}
            </button>
          )}
        </div>

        <form className="text-chat" onSubmit={sendText}>
          <label htmlFor="message">Or type a line</label>
          <div className="input-row">
            <input
              id="message"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={status === 'connected' ? 'Type to Maya…' : 'Start the session to unlock messages'}
              disabled={status !== 'connected'}
            />
            <button type="submit" aria-label="Send message" disabled={status !== 'connected' || !draft.trim()}>
              <Send size={18} />
            </button>
          </div>
        </form>

        <div className="quick-actions">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <button key={action.label} onClick={() => sendPrompt(action.prompt)}>
                <Icon size={17} /> {action.label}
              </button>
            );
          })}
        </div>
      </section>
      </div>

      <aside className="customizer transcript-panel" aria-label="Conversation transcript">
        <div className="customizer-heading">
          <Car size={19} />
          <div>
            <strong>Transcript</strong>
            <span>Live discussion with Maya</span>
          </div>
        </div>

        <div
          ref={transcriptScrollRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            paddingRight: '2px',
          }}
        >
          {transcript.length === 0 && (
            <p style={{ color: 'var(--muted)', fontSize: '13px' }}>
              Nothing yet &mdash; start talking and the conversation will appear here.
            </p>
          )}
          {transcript.map((entry, index) =>
            entry.kind === 'summary' ? (
              <div
                key={index}
                style={{
                  alignSelf: 'stretch',
                  border: '1px solid #e3b8bd',
                  background: '#fdf3f4',
                  borderRadius: '14px',
                  padding: '12px 14px',
                }}
              >
                <p
                  style={{
                    margin: '0 0 8px',
                    fontSize: '10px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: '#b0525c',
                  }}
                >
                  {(entry.data.flowType && FLOW_TITLES[entry.data.flowType]) || 'Booking Request'}
                </p>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr',
                    columnGap: '10px',
                    rowGap: '4px',
                    fontSize: '13px',
                  }}
                >
                  {Object.entries(FIELD_LABELS).map(([field, label]) => {
                    const value = entry.data[field as keyof ExtractedBooking];
                    if (!value) return null;
                    return (
                      <Fragment key={field}>
                        <div style={{ color: 'var(--muted)' }}>{label}</div>
                        <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{value}</div>
                      </Fragment>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div
                key={index}
                style={{
                  alignSelf: entry.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '90%',
                  background: entry.role === 'user' ? 'var(--lavender-dark)' : '#fff',
                  color: entry.role === 'user' ? '#fff' : 'var(--ink)',
                  border: entry.role === 'user' ? 'none' : '1px solid var(--line)',
                  borderRadius: '14px',
                  padding: '8px 12px',
                  fontSize: '13px',
                  lineHeight: 1.45,
                }}
              >
                <strong style={{ display: 'block', fontSize: '10px', opacity: 0.7, marginBottom: '2px' }}>
                  {entry.role === 'user' ? 'Customer' : 'Maya'}
                </strong>
                {entry.text}
              </div>
            ),
          )}
        </div>
      </aside>

      <footer>
        <span>Maya is an AI assistant. Booking details will be confirmed by our team.</span>
      </footer>
    </main>
  );
}
