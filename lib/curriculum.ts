/**
 * Curriculum data for all learning tracks.
 *
 * Each track contains ordered lessons and an optional final challenge.
 * Lesson content is kept here (not hard-coded in UI components) so that
 * the same reusable Quiz / DragDrop / TypingTest components render
 * whichever data they receive.
 *
 * To add Weeks 3–8 later, just push more entries into `tracks`.
 */

// ─── Shared types ──────────────────────────────────────────────────────
export type QuizQuestion = {
  question: string
  options: string[]
  correctIndex: number
}

export type DragDropItem = {
  id: string
  label: string
  zone: string // target zone name
  imageUrl?: string
  imageAlt?: string
}

export type DragDropZone = {
  id: string
  label: string
  imageUrl?: string
  imageAlt?: string
}

export type LessonActivity =
  | { type: 'quiz'; questions: QuizQuestion[] }
  | { type: 'drag-label'; items: DragDropItem[]; zones: DragDropZone[]; instruction: string }
  | { type: 'drag-classify'; items: DragDropItem[]; zones: DragDropZone[]; instruction: string }
  | { type: 'keyboard'; instruction: string }
  | { type: 'typing-test'; instruction: string }
  | { type: 'rich-text-editor'; mission: string; requiredFormats: string[] }
  | { type: 'slide-editor'; instruction: string }
  | { type: 'python-runner'; instruction: string; initialCode?: string }
  | { type: 'ai-chat'; instruction: string; starterPrompt?: string }
  | { type: 'wokwi-embed'; instruction: string; src: string; title: string }
  | { type: 'youtube-embed'; instruction: string; videoId: string; title: string }
  | { type: 'html-preview'; instruction: string; initialHtml?: string; initialCss?: string }
  | { type: 'scenario-question'; scenario: string; options: string[]; correctIndex: number }
  | { type: 'external-link'; url: string; title: string; instruction: string }

export type Lesson = {
  slug: string
  title: string
  topics: string[]
  activity: LessonActivity
  isUnlocked?: boolean
}

export type Challenge = {
  slug: string
  title: string
  description: string
  activity: LessonActivity
  timeLimitSeconds?: number
  isUnlocked?: boolean
}

export type Track = {
  slug: string
  title: string
  description: string
  weekNumber: number
  icon: string // lucide icon name
  lessons: Lesson[]
  challenge?: Challenge
}

function deviceImage(label: string, accent: string) {
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220"><rect width="320" height="220" rx="28" fill="#f8fafc"/><rect x="34" y="56" width="252" height="118" rx="18" fill="${accent}" opacity=".14"/><rect x="58" y="82" width="204" height="64" rx="10" fill="#ffffff" stroke="${accent}" stroke-width="8"/><text x="160" y="184" text-anchor="middle" font-family="Arial, sans-serif" font-size="25" font-weight="700" fill="#123246">${label}</text></svg>`)}`
}

const computerPartImages = {
  monitor: deviceImage("Monitor", "#047c86"),
  keyboard: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220"><rect width="320" height="220" rx="28" fill="#f8fafc"/><rect x="42" y="72" width="236" height="86" rx="16" fill="#047c86" opacity=".16"/><rect x="58" y="88" width="204" height="54" rx="10" fill="#ffffff" stroke="#047c86" stroke-width="7"/><g fill="#047c86" opacity=".8">${Array.from({ length: 24 }, (_, index) => `<rect x="${76 + (index % 8) * 21}" y="${101 + Math.floor(index / 8) * 12}" width="13" height="7" rx="2"/>`).join("")}</g><text x="160" y="184" text-anchor="middle" font-family="Arial, sans-serif" font-size="25" font-weight="700" fill="#123246">Keyboard</text></svg>`)}`,
  mouse: deviceImage("Mouse", "#f6b13d"),
  cpu: deviceImage("CPU", "#123246"),
  printer: deviceImage("Printer", "#047c86"),
  speakers: deviceImage("Speakers", "#f6b13d"),
}

