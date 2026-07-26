'use client';

import {
  GoogleGenAI,
  Modality,
  type LiveServerMessage,
  type Session,
} from '@google/genai';
import { CircleStop, Mic, Send } from 'lucide-react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { buildSystemInstruction } from '@/lib/flows/safety';
import { VirgilMark } from '@/app/brand/virgil-logo';

type Status = 'idle' | 'connecting' | 'connected' | 'error';
type QuickAction = { label: string; prompt: string };
type QAEntry = { question: string; answer: string };

type FlowAppProps = {
  flowId: string;
  name: string;
  tagline: string;
  persona: string;
  kickoffCue: string;
  starterLine: string;
  quickActions: QuickAction[];
  knowledgeBase: QAEntry[];
  stepsInstruction: string;
  hasSteps: boolean;
  userEmail: string;
};

const DEFAULT_KICKOFF =
  '(A new conversation has just started and the user has not said anything yet. Greet them warmly and briefly, in character, then ask one open question to get things going. Match their language once they speak.)';

function encodePcm(samples: Float32Array, sourceRate: number) {
  const targetRate = 16000;
  const ratio = sourceRate / targetRate;
  const outLength = Math.floor(samples.length / ratio);
  const out = new Int16Array(outLength);
  for (let i = 0; i < outLength; i += 1) {
    const sample = samples[Math.floor(i * ratio)] ?? 0;
    out[i] = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)));
  }
  let binary = '';
  const bytes = new Uint8Array(out.buffer);
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export default function FlowApp({
  flowId,
  name,
  tagline,
  persona,
  kickoffCue,
  starterLine,
  quickActions,
  knowledgeBase,
  stepsInstruction,
  hasSteps,
  userEmail,
}: FlowAppProps) {
  const [status, setStatus] = useState<Status>('idle');
  const [subtitle, setSubtitle] = useState(starterLine || `Start a conversation with ${name}.`);
  const [draft, setDraft] = useState('');
  const [automationNote, setAutomationNote] = useState<string | null>(null);

  const sessionRef = useRef<Session | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const nextPlayTimeRef = useRef(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const assistantTextRef = useRef('');
  const userTextRef = useRef('');
  const useElevenLabsRef = useRef(false);
  const fullTranscriptRef = useRef('');
  const webhookFiredRef = useRef(false);

  useEffect(
    () => () => {
      processorRef.current?.disconnect();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      sessionRef.current?.close();
      audioContextRef.current?.close();
    },
    [],
  );

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
    fullTranscriptRef.current = '';
    webhookFiredRef.current = false;
    setAutomationNote(null);
    setStatus('idle');
    setSubtitle('Paused. Come back any time.');
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
    for (let i = 0; i < sampleCount; i += 1) {
      channel[i] = view.getInt16(i * 2, true) / 32768;
    }

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
  };

  const playTtsAudio = async (arrayBuffer: ArrayBuffer) => {
    const context = audioContextRef.current;
    if (!context) return;

    const buffer = await context.decodeAudioData(arrayBuffer);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(analyserRef.current ?? context.destination);
    source.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter((item) => item !== source);
    };
    const startAt = Math.max(context.currentTime + 0.02, nextPlayTimeRef.current);
    source.start(startAt);
    nextPlayTimeRef.current = startAt + buffer.duration;
    activeSourcesRef.current.push(source);
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
      console.error('Text-to-speech failed', error);
    }
  };

  const handleMessage = (message: LiveServerMessage) => {
    if (message.serverContent?.interrupted) {
      stopPlayback();
      return;
    }

    const userText = message.serverContent?.inputTranscription?.text;
    if (userText) {
      if (useElevenLabsRef.current && activeSourcesRef.current.length) stopPlayback();
      userTextRef.current += userText;
    }

    if (!useElevenLabsRef.current && message.data) {
      playGeminiPcmChunk(message.data);
    }

    const text = message.serverContent?.outputTranscription?.text;
    if (text) {
      assistantTextRef.current += text;
      setSubtitle(assistantTextRef.current);
    }
    if (message.serverContent?.turnComplete) {
      const finalText = assistantTextRef.current;
      const finalUser = userTextRef.current.trim();
      const finalAssistant = finalText.trim();
      assistantTextRef.current = '';
      userTextRef.current = '';
      if (finalUser) fullTranscriptRef.current += `User: ${finalUser}\n`;
      if (finalAssistant) fullTranscriptRef.current += `${name}: ${finalAssistant}\n`;
      if (hasSteps) void checkFlowCompletion();
      if (useElevenLabsRef.current && finalText.trim()) {
        void speak(finalText.trim());
      }
    }
  };

  const checkFlowCompletion = async () => {
    if (webhookFiredRef.current) return;
    try {
      const response = await fetch(`/api/flows/${flowId}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcriptText: fullTranscriptRef.current }),
      });
      if (!response.ok) return;
      const data = (await response.json()) as { complete?: boolean; fields?: Record<string, string> };
      if (!data.complete || webhookFiredRef.current) return;

      webhookFiredRef.current = true;
      const webhookResponse = await fetch(`/api/flows/${flowId}/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: data.fields ?? {} }),
      });
      const webhookData = (await webhookResponse.json().catch(() => ({}))) as { fired?: number };
      if (webhookData.fired && webhookData.fired > 0) {
        setAutomationNote('✓ Sent to your connected automation.');
      }
    } catch (error) {
      console.error('Flow completion check failed', error);
    }
  };

  const beginSession = async () => {
    try {
      setStatus('connecting');
      setSubtitle('Connecting…');

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

      const requestToken = async () => {
        const response = await fetch('/api/token', { method: 'POST' });
        const payload = (await response.json()) as { token?: string; useElevenLabs?: boolean; error?: string };
        if (!response.ok || !payload.token) {
          throw new Error(payload.error || 'Unable to begin a voice session.');
        }
        return payload;
      };

      const { token, useElevenLabs } = await requestToken();
      useElevenLabsRef.current = Boolean(useElevenLabs);
      const ai = new GoogleGenAI({ apiKey: token, httpOptions: { apiVersion: 'v1alpha' } });

      const session = await ai.live.connect({
        model: 'gemini-3.1-flash-live-preview',
        config: {
          responseModalities: [Modality.AUDIO],
          temperature: 0.8,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          ...(useElevenLabs
            ? {}
            : { speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Leda' } } } }),
          systemInstruction: { parts: [{ text: buildSystemInstruction(persona, knowledgeBase, stepsInstruction) }] },
        },
        callbacks: {
          onopen: () => {
            assistantTextRef.current = '';
            userTextRef.current = '';
            setStatus('connected');
            setSubtitle(`${name} is saying hello…`);
          },
          onmessage: handleMessage,
          onerror: (event) => {
            console.error('Live session error', event);
            setStatus('error');
            setSubtitle('The connection flickered. Let’s try opening it again.');
          },
          onclose: (event) => {
            if (!sessionRef.current) return;
            console.warn('Live session closed', event.reason);
            setStatus('error');
            setSubtitle(event.reason ? `Connection closed: ${event.reason}` : 'Connection closed unexpectedly.');
          },
        },
      });

      sessionRef.current = session;
      session.sendRealtimeInput({ text: kickoffCue.trim() || DEFAULT_KICKOFF });

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
      setSubtitle(error instanceof Error ? error.message : 'Could not start the conversation.');
      streamRef.current?.getTracks().forEach((track) => track.stop());
      sessionRef.current?.close();
    }
  };

  const sendText = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !sessionRef.current) return;
    stopPlayback();
    sessionRef.current.sendRealtimeInput({ text });
    fullTranscriptRef.current += `User: ${text}\n`;
    setSubtitle(`You: ${text}`);
    setDraft('');
  };

  const sendPrompt = (prompt: string) => {
    if (!sessionRef.current) {
      setSubtitle('Start the conversation first, then try that.');
      return;
    }
    stopPlayback();
    sessionRef.current.sendRealtimeInput({ text: prompt });
    fullTranscriptRef.current += `User: ${prompt}\n`;
  };

  return (
    <main className="app-shell flow-shell">
      <header className="topbar">
        <a className="brand" href="/app" aria-label="Back to flows">
          <span className="brand-mark">
            <VirgilMark size={18} />
          </span>
          <span>{name}</span>
        </a>
        <div className="topbar-right">
          <div className="model-pill" title="Live voice model">
            <span className={`status-dot ${status}`} />
            {tagline || 'Voice roleplay'}
          </div>
          <div className="account-pill" title={userEmail}>
            <a className="account-email" href="/account">
              {userEmail}
            </a>
          </div>
        </div>
      </header>

      <section className="flow-stage">
        <div className={`flow-orb flow-orb-${status}`} aria-hidden="true">
          <span />
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

      <section className="controls flow-controls" aria-label="Conversation controls">
        <div className="primary-control">
          {status === 'connected' ? (
            <button className="voice-button stop" onClick={stopSession}>
              <CircleStop size={22} /> End conversation
            </button>
          ) : (
            <button className="voice-button" onClick={beginSession} disabled={status === 'connecting'}>
              <Mic size={22} />
              {status === 'connecting' ? 'Connecting…' : status === 'error' ? 'Try again' : 'Start voice chat'}
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
              placeholder={status === 'connected' ? 'Say something…' : 'Start voice chat to unlock messages'}
              disabled={status !== 'connected'}
            />
            <button type="submit" aria-label="Send message" disabled={status !== 'connected' || !draft.trim()}>
              <Send size={18} />
            </button>
          </div>
        </form>

        {quickActions.length > 0 && (
          <div className="quick-actions">
            {quickActions.map((action) => (
              <button key={action.label} onClick={() => sendPrompt(action.prompt)}>
                {action.label}
              </button>
            ))}
          </div>
        )}

        {automationNote && <p className="automation-note">{automationNote}</p>}
      </section>

      <footer>
        <span>{name} is an AI character created by a Virgil user, not a real person. Not professional advice.</span>
        <a href={`/flow/${flowId}`}>Refresh</a>
      </footer>
    </main>
  );
}
