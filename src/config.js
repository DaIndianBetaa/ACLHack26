export const CLONES = [
  { id: '001', name: 'The Original',   short: 'You',   color: '#7c6af7', desc: 'You, as you are — the anchor' },
  { id: '002', name: 'The Ambitious',  short: 'Ambitious',  color: '#f59e0b', desc: 'Every bold choice made' },
  { id: '003', name: 'The Recluse',    short: 'Quiest',    color: '#34d399', desc: 'Safety always chosen' },
  { id: '004', name: 'The Ancient',    short: 'Olden Age',    color: '#f87171', desc: 'Born 1520, same soul' },
  { id: '005', name: 'The Successor',  short: 'Futurista',  color: '#38bdf8', desc: 'Born 2224, your echo' },
  { id: '006', name: 'The Opposite',   short: 'Opposite',   color: '#e879f9', desc: 'Every trait inverted' },
]

// Probability that clone B reacts when clone A (or user) speaks
export const TENSION = {
  '001-006': 0.85, '006-001': 0.85,
  '002-003': 0.80, '003-002': 0.80,
  '004-005': 0.70, '005-004': 0.70,
  '001-002': 0.40, '002-001': 0.40,
  '003-006': 0.40, '006-003': 0.40,
  '001-005': 0.18, '005-001': 0.33,
  '002-006': 0.18, '006-002': 0.18,
  '001-003': 0.25, '003-001': 0.25,
  '002-004': 0.22, '004-002': 0.22,
  '003-005': 0.20, '005-003': 0.20,
  '004-006': 0.30, '006-004': 0.30,
}

export const QUESTIONS = [
  { id: 'q1',  type: 'mcq',   label: 'When something goes wrong, your first instinct is to...',
    opts: ['Fix it immediately, no matter what', 'Understand why it happened first', 'Wait and see if it resolves itself', 'Talk it through with someone I trust'] },
  { id: 'q2',  type: 'mcq',   label: 'After a long week, what actually recharges you?',
    opts: ['Time completely alone, no noise', 'A small gathering with close people', 'Going out, being around energy', 'Creating something — writing, cooking, anything'] },
  { id: 'q3',  type: 'mcq',   label: 'When you have a big decision to make, you...',
    opts: ['Research until the answer is obvious', 'Trust your gut and move', 'Make a pro/con list and agonize', 'Ask everyone, then decide alone'] },
  { id: 'q4',  type: 'mcq',   label: 'Honestly, what drives you more than anything else?',
    opts: ['Being truly understood by someone', 'Building something that outlasts me', 'Freedom to do whatever I want', 'Knowing I did the right thing'] },
  { id: 'q5',  type: 'mcq',   label: "When someone disagrees with you, your honest reaction is...",
    opts: ["I get defensive, then think about it", "I immediately want to understand them", "I stay calm but I'm annoyed inside", "I wonder if they're right"] },
  { id: 'q6',  type: 'mcq',   label: "Which feels most true about your role in others' lives?",
    opts: ["I'm the one people call when it matters", "I'm the quiet anchor people forget they need", "I'm the spark that changes how they see things", "I'm the mirror that shows them who they are"] },
  { id: 'q7',  type: 'mcq',   label: 'When an opportunity scares you, you usually...',
    opts: ['Go for it — fear means it matters', 'Analyze the risk first, then decide', "Find reasons to wait until you're ready", "Need someone else to say 'do it' first"] },
  { id: 'q8',  type: 'short',  label: 'Most people who meet me think I\'m ___, but I\'m actually ___.', placeholder: 'e.g. "confident, but actually terrified most of the time"' },
  { id: 'q9',  type: 'short',  label: 'Text me like you\'d text your closest friend right now.', placeholder: "Don't overthink it. Just type." },
  { id: 'q10', type: 'short',  label: "What's something you've been told your whole life you're still not sure is true?", placeholder: 'Take your time.' },
  { id: 'q11', type: 'short',  label: 'If there\'s a version of you that made every choice you were too scared to make — describe their life.', placeholder: 'Where are they? What did they give up?' },
  { id: 'q12', type: 'short',  label: "What's something you could talk about for 3 hours without noticing?", placeholder: 'The thing that makes you lose track of time...' },
  { id: 'q13', type: 'short',  label: "What's something about yourself that doesn't make sense — even to you?", placeholder: 'A contradiction you\'ve never been able to explain.' },
  { id: 'q14', type: 'short',  label: "What looks like a small worry but is actually something much bigger?", placeholder: 'The fear beneath the fear.' },
  { id: 'q15', type: 'short',  label: "What's something true about you that you almost never say out loud?", placeholder: 'The thing you know but rarely admit.' },
]