// ─── Week 1 — Computer Fundamentals ────────────────────────────────────
const computerFundamentals: Track = {
  slug: 'computer-fundamentals',
  title: 'Computer Fundamentals',
  description: 'Learn what a computer is, its parts, input vs output devices, hardware vs software, and how to take care of your computer.',
  weekNumber: 1,
  icon: 'Monitor',
  lessons: [
    {
      slug: 'lesson-1',
      title: 'Introduction to Computers',
      topics: ['What is a computer?', 'Types of computers', 'Everyday uses'],
      activity: {
        type: 'quiz',
        questions: [
          { question: 'What is a computer?', options: ['A type of food', 'An electronic device that processes data', 'A musical instrument', 'A piece of furniture'], correctIndex: 1 },
          { question: 'Which of these is a type of computer?', options: ['Toaster', 'Laptop', 'Refrigerator', 'Bicycle'], correctIndex: 1 },
          { question: 'Which of these is an everyday use of computers?', options: ['Cooking food', 'Sending emails', 'Washing clothes', 'Planting trees'], correctIndex: 1 },
          { question: 'A smartphone is a type of computer.', options: ['True', 'False'], correctIndex: 0 },
          { question: 'What does a computer need to work?', options: ['Only electricity', 'Hardware and software', 'Only the internet', 'Only a keyboard'], correctIndex: 1 },
        ],
      },
    },
    {
      slug: 'lesson-2',
      title: 'Parts of a Computer',
      topics: ['Monitor', 'Keyboard', 'Mouse', 'CPU', 'Printer', 'Speakers'],
      activity: {
        type: 'drag-label',
        instruction: 'Drag each label to the correct part of the computer.',
        zones: [
          { id: 'monitor', label: 'Monitor', imageUrl: computerPartImages.monitor, imageAlt: 'Computer monitor illustration' },
          { id: 'keyboard', label: 'Keyboard', imageUrl: computerPartImages.keyboard, imageAlt: 'Computer keyboard illustration' },
          { id: 'mouse', label: 'Mouse', imageUrl: computerPartImages.mouse, imageAlt: 'Computer mouse illustration' },
          { id: 'cpu', label: 'CPU', imageUrl: computerPartImages.cpu, imageAlt: 'Computer CPU illustration' },
          { id: 'printer', label: 'Printer', imageUrl: computerPartImages.printer, imageAlt: 'Computer printer illustration' },
          { id: 'speakers', label: 'Speakers', imageUrl: computerPartImages.speakers, imageAlt: 'Computer speakers illustration' },
        ],
        items: [
          { id: 'label-monitor', label: 'Monitor', zone: 'monitor' },
          { id: 'label-keyboard', label: 'Keyboard', zone: 'keyboard' },
          { id: 'label-mouse', label: 'Mouse', zone: 'mouse' },
          { id: 'label-cpu', label: 'CPU', zone: 'cpu' },
          { id: 'label-printer', label: 'Printer', zone: 'printer' },
          { id: 'label-speakers', label: 'Speakers', zone: 'speakers' },
        ],
      },
    },
    {
      slug: 'lesson-3',
      title: 'Input vs Output Devices',
      topics: ['Input: Mouse, Keyboard, Scanner', 'Output: Printer, Speakers, Monitor'],
      activity: {
        type: 'drag-classify',
        instruction: 'Classify each device as an Input or Output device.',
        zones: [
          { id: 'input', label: 'Input Devices' },
          { id: 'output', label: 'Output Devices' },
        ],
        items: [
          { id: 'mouse', label: 'Mouse', zone: 'input' },
          { id: 'keyboard', label: 'Keyboard', zone: 'input' },
          { id: 'scanner', label: 'Scanner', zone: 'input' },
          { id: 'printer', label: 'Printer', zone: 'output' },
          { id: 'speakers', label: 'Speakers', zone: 'output' },
          { id: 'monitor', label: 'Monitor', zone: 'output' },
        ],
      },
    },
    {
      slug: 'lesson-4',
      title: 'Hardware vs Software',
      topics: ['Hardware: Mouse, Keyboard, Monitor', 'Software: Windows, Microsoft Word, Chrome'],
      activity: {
        type: 'drag-classify',
        instruction: 'Classify each item as Hardware or Software.',
        zones: [
          { id: 'hardware', label: 'Hardware' },
          { id: 'software', label: 'Software' },
        ],
        items: [
          { id: 'mouse', label: 'Mouse', zone: 'hardware' },
          { id: 'keyboard', label: 'Keyboard', zone: 'hardware' },
          { id: 'monitor', label: 'Monitor', zone: 'hardware' },
          { id: 'windows', label: 'Windows', zone: 'software' },
          { id: 'msword', label: 'Microsoft Word', zone: 'software' },
          { id: 'chrome', label: 'Chrome', zone: 'software' },
        ],
      },
    },
    {
      slug: 'lesson-5',
      title: 'Computer Care',
      topics: ['Clean computer properly', "Don't spill liquids", 'Shut down correctly', "Don't pull cables"],
      activity: {
        type: 'quiz',
        questions: [
          { question: 'What is the correct way to turn off a computer?', options: ['Pull the plug from the wall', 'Press and hold the power button', 'Use the Shut Down option in the menu', 'Close the lid and walk away'], correctIndex: 2 },
          { question: 'What should you avoid near a computer?', options: ['Books', 'Liquids', 'Pens', 'Headphones'], correctIndex: 1 },
          { question: 'How should you clean a computer screen?', options: ['With water and soap', 'With a soft, dry cloth', 'With a wet towel', 'You should never clean it'], correctIndex: 1 },
          { question: 'What happens if you pull cables roughly?', options: ['Nothing, cables are strong', 'It can damage the cable and port', 'It makes the computer faster', 'It charges the computer'], correctIndex: 1 },
          { question: 'Why is it important to take care of your computer?', options: ['So it looks pretty', 'So it lasts longer and works properly', 'So you can sell it', 'It is not important'], correctIndex: 1 },
        ],
      },
    },
  ],
  challenge: {
    slug: 'challenge',
    title: 'Computer Detective',
    description: 'Identify all computer parts within the time limit!',
    timeLimitSeconds: 120,
    activity: {
      type: 'drag-label',
      instruction: 'Race against the clock! Drag each label onto the correct computer part.',
      zones: [
        { id: 'monitor', label: 'Monitor' },
        { id: 'keyboard', label: 'Keyboard' },
        { id: 'mouse', label: 'Mouse' },
        { id: 'cpu', label: 'CPU' },
        { id: 'printer', label: 'Printer' },
        { id: 'speakers', label: 'Speakers' },
      ],
      items: [
        { id: 'label-monitor', label: 'Monitor', zone: 'monitor' },
        { id: 'label-keyboard', label: 'Keyboard', zone: 'keyboard' },
        { id: 'label-mouse', label: 'Mouse', zone: 'mouse' },
        { id: 'label-cpu', label: 'CPU', zone: 'cpu' },
        { id: 'label-printer', label: 'Printer', zone: 'printer' },
        { id: 'label-speakers', label: 'Speakers', zone: 'speakers' },
      ],
    },
  },
}

