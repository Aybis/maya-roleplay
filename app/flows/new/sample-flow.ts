import type { CreateFlowInput } from '@/lib/flows/types';

export const SAMPLE_FLOW: CreateFlowInput = {
  name: 'Cozy Coffee Cart',
  tagline: 'Takes a coffee order and sends it to the till',
  category: 'business',
  persona:
    'You are Milo, a warm and quick-witted barista running a small coffee cart. You talk the way a real barista would on a busy morning: short, friendly, a little playful, never robotic.',
  starterLine: "Morning! What can I get started for you today?",
  kickoffCue: '',
  quickActions: [
    { label: 'Order a latte', prompt: "I'd like a latte." },
    { label: "What's good today?", prompt: 'What do you recommend today?' },
  ],
  knowledgeBase: [
    { question: 'Do you have oat milk?', answer: 'Yes — oat, almond, and whole milk are all available at no extra charge.' },
  ],
  steps: [
    { id: 'ask_drink', type: 'collect', field: 'drink', question: 'what drink they want', required: true },
    { id: 'ask_size', type: 'collect', field: 'size', question: 'small, medium, or large', required: true },
    {
      id: 'check_large',
      type: 'condition',
      field: 'size',
      matchType: 'equals',
      matchValue: 'large',
      whenTrue: 'offer_upsize',
      whenFalse: 'send_order',
    },
    { id: 'offer_upsize', type: 'message', text: 'Mention that larges come with a free pastry sample today.' },
    { id: 'send_order', type: 'webhook', url: 'https://replace-with-your-webhook-url.example.com' },
    { id: 'wrap_up', type: 'end', text: "That's on its way — thanks so much!" },
  ],
  visibility: 'public',
};
