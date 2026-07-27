'use client';

import { useEffect, useState } from 'react';
import type { CreateFlowInput, FlowCategory } from '@/lib/flows/types';
import { TYPE_ICON, TYPE_LABELS, defaultForType, makeKey, previewOf, type StepDraft } from './step-types';
import FlowCanvas from './flow-canvas';
import FlowDetailsPanel from './flow-details-panel';
import StepFieldsPanel from './step-fields-panel';
import GenerateBox from './generate-box';
import { SAMPLE_FLOW } from './sample-flow';
import Tour, { type TourStep } from './tour';

type QuickActionDraft = { label: string; prompt: string };
type QADraft = { question: string; answer: string };

const STEP_TYPES = Object.keys(TYPE_LABELS) as StepDraft['type'][];
const ONBOARDING_SEEN_KEY = 'flow-builder-onboarding-seen';

const ONBOARDING_STEPS: TourStep[] = [
  {
    selector: '.generate-box',
    title: 'Describe your idea',
    body: 'Type a scenario in plain language and it drafts the name, persona, and every step for you.',
  },
  {
    selector: '.how-it-works-sample',
    title: 'Or start from an example',
    body: 'New here? Load a ready-made flow to see how everything fits together before building your own.',
    onEnter: () => {
      const details = document.querySelector<HTMLDetailsElement>('.how-it-works');
      if (details) details.open = true;
    },
  },
  {
    selector: '.palette-grid',
    title: 'Build it yourself',
    body: 'Add steps here — they run top to bottom. A Branch step can send the conversation two different ways.',
  },
  {
    selector: '.workspace-canvas-col',
    title: 'Your flow, as a canvas',
    body: 'Every step becomes a card here. Click any card to edit it on the right.',
  },
  {
    selector: '.workspace-inspector',
    title: 'Edit the details',
    body: "Fill in your character's details here, or edit whichever card you've selected on the canvas.",
  },
  {
    selector: '.workspace-save',
    title: "You're ready",
    body: 'Hit Create flow whenever you’re happy with it — you can always come back and edit later.',
  },
];