// ─── Week 2 — Digital Productivity ─────────────────────────────────────
const digitalProductivity: Track = {
  slug: 'digital-productivity',
  title: 'Microsoft Word & PowerPoint',
  description: 'Learn keyboard basics, practice typing, create documents in a rich-text editor, and build simple slide presentations.',
  weekNumber: 2,
  icon: 'FileText',
  lessons: [
    {
      slug: 'lesson-1',
      title: 'Keyboard Basics',
      topics: ['Keyboard layout', 'Home row keys', 'Special keys'],
      activity: {
        type: 'keyboard',
        instruction: 'Press the highlighted key on the keyboard to continue. Try to get them all right!',
      },
    },
    {
      slug: 'lesson-2',
      title: 'Typing Practice',
      topics: ['Words per minute (WPM)', 'Accuracy', 'Touch typing'],
      activity: {
        type: 'typing-test',
        instruction: 'Type the text shown below as quickly and accurately as you can.',
      },
    },
    {
      slug: 'lesson-3',
      title: 'Microsoft Word Basics',
      topics: ['Bold', 'Italic', 'Underline', 'Alignment', 'Bullets'],
      activity: {
        type: 'rich-text-editor',
        mission: 'Create a birthday invitation using bold, italic, and underline formatting. Add a bulleted list of party activities.',
        requiredFormats: ['bold', 'italic', 'underline', 'bullet'],
      },
    },
    {
      slug: 'lesson-4',
      title: 'PowerPoint Basics',
      topics: ['Adding slides', 'Text & images', 'Simple themes'],
      activity: {
        type: 'slide-editor',
        instruction: 'Create a 3-slide presentation: Slide 1 — Title, Slide 2 — Content, Slide 3 — Thank You.',
      },
    },
    {
      slug: 'lesson-5',
      title: 'Presentation Skills',
      topics: ['Good slide design', 'Readability', 'Using images', 'Avoiding too much text'],
      activity: {
        type: 'quiz',
        questions: [
          { question: 'What makes a good presentation slide?', options: ['Lots of small text', 'Clear headings and short points', 'No images at all', 'Only pictures'], correctIndex: 1 },
          { question: 'How many words should a slide have?', options: ['As many as possible', 'Only a few key points', 'An entire paragraph', 'No words, just colours'], correctIndex: 1 },
          { question: 'Why should you use images in a presentation?', options: ['To fill empty space', 'To help explain your ideas visually', 'Because text is boring', 'You should never use images'], correctIndex: 1 },
          { question: 'What font size is best for slide headings?', options: ['8pt', '12pt', '24pt or larger', '100pt'], correctIndex: 2 },
          { question: 'What should you avoid on a slide?', options: ['Pictures', 'Too much text', 'A title', 'Colours'], correctIndex: 1 },
        ],
      },
    },
  ],
  challenge: {
    slug: 'challenge',
    title: 'Office Skills Challenge',
    description: 'Complete a typing exercise, a Word formatting exercise, and create a 3-slide presentation.',
    activity: {
      type: 'quiz',
      questions: [
        { question: 'Which key combination makes text bold?', options: ['Ctrl + I', 'Ctrl + B', 'Ctrl + U', 'Ctrl + P'], correctIndex: 1 },
        { question: 'What does WPM stand for?', options: ['Words Per Month', 'Words Per Minute', 'Writing Per Moment', 'Work Per Minute'], correctIndex: 1 },
        { question: 'Which of these is NOT a formatting option in Word?', options: ['Bold', 'Italic', 'Compile', 'Underline'], correctIndex: 2 },
        { question: 'How many slides should a basic presentation have at minimum?', options: ['1', '2', '3', '10'], correctIndex: 2 },
        { question: 'What is the home row on a keyboard?', options: ['The top row of letters', 'ASDF JKL;', 'The number row', 'The space bar row'], correctIndex: 1 },
      ],
    },
  },
}

