'use client';

import { FormEvent, useState } from 'react';
import { FLOW_CATEGORIES, type CreateFlowInput, type FlowCategory } from '@/lib/flows/types';
import StepEditor, { type StepDraft } from './step-editor';
import GenerateBox from './generate-box';
import FlowDiagram from './flow-diagram';

const CATEGORY_LABELS: Record<FlowCategory, string> = {
  companion: 'Companion',
  adventure: 'Adventure',
  business: 'Business assistant',
  custom: 'Custom',
};

type QuickActionDraft = { label: string; prompt: string };
type QADraft = { question: string; answer: string };
const MAX_KNOWLEDGE_BASE = 10;

export default function CreateFlowForm() {
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [category, setCategory] = useState<FlowCategory>('companion');
  const [persona, setPersona] = useState('');
  const [starterLine, setStarterLine] = useState('');
  const [kickoffCue, setKickoffCue] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [quickActions, setQuickActions] = useState<QuickActionDraft[]>([
    { label: '', prompt: '' },
    { label: '', prompt: '' },
  ]);
  const [knowledgeBase, setKnowledgeBase] = useState<QADraft[]>([{ question: '', answer: '' }]);
  const [steps, setSteps] = useState<StepDraft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const updateQuickAction = (index: number, field: 'label' | 'prompt', value: string) => {
    setQuickActions((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const updateQA = (index: number, field: 'question' | 'answer', value: string) => {
    setKnowledgeBase((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const addQA = () => {
    setKnowledgeBase((prev) => (prev.length >= MAX_KNOWLEDGE_BASE ? prev : [...prev, { question: '', answer: '' }]));
  };

  const removeQA = (index: number) => {
    setKnowledgeBase((prev) => prev.filter((_, i) => i !== index));
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
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
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
    <form className="auth-form" onSubmit={onSubmit}>
      <GenerateBox onGenerated={applyGenerated} />

      <label className="auth-label" htmlFor="name">
        Name
      </label>
      <input
        id="name"
        required
        maxLength={60}
        value={name}
        onChange={(event) => setName(event.target.value)}
        className="auth-input"
        placeholder="e.g. Kai, the late-night radio host"
      />

      <label className="auth-label" htmlFor="tagline">
        Tagline
      </label>
      <input
        id="tagline"
        maxLength={140}
        value={tagline}
        onChange={(event) => setTagline(event.target.value)}
        className="auth-input"
        placeholder="One line describing the vibe"
      />

      <label className="auth-label" htmlFor="category">
        Category
      </label>
      <select
        id="category"
        value={category}
        onChange={(event) => setCategory(event.target.value as FlowCategory)}
        className="auth-input"
      >
        {FLOW_CATEGORIES.map((value) => (
          <option key={value} value={value}>
            {CATEGORY_LABELS[value]}
          </option>
        ))}
      </select>

      <label className="auth-label" htmlFor="persona">
        Character persona
      </label>
      <textarea
        id="persona"
        required
        minLength={20}
        maxLength={4000}
        rows={6}
        value={persona}
        onChange={(event) => setPersona(event.target.value)}
        className="auth-input"
        placeholder="Who are they, how do they talk, what's the setting? Baseline safety rules always apply on top of this and can't be turned off."
      />

      <label className="auth-label" htmlFor="starterLine">
        Starter line (shown before chat begins)
      </label>
      <input
        id="starterLine"
        maxLength={300}
        value={starterLine}
        onChange={(event) => setStarterLine(event.target.value)}
        className="auth-input"
        placeholder="What they'd say to invite someone in"
      />

      <label className="auth-label" htmlFor="kickoffCue">
        Opening instruction (optional)
      </label>
      <textarea
        id="kickoffCue"
        maxLength={500}
        rows={2}
        value={kickoffCue}
        onChange={(event) => setKickoffCue(event.target.value)}
        className="auth-input"
        placeholder="How should they open the very first message? Leave blank for a sensible default."
      />

      <span className="auth-label">Quick actions (optional)</span>
      {quickActions.map((action, index) => (
        <div className="quick-action-row" key={index}>
          <input
            value={action.label}
            onChange={(event) => updateQuickAction(index, 'label', event.target.value)}
            className="auth-input"
            placeholder="Button label"
            maxLength={40}
          />
          <input
            value={action.prompt}
            onChange={(event) => updateQuickAction(index, 'prompt', event.target.value)}
            className="auth-input"
            placeholder="What it sends"
            maxLength={300}
          />
        </div>
      ))}

      <span className="auth-label">Knowledge base (optional)</span>
      <p className="field-hint">
        Exact facts you want answered correctly — hours, policies, prices, how-tos. The
        character consults these when relevant instead of guessing.
      </p>
      {knowledgeBase.map((qa, index) => (
        <div className="qa-row" key={index}>
          <input
            value={qa.question}
            onChange={(event) => updateQA(index, 'question', event.target.value)}
            className="auth-input"
            placeholder="Question, e.g. What are your hours?"
            maxLength={200}
          />
          <textarea
            value={qa.answer}
            onChange={(event) => updateQA(index, 'answer', event.target.value)}
            className="auth-input"
            placeholder="Answer"
            rows={2}
            maxLength={600}
          />
          <button type="button" className="qa-remove" onClick={() => removeQA(index)} aria-label="Remove">
            ×
          </button>
        </div>
      ))}
      {knowledgeBase.length < MAX_KNOWLEDGE_BASE && (
        <button type="button" className="qa-add" onClick={addQA}>
          + Add another fact
        </button>
      )}

      <span className="auth-label">Conversation flow (optional)</span>
      <p className="field-hint">
        Guide the character through a specific sequence instead of freeform chat — collect info,
        branch on answers, and trigger a webhook to your own automation when done.
      </p>
      <FlowDiagram steps={steps} />
      <StepEditor steps={steps} onChange={setSteps} />

      <label className="auth-label" htmlFor="visibility">
        Visibility
      </label>
      <select
        id="visibility"
        value={visibility}
        onChange={(event) => setVisibility(event.target.value as 'public' | 'private')}
        className="auth-input"
      >
        <option value="public">Public — listed on the homepage for everyone</option>
        <option value="private">Private — only reachable by you, via link</option>
      </select>

      {error ? <p className="auth-error">{error}</p> : null}

      <button type="submit" className="auth-submit" disabled={submitting}>
        {submitting ? 'Creating…' : 'Create flow'}
      </button>
    </form>
  );
}
