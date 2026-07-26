'use client';

import { FLOW_CATEGORIES, type FlowCategory } from '@/lib/flows/types';

const CATEGORY_LABELS: Record<FlowCategory, string> = {
  companion: 'Companion',
  adventure: 'Adventure',
  business: 'Business assistant',
  custom: 'Custom',
};

type QuickActionDraft = { label: string; prompt: string };
type QADraft = { question: string; answer: string };
const MAX_KNOWLEDGE_BASE = 10;

export default function FlowDetailsPanel({
  name,
  setName,
  tagline,
  setTagline,
  category,
  setCategory,
  persona,
  setPersona,
  starterLine,
  setStarterLine,
  kickoffCue,
  setKickoffCue,
  visibility,
  setVisibility,
  quickActions,
  setQuickActions,
  knowledgeBase,
  setKnowledgeBase,
}: {
  name: string;
  setName: (v: string) => void;
  tagline: string;
  setTagline: (v: string) => void;
  category: FlowCategory;
  setCategory: (v: FlowCategory) => void;
  persona: string;
  setPersona: (v: string) => void;
  starterLine: string;
  setStarterLine: (v: string) => void;
  kickoffCue: string;
  setKickoffCue: (v: string) => void;
  visibility: 'public' | 'private';
  setVisibility: (v: 'public' | 'private') => void;
  quickActions: QuickActionDraft[];
  setQuickActions: (v: QuickActionDraft[]) => void;
  knowledgeBase: QADraft[];
  setKnowledgeBase: (v: QADraft[]) => void;
}) {
  const updateQuickAction = (index: number, field: 'label' | 'prompt', value: string) => {
    setQuickActions(quickActions.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const updateQA = (index: number, field: 'question' | 'answer', value: string) => {
    setKnowledgeBase(knowledgeBase.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const addQA = () => {
    if (knowledgeBase.length >= MAX_KNOWLEDGE_BASE) return;
    setKnowledgeBase([...knowledgeBase, { question: '', answer: '' }]);
  };

  const removeQA = (index: number) => {
    setKnowledgeBase(knowledgeBase.filter((_, i) => i !== index));
  };

  return (
    <div className="node-panel-body">
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
        rows={5}
        value={persona}
        onChange={(event) => setPersona(event.target.value)}
        className="auth-input"
        placeholder="Who are they, how do they talk, what's the setting? Baseline safety rules always apply on top of this."
      />

      <label className="auth-label" htmlFor="starterLine">
        Starter line
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
        placeholder="Leave blank for a sensible default."
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
      <p className="field-hint">Exact facts you want answered correctly.</p>
      {knowledgeBase.map((qa, index) => (
        <div className="qa-row" key={index}>
          <input
            value={qa.question}
            onChange={(event) => updateQA(index, 'question', event.target.value)}
            className="auth-input"
            placeholder="Question"
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
          + Add fact
        </button>
      )}

      <label className="auth-label" htmlFor="visibility">
        Visibility
      </label>
      <select
        id="visibility"
        value={visibility}
        onChange={(event) => setVisibility(event.target.value as 'public' | 'private')}
        className="auth-input"
      >
        <option value="public">Public — listed on the homepage</option>
        <option value="private">Private — reachable by link only</option>
      </select>
    </div>
  );
}