// ─── Week 3 — Data Skills ──────────────────────────────────────────────
const dataSkills: Track = {
  slug: 'data-skills',
  title: 'Data Skills',
  description: 'Learn how to handle data with pandas and visualize it with matplotlib in Python.',
  weekNumber: 3,
  icon: 'Monitor',
  lessons: [
    {
      slug: 'lesson-1',
      title: 'Introduction to Data',
      topics: ['Tabular data', 'DataFrames'],
      activity: {
        type: 'python-runner',
        instruction: 'Run the code below to see how a DataFrame looks.',
        initialCode: `import pandas as pd

data = {
    "name": ["Jane", "Brian", "Amina"],
    "score": [78, 84, 91]
}

df = pd.DataFrame(data)
print(df)`,
      },
    },
    {
      slug: 'lesson-2',
      title: 'Data Visualization',
      topics: ['matplotlib', 'Line charts', 'Bar charts'],
      activity: {
        type: 'python-runner',
        instruction: 'Let us plot the scores of the students. Click Run to see the chart.',
        initialCode: `import pandas as pd
import matplotlib.pyplot as plt

data = {
    "name": ["Jane", "Brian", "Amina"],
    "score": [78, 84, 91]
}

df = pd.DataFrame(data)
df.plot.bar(x="name", y="score")
plt.title("Student Scores")
plt.show()`,
      },
    }
  ],
  challenge: {
    slug: 'challenge',
    title: 'Data Science Challenge',
    description: 'Use pandas to load data and matplotlib to plot it.',
    activity: {
      type: 'python-runner',
      instruction: 'Create a DataFrame with columns "Item" and "Cost" and plot a bar chart.',
      initialCode: '# Write your code here',
    },
  },
}

