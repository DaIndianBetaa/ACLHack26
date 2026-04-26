# Within — Talk to Every Version of Yourself

> *What if you could have a group chat with every parallel version of you that ever existed?*

**Within** is an AI-powered introspection experience built for ACLHack 2026. You answer 15 questions about who you are — your fears, your voice, your unlived choices — and then enter a live group chat with 6 AI clones of yourself, each shaped by a different version of your life.

---

## The Concept

Most AI chatbots are generic. Within is the opposite: every clone is built from *your* answers. The same soul, six different lives. They argue with each other. They react to what you say. They remember what was said five messages ago. And they all talk like you — because they were trained on how you actually text.

| Clone | Identity | Personality |
|-------|----------|-------------|
| 001 Original | You, as you are | Anchor. Faithful to every answer you gave. |
| 002 Ambitious | You if you took every scary leap | Momentum-driven. Impatient with caution. |
| 003 Loner | You if you never left your comfort zone | Quiet. Reflective. At peace with small things. |
| 004 Ancient | Your soul, born in 1520 | Medieval worldview. Mortality is casual. Apps are alarming. |
| 005 Future | Your soul, born in 2224 | Your current problems are solved history to them. |
| 006 Opposite | Every trait genuinely inverted | Not evil — just baffled by who you chose to be. |

---

## How It Works

### 1. The Quiz (15 questions)
Seven multiple-choice questions establish your personality: how you handle pressure, what recharges you, how you make decisions, your conflict style. Eight open-ended questions capture your voice fingerprint, your unlived life, your hidden contradictions and fears. Every answer feeds directly into the AI system prompts.

### 2. Prompt Architecture
Each clone receives a shared base prompt (your personality data) plus a unique **divergence block** that defines who they became. Clone 006's divergence literally inverts every MCQ answer you gave. Clone 004 is told it was born in 1520 and knows nothing after 1525. Clone 002's biography is the life you described in question 11 — *"the version of you that made every choice you were too scared to make."*

### 3. Live Streaming Chat
Responses stream token-by-token using the OpenAI streaming API. Each clone responds asynchronously with staggered delays so the conversation feels natural — like a real group chat where people don't all respond at once.

### 4. The Tension System
Clones don't just respond to you — they react to each other. A probability map defines how likely each clone pair is to respond when the other speaks. 001 and 006 have 85% reaction probability (opposites attract conflict). Mention a specific clone with `@002` and the whole dynamic shifts.

### 5. Autonomous Conversation
If the chat goes quiet for ~20-37 seconds, a random idle clone breaks the silence unprompted. The conversation has a life of its own even when you step back.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React (Vite) |
| Backend | Node.js |
| AI | OpenAI GPT-4o-mini|
| Deploy | Vite|

No backend. No database. No user accounts. Your answers never leave your browser except as part of the AI prompts.

---

## Getting Started
Clone the repo and insert your OPENAI api key

```bash
git clone https://github.com/DaIndianBetaa/ACLHack26
cd within-app
touch .env
echo VITE_API_KEY= api key > .env
npm install
npm run dev
```

Open `http://localhost:5173`. You'll need an OpenAI API key on the landing screen.

---

## Key Design Decisions

**Why streaming?** Watching a clone "think" as words appear is fundamentally different from a message appearing all at once. It feels alive. The latency becomes part of the experience.

**Why GPT-4o-mini?** Speed and cost. Conversations can involve 3–4 simultaneous streaming responses. A heavier model would create noticeable stalls.

**Why no backend?** Hackathon time is finite. Running purely in the browser means zero infrastructure, zero deployment complexity.

**Why 6 clones?** The six represent the most psychologically interesting divergence axes: present self, courage vs. caution, time (past/future), and pure inversion. More than six and the conversation becomes noise.

---

## Built at ACLHack 2026

Made in ~24 hours. Solo project.