export default function FlowWorkspace({ defaultVisibility = 'public' }: { defaultVisibility?: 'public' | 'private' }) {
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [category, setCategory] = useState<FlowCategory>('companion');
  const [persona, setPersona] = useState('');
  const [starterLine, setStarterLine] = useState('');
  const [kickoffCue, setKickoffCue] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>(defaultVisibility);
  const [quickActions, setQuickActions] = useState<QuickActionDraft[]>([
    { label: '', prompt: '' },
    { label: '', prompt: '' },
  ]);
  const [knowledgeBase, setKnowledgeBase] = useState<QADraft[]>([{ question: '', answer: '' }]);
  const [steps, setSteps] = useState<StepDraft[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [tourSteps, setTourSteps] = useState<TourStep[] | null>(null);

  const selectedStep = steps.find((s) => s.key === selectedKey) ?? null;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem(ONBOARDING_SEEN_KEY)) return;
    const timer = setTimeout(() => setTourSteps(ONBOARDING_STEPS), 700);
    return () => clearTimeout(timer);
  }, []);

  const finishTour = () => {
    setTourSteps(null);
    window.localStorage.setItem(ONBOARDING_SEEN_KEY, '1');
  };

  const applyGenerated = (flow: CreateFlowInput) => {
    setName(flow.name);
    setTagline(flow.tagline);
    setCategory(flow.category);
    setPersona(flow.persona);
    setStarterLine(flow.starterLine);
    setKickoffCue(flow.kickoffCue);
    setQuickActions(flow.quickActions.length > 0 ? flow.quickActions : [{ label: '', prompt: '' }]);
    setKnowledgeBase(flow.knowledgeBase.length > 0 ? flow.knowledgeBase : [{ question: '', answer: '' }]);
    setSteps(flow.steps.map((step) => ({ ...step, key: step.id }) as StepDraft));
    setSelectedKey(null);
  };

  const loadSample = () => {
    const hasDraft = name.trim() || persona.trim() || steps.length > 0;
    if (hasDraft && !window.confirm('This replaces what you have with the example flow. Continue?')) return;

    setName(SAMPLE_FLOW.name);
    setTagline(SAMPLE_FLOW.tagline);
    setCategory(SAMPLE_FLOW.category);
    setPersona(SAMPLE_FLOW.persona);
    setStarterLine(SAMPLE_FLOW.starterLine);
    setKickoffCue(SAMPLE_FLOW.kickoffCue);
    setQuickActions(SAMPLE_FLOW.quickActions.length > 0 ? SAMPLE_FLOW.quickActions : [{ label: '', prompt: '' }]);
    setKnowledgeBase(SAMPLE_FLOW.knowledgeBase.length > 0 ? SAMPLE_FLOW.knowledgeBase : [{ question: '', answer: '' }]);
    setSelectedKey(null);
    setSteps([]);

    const sampleSteps = SAMPLE_FLOW.steps.map((step) => ({ ...step, key: step.id }) as StepDraft);
    const walkthrough: TourStep[] = sampleSteps.map((step, i) => ({
      selector: `[data-id="${step.key}"]`,
      title: `Step ${i + 1}: ${TYPE_LABELS[step.type]}`,
      body: previewOf(step),
      onEnter: () => setSteps(sampleSteps.slice(0, i + 1)),
    }));
    walkthrough.push({
      selector: '.workspace-inspector',
      title: "That's the whole flow",
      body: 'Click any card on the canvas to edit it here, or hit Create flow when you’re ready to publish it.',
      onEnter: () => {
        setSteps(sampleSteps);
        setSelectedKey(null);
      },
    });
    setTourSteps(walkthrough);
  };

  const addStepOfType = (type: StepDraft['type']) => {
    const key = makeKey();
    setSteps([...steps, defaultForType(type, key)]);
    setSelectedKey(key);
  };

  const updateSelected = (patch: Partial<StepDraft>) => {
    if (!selectedKey) return;
    setSteps(steps.map((s) => (s.key === selectedKey ? ({ ...s, ...patch } as StepDraft) : s)));
  };

  const changeSelectedType = (type: StepDraft['type']) => {
    if (!selectedKey) return;
    setSteps(steps.map((s) => (s.key === selectedKey ? defaultForType(type, s.key) : s)));
  };

  const removeSelected = () => {
    if (!selectedKey) return;
    setSteps(steps.filter((s) => s.key !== selectedKey));
    setSelectedKey(null);
  };

  const onSubmit = async () => {
    setError(null);
    if (!name.trim()) {
      setError('Give it a name first.');
      return;
    }
    if (persona.trim().length < 20) {
      setError('Describe the character in at least 20 characters.');
      return;
    }
    setSubmitting(true);

    try {
      const response = await fetch('/api/flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          tagline,
          category,
          persona,
          starterLine,
          kickoffCue,
          visibility,
          quickActions: quickActions.filter((item) => item.label.trim() && item.prompt.trim()),
          knowledgeBase: knowledgeBase.filter((item) => item.question.trim() && item.answer.trim()),
          steps: steps.map((step) => ({ ...step, id: step.key })),
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { id?: string; error?: string };

      if (!response.ok || !data.id) {
        setError(data.error ?? 'Something went wrong. Please try again.');
        setSubmitting(false);
        return;
      }

      window.location.href = `/flow/${data.id}`;
    } catch {
      setError('Could not reach the server. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="workspace">
      <header className="workspace-topbar">
        <a href="/app" className="workspace-back">
          ← Flows
        </a>
        <input
          className="workspace-title-input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Untitled flow"
          maxLength={60}
        />
        <div className="workspace-topbar-right">
          {error ? <span className="workspace-error">{error}</span> : null}
          <button type="button" className="auth-submit workspace-save" onClick={onSubmit} disabled={submitting}>
            {submitting ? 'Creating…' : 'Create flow'}
          </button>
        </div>
      </header>

      <div className="workspace-body">
        <aside className="workspace-palette">
          <details className="how-it-works">
            <summary>How this works</summary>
            <ul>
              <li>Describe a scenario and it drafts everything — name, persona, and steps.</li>
              <li>Or add steps yourself from the list below. They run top to bottom.</li>
              <li>A <strong>Branch</strong> step checks something already collected and can send the conversation two different ways.</li>
              <li>A <strong>Trigger webhook</strong> step notifies your own automation (Zapier, Make, your backend) once the flow finishes.</li>
              <li>Click any node on the canvas to edit it here on the right.</li>
            </ul>
            <button type="button" className="how-it-works-sample" onClick={loadSample}>
              Load a working example
            </button>
          </details>

          <GenerateBox onGenerated={applyGenerated} />

          <span className="auth-label">Add a step</span>
          <div className="palette-grid">
            {STEP_TYPES.map((type) => (
              <button key={type} type="button" className="palette-item" onClick={() => addStepOfType(type)}>
                <span className="palette-item-icon">{TYPE_ICON[type]}</span>
                {TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </aside>

        <main className="workspace-canvas-col">
          <FlowCanvas
            steps={steps}
            onChange={setSteps}
            selectedKey={selectedKey}
            onSelectKey={setSelectedKey}
            onAddStep={() => addStepOfType('message')}
            onDeleteSelected={removeSelected}
            locked={!!tourSteps}
          />
        </main>

        <aside className="workspace-inspector">
          {selectedStep ? (
            <>
              <div className="node-panel-head">
                <strong>Step {steps.findIndex((s) => s.key === selectedKey) + 1}</strong>
                <button type="button" onClick={() => setSelectedKey(null)} aria-label="Deselect">
                  ×
                </button>
              </div>
              <StepFieldsPanel
                step={selectedStep}
                steps={steps}
                onUpdate={updateSelected}
                onChangeType={changeSelectedType}
                onRemove={removeSelected}
              />
            </>
          ) : (
            <>
              <div className="node-panel-head">
                <strong>Flow details</strong>
              </div>
              <FlowDetailsPanel
                name={name}
                setName={setName}
                tagline={tagline}
                setTagline={setTagline}
                category={category}
                setCategory={setCategory}
                persona={persona}
                setPersona={setPersona}
                starterLine={starterLine}
                setStarterLine={setStarterLine}
                kickoffCue={kickoffCue}
                setKickoffCue={setKickoffCue}
                visibility={visibility}
                setVisibility={setVisibility}
                quickActions={quickActions}
                setQuickActions={setQuickActions}
                knowledgeBase={knowledgeBase}
                setKnowledgeBase={setKnowledgeBase}
              />
            </>
          )}
        </aside>
      </div>

      {tourSteps && <Tour steps={tourSteps} onFinish={finishTour} />}
    </div>
  );
}