// ─── Week 4 — Digital Citizenship & Graphic Design ───────────────────────
const digitalCitizenship: Track = {
  slug: 'digital-citizenship',
  title: 'Digital Citizenship & Graphic Design',
  description: 'Learn how to stay safe online and create beautiful digital designs.',
  weekNumber: 4,
  icon: 'Monitor',
  lessons: [
    {
      slug: 'lesson-1',
      title: 'Online Safety',
      topics: ['Phishing', 'Passwords', 'Privacy'],
      activity: {
        type: 'scenario-question',
        scenario: "You receive a message from someone you don't know asking for your password. What should you do?",
        options: ['Send the password', 'Ignore/report the message', 'Ask for their password', 'Share it with friends'],
        correctIndex: 1,
      },
    },
    {
      slug: 'lesson-2',
      title: 'Graphic Design with Canva',
      topics: ['Layouts', 'Colors', 'Typography'],
      activity: {
        type: 'external-link',
        title: 'Open Canva',
        url: 'https://canva.com',
        instruction: 'Create a simple poster design using Canva, then return here and mark as complete.',
      },
    },
    {
      slug: 'lesson-3',
      title: 'HTML & CSS Preview',
      topics: ['HTML structure', 'CSS styling', 'Web design'],
      activity: {
        type: 'html-preview',
        instruction: 'Modify the HTML and CSS below to see live changes.',
        initialHtml: `<h1>My Poster</h1>
<p>Welcome to my design.</p>`,
        initialCss: `h1 {
    color: blue;
    font-size: 32px;
}`
      },
    }
  ]
}

// ─── Week 5 — AI & Prompt Engineering ───────────────────────────────────
const aiAndPrompting: Track = {
  slug: 'ai-and-prompting',
  title: 'AI & Prompt Engineering',
  description: 'Learn what AI can and cannot do, then write clear, safe prompts that help you learn.',
  weekNumber: 5,
  icon: 'Sparkles',
  lessons: [
    { slug: 'lesson-1', title: 'What Is AI?', topics: ['AI helpers', 'Strengths and limits', 'Checking answers'], activity: { type: 'quiz', questions: [
      { question: 'What is a good way to use an AI helper?', options: ['Ask it to do all your work secretly', 'Use it for ideas, then check and improve the answer', 'Share private passwords with it', 'Believe every answer without thinking'], correctIndex: 1 },
      { question: 'What should you avoid putting in a prompt?', options: ['A clear question', 'Your home address or password', 'The topic you are studying', 'The format you want'], correctIndex: 1 },
      { question: 'Why should you check an AI answer?', options: ['AI can sometimes make mistakes', 'AI answers are always perfect', 'Checking is impossible', 'It makes the computer slower'], correctIndex: 0 },
    ] } },
    { slug: 'lesson-2', title: 'Writing Clear Prompts', topics: ['Goal', 'Context', 'Format'], activity: { type: 'ai-chat', instruction: 'Try a learning question. Include a topic, what you need help with, and the format you want. Never share private information.', starterPrompt: 'Explain the water cycle in three short bullet points for a student.' } },
    { slug: 'lesson-3', title: 'Improve a Prompt', topics: ['Specific details', 'Audience', 'Revision'], activity: { type: 'quiz', questions: [
      { question: 'Which prompt is clearest?', options: ['Tell me stuff', 'Help', 'Explain how plants make food in four simple steps for a Grade 6 student', 'Do my homework'], correctIndex: 2 },
      { question: 'What can you add when an answer is too difficult?', options: ['Ask for simpler words and an example', 'Share a password', 'Give up immediately', 'Ask for a secret'], correctIndex: 0 },
    ] } },
  ],
  challenge: { slug: 'challenge', title: 'Prompt Builder Challenge', description: 'Identify the prompt that gives a helpful, safe, and specific request.', activity: { type: 'quiz', questions: [
    { question: 'Choose the best learning prompt.', options: ['Do everything for me', 'Explain fractions using a pizza example in five short sentences', 'Here is my password, help me', 'Tell me the answer'], correctIndex: 1 },
    { question: 'Which detail makes a prompt more useful?', options: ['The audience and desired format', 'A private phone number', 'Nothing at all', 'A random password'], correctIndex: 0 },
    { question: 'After using AI, what should you do?', options: ['Check the answer and make it your own', 'Copy it without reading', 'Share personal details', 'Assume it cannot be wrong'], correctIndex: 0 },
  ] } },
}

// ─── Week 6 — Coding & Arduino Basics ───────────────────────────────────
const codingAndArduino: Track = {
  slug: 'coding-and-arduino', title: 'Coding & Arduino Basics', description: 'Build programming logic with Python and explore circuits in a Wokwi simulation.', weekNumber: 6, icon: 'CircuitBoard',
  lessons: [
    { slug: 'lesson-1', title: 'Boolean Logic', topics: ['True and False', 'Conditions', 'LED state'], activity: { type: 'python-runner', instruction: 'Run the code, then change the LED state and observe the output.', initialCode: 'led_on = True\nprint("LED on:", led_on)\n\nled_on = False\nprint("LED on:", led_on)' } },
    { slug: 'lesson-2', title: 'Blink Logic', topics: ['Sequence', 'Repeating steps', 'Outputs'], activity: { type: 'python-runner', instruction: 'Use Python to describe a blinking LED sequence. This is programming logic, not Arduino code.', initialCode: 'states = ["ON", "OFF", "ON", "OFF"]\nfor state in states:\n    print("LED", state)' } },
    { slug: 'lesson-3', title: 'Explore a Circuit', topics: ['Arduino board', 'LED', 'Simulation'], activity: { type: 'wokwi-embed', title: 'Wokwi Arduino blink simulation', instruction: 'Explore this Wokwi circuit simulation. Wokwi runs the circuit separately; Python is not used to run Arduino code.', src: 'https://wokwi.com/projects/344892214309536340' } },
    { slug: 'lesson-4', title: 'Circuit Diagram Quiz', topics: ['Power', 'Ground', 'Components'], activity: { type: 'quiz', questions: [
      { question: 'What does an LED do in a circuit?', options: ['It gives off light', 'It stores passwords', 'It measures distance', 'It types code'], correctIndex: 0 },
      { question: 'Why does a simple LED circuit need a complete path?', options: ['So electricity can flow', 'So it can connect to Wi-Fi', 'To make Python run', 'To upload a video'], correctIndex: 0 },
    ] } },
  ],
  challenge: { slug: 'challenge', title: 'Blink Logic Challenge', description: 'Write a Python sequence that prints ON and OFF states for an LED.', activity: { type: 'python-runner', instruction: 'Create a sequence that prints both "ON" and "OFF". Python checks your logic only.', initialCode: '# Write your blink sequence here\n' } },
}

// ─── Week 7 — Traffic Light & Sensors ───────────────────────────────────
const trafficAndSensors: Track = {
  slug: 'traffic-and-sensors', title: 'Traffic Light & Sensors', description: 'Use Python decision logic to model traffic lights and learn how distance sensors work.', weekNumber: 7, icon: 'TrafficCone',
  lessons: [
    { slug: 'lesson-1', title: 'Traffic Light Logic', topics: ['Sequence', 'Timing', 'States'], activity: { type: 'python-runner', instruction: 'Run this traffic-light sequence, then adjust the order. This models logic in Python.', initialCode: 'for light in ["RED", "GREEN", "YELLOW"]:\n    print(light)' } },
    { slug: 'lesson-2', title: 'Sensor Decision Tree', topics: ['Distance', 'if/else', 'Safe choices'], activity: { type: 'python-runner', instruction: 'Test different distances and see the safe decision.', initialCode: 'distance = 15\n\nif distance < 10:\n    print("STOP")\nelif distance < 20:\n    print("SLOW")\nelse:\n    print("GO")' } },
    { slug: 'lesson-3', title: 'Sensor Science', topics: ['Ultrasonic sensors', 'Echoes', 'Distance'], activity: { type: 'youtube-embed', title: 'How ultrasonic sensors work', instruction: 'Watch the demonstration, then explain how an ultrasonic sensor uses sound to estimate distance.', videoId: 'ZejQOX69K5M' } },
  ],
  challenge: { slug: 'challenge', title: 'Safe Crossing Challenge', description: 'Use an if/elif/else decision tree to print STOP, SLOW, or GO for a distance.', activity: { type: 'python-runner', instruction: 'Set distance, then print STOP when it is below 10, SLOW below 20, otherwise GO.', initialCode: 'distance = 15\n# Write your decision tree here\n' } },
}



// ─── Export ─────────────────────────────────────────────────────────────
export const tracks: Track[] = [computerFundamentals, digitalProductivity, dataSkills, digitalCitizenship, aiAndPrompting, codingAndArduino, trafficAndSensors]

export function getTrack(slug: string): Track | undefined {
  return tracks.find((t) => t.slug === slug)
}

export function getLesson(trackSlug: string, lessonSlug: string): Lesson | undefined {
  return getTrack(trackSlug)?.lessons.find((l) => l.slug === lessonSlug)
}

export function getChallenge(trackSlug: string): Challenge | undefined {
  return getTrack(trackSlug)?.challenge
}
