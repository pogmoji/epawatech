-- ============================================================
-- Migration 004b — Master Curriculum Seed
-- ePawatech — Stage 2
-- ============================================================
-- Seeded from lib/curriculum.ts (Weeks 1–7) and components/projects/
-- (Week 8 — Final Projects & Showcase).
-- UUIDs are hardcoded as stable identifiers. Do NOT regenerate them.
-- ============================================================

-- ─── Weeks ───────────────────────────────────────────────────
INSERT INTO curriculum_weeks (id, week_number, title, description, icon, sort_order) VALUES
  ('01000000-0000-0000-0000-000000000001', 1, 'Computer Fundamentals',
   'Learn what a computer is, its parts, input vs output devices, hardware vs software, and how to take care of your computer.',
   'Monitor', 1),
  ('01000000-0000-0000-0000-000000000002', 2, 'Microsoft Word & PowerPoint',
   'Learn keyboard basics, practice typing, create documents in a rich-text editor, and build simple slide presentations.',
   'FileText', 2),
  ('01000000-0000-0000-0000-000000000003', 3, 'Data Skills',
   'Learn how to handle data with pandas and visualize it with matplotlib in Python.',
   'Monitor', 3),
  ('01000000-0000-0000-0000-000000000004', 4, 'Digital Citizenship & Graphic Design',
   'Learn how to stay safe online and create beautiful digital designs.',
   'Monitor', 4),
  ('01000000-0000-0000-0000-000000000005', 5, 'AI & Prompt Engineering',
   'Learn what AI can and cannot do, then write clear, safe prompts that help you learn.',
   'Sparkles', 5),
  ('01000000-0000-0000-0000-000000000006', 6, 'Coding & Arduino Basics',
   'Build programming logic with Python and explore circuits in a Wokwi simulation.',
   'CircuitBoard', 6),
  ('01000000-0000-0000-0000-000000000007', 7, 'Traffic Light & Sensors',
   'Use Python decision logic to model traffic lights and learn how distance sensors work.',
   'TrafficCone', 7),
  ('01000000-0000-0000-0000-000000000008', 8, 'Final Projects & Showcase',
   'Submit your final project and present it to the community in the public showcase.',
   'Star', 8);

-- ─── Modules ─────────────────────────────────────────────────
INSERT INTO curriculum_modules (id, week_id, slug, title, description, sort_order) VALUES
  -- Week 1
  ('02000000-0000-0000-0000-000000000001',
   '01000000-0000-0000-0000-000000000001',
   'computer-fundamentals', 'Computer Fundamentals',
   'Learn what a computer is, its parts, input vs output devices, hardware vs software, and how to take care of your computer.',
   1),
  -- Week 2
  ('02000000-0000-0000-0000-000000000002',
   '01000000-0000-0000-0000-000000000002',
   'digital-productivity', 'Microsoft Word & PowerPoint',
   'Learn keyboard basics, practice typing, create documents in a rich-text editor, and build simple slide presentations.',
   1),
  -- Week 3
  ('02000000-0000-0000-0000-000000000003',
   '01000000-0000-0000-0000-000000000003',
   'data-skills', 'Data Skills',
   'Learn how to handle data with pandas and visualize it with matplotlib in Python.',
   1),
  -- Week 4
  ('02000000-0000-0000-0000-000000000004',
   '01000000-0000-0000-0000-000000000004',
   'digital-citizenship', 'Digital Citizenship & Graphic Design',
   'Learn how to stay safe online and create beautiful digital designs.',
   1),
  -- Week 5
  ('02000000-0000-0000-0000-000000000005',
   '01000000-0000-0000-0000-000000000005',
   'ai-and-prompting', 'AI & Prompt Engineering',
   'Learn what AI can and cannot do, then write clear, safe prompts that help you learn.',
   1),
  -- Week 6
  ('02000000-0000-0000-0000-000000000006',
   '01000000-0000-0000-0000-000000000006',
   'coding-and-arduino', 'Coding & Arduino Basics',
   'Build programming logic with Python and explore circuits in a Wokwi simulation.',
   1),
  -- Week 7
  ('02000000-0000-0000-0000-000000000007',
   '01000000-0000-0000-0000-000000000007',
   'traffic-and-sensors', 'Traffic Light & Sensors',
   'Use Python decision logic to model traffic lights and learn how distance sensors work.',
   1),
  -- Week 8
  ('02000000-0000-0000-0000-000000000008',
   '01000000-0000-0000-0000-000000000008',
   'final-projects-showcase', 'Final Projects & Showcase',
   'Submit a photo of your project and an optional YouTube link. Every submission is reviewed before it appears in the public showcase.',
   1);

-- ─── Lessons ─────────────────────────────────────────────────
-- Week 1 — Computer Fundamentals
INSERT INTO curriculum_lessons (id, module_id, slug, title, topics, sort_order, is_challenge, time_limit_seconds) VALUES
  ('03010000-0000-0000-0000-000000000001', '02000000-0000-0000-0000-000000000001',
   'lesson-1', 'Introduction to Computers',
   ARRAY['What is a computer?', 'Types of computers', 'Everyday uses'],
   1, FALSE, NULL),
  ('03010000-0000-0000-0000-000000000002', '02000000-0000-0000-0000-000000000001',
   'lesson-2', 'Parts of a Computer',
   ARRAY['Monitor', 'Keyboard', 'Mouse', 'CPU', 'Printer', 'Speakers'],
   2, FALSE, NULL),
  ('03010000-0000-0000-0000-000000000003', '02000000-0000-0000-0000-000000000001',
   'lesson-3', 'Input vs Output Devices',
   ARRAY['Input: Mouse, Keyboard, Scanner', 'Output: Printer, Speakers, Monitor'],
   3, FALSE, NULL),
  ('03010000-0000-0000-0000-000000000004', '02000000-0000-0000-0000-000000000001',
   'lesson-4', 'Hardware vs Software',
   ARRAY['Hardware: Mouse, Keyboard, Monitor', 'Software: Windows, Microsoft Word, Chrome'],
   4, FALSE, NULL),
  ('03010000-0000-0000-0000-000000000005', '02000000-0000-0000-0000-000000000001',
   'lesson-5', 'Computer Care',
   ARRAY['Clean computer properly', 'Don''t spill liquids', 'Shut down correctly', 'Don''t pull cables'],
   5, FALSE, NULL),
  ('03010000-0000-0000-0000-000000000006', '02000000-0000-0000-0000-000000000001',
   'challenge', 'Computer Detective',
   ARRAY[]::TEXT[], 6, TRUE, 120);

-- Week 2 — Digital Productivity
INSERT INTO curriculum_lessons (id, module_id, slug, title, topics, sort_order, is_challenge, time_limit_seconds) VALUES
  ('03020000-0000-0000-0000-000000000001', '02000000-0000-0000-0000-000000000002',
   'lesson-1', 'Keyboard Basics',
   ARRAY['Keyboard layout', 'Home row keys', 'Special keys'],
   1, FALSE, NULL),
  ('03020000-0000-0000-0000-000000000002', '02000000-0000-0000-0000-000000000002',
   'lesson-2', 'Typing Practice',
   ARRAY['Words per minute (WPM)', 'Accuracy', 'Touch typing'],
   2, FALSE, NULL),
  ('03020000-0000-0000-0000-000000000003', '02000000-0000-0000-0000-000000000002',
   'lesson-3', 'Microsoft Word Basics',
   ARRAY['Bold', 'Italic', 'Underline', 'Alignment', 'Bullets'],
   3, FALSE, NULL),
  ('03020000-0000-0000-0000-000000000004', '02000000-0000-0000-0000-000000000002',
   'lesson-4', 'PowerPoint Basics',
   ARRAY['Adding slides', 'Text & images', 'Simple themes'],
   4, FALSE, NULL),
  ('03020000-0000-0000-0000-000000000005', '02000000-0000-0000-0000-000000000002',
   'lesson-5', 'Presentation Skills',
   ARRAY['Good slide design', 'Readability', 'Using images', 'Avoiding too much text'],
   5, FALSE, NULL),
  ('03020000-0000-0000-0000-000000000006', '02000000-0000-0000-0000-000000000002',
   'challenge', 'Office Skills Challenge',
   ARRAY[]::TEXT[], 6, TRUE, NULL);

-- Week 3 — Data Skills
INSERT INTO curriculum_lessons (id, module_id, slug, title, topics, sort_order, is_challenge, time_limit_seconds) VALUES
  ('03030000-0000-0000-0000-000000000001', '02000000-0000-0000-0000-000000000003',
   'lesson-1', 'Introduction to Data',
   ARRAY['Tabular data', 'DataFrames'],
   1, FALSE, NULL),
  ('03030000-0000-0000-0000-000000000002', '02000000-0000-0000-0000-000000000003',
   'lesson-2', 'Data Visualization',
   ARRAY['matplotlib', 'Line charts', 'Bar charts'],
   2, FALSE, NULL),
  ('03030000-0000-0000-0000-000000000003', '02000000-0000-0000-0000-000000000003',
   'challenge', 'Data Science Challenge',
   ARRAY[]::TEXT[], 3, TRUE, NULL);

-- Week 4 — Digital Citizenship
INSERT INTO curriculum_lessons (id, module_id, slug, title, topics, sort_order, is_challenge, time_limit_seconds) VALUES
  ('03040000-0000-0000-0000-000000000001', '02000000-0000-0000-0000-000000000004',
   'lesson-1', 'Online Safety',
   ARRAY['Phishing', 'Passwords', 'Privacy'],
   1, FALSE, NULL),
  ('03040000-0000-0000-0000-000000000002', '02000000-0000-0000-0000-000000000004',
   'lesson-2', 'Graphic Design with Canva',
   ARRAY['Layouts', 'Colors', 'Typography'],
   2, FALSE, NULL),
  ('03040000-0000-0000-0000-000000000003', '02000000-0000-0000-0000-000000000004',
   'lesson-3', 'HTML & CSS Preview',
   ARRAY['HTML structure', 'CSS styling', 'Web design'],
   3, FALSE, NULL);

-- Week 5 — AI & Prompt Engineering
INSERT INTO curriculum_lessons (id, module_id, slug, title, topics, sort_order, is_challenge, time_limit_seconds) VALUES
  ('03050000-0000-0000-0000-000000000001', '02000000-0000-0000-0000-000000000005',
   'lesson-1', 'What Is AI?',
   ARRAY['AI helpers', 'Strengths and limits', 'Checking answers'],
   1, FALSE, NULL),
  ('03050000-0000-0000-0000-000000000002', '02000000-0000-0000-0000-000000000005',
   'lesson-2', 'Writing Clear Prompts',
   ARRAY['Goal', 'Context', 'Format'],
   2, FALSE, NULL),
  ('03050000-0000-0000-0000-000000000003', '02000000-0000-0000-0000-000000000005',
   'lesson-3', 'Improve a Prompt',
   ARRAY['Specific details', 'Audience', 'Revision'],
   3, FALSE, NULL),
  ('03050000-0000-0000-0000-000000000004', '02000000-0000-0000-0000-000000000005',
   'challenge', 'Prompt Builder Challenge',
   ARRAY[]::TEXT[], 4, TRUE, NULL);

-- Week 6 — Coding & Arduino Basics
INSERT INTO curriculum_lessons (id, module_id, slug, title, topics, sort_order, is_challenge, time_limit_seconds) VALUES
  ('03060000-0000-0000-0000-000000000001', '02000000-0000-0000-0000-000000000006',
   'lesson-1', 'Boolean Logic',
   ARRAY['True and False', 'Conditions', 'LED state'],
   1, FALSE, NULL),
  ('03060000-0000-0000-0000-000000000002', '02000000-0000-0000-0000-000000000006',
   'lesson-2', 'Blink Logic',
   ARRAY['Sequence', 'Repeating steps', 'Outputs'],
   2, FALSE, NULL),
  ('03060000-0000-0000-0000-000000000003', '02000000-0000-0000-0000-000000000006',
   'lesson-3', 'Explore a Circuit',
   ARRAY['Arduino board', 'LED', 'Simulation'],
   3, FALSE, NULL),
  ('03060000-0000-0000-0000-000000000004', '02000000-0000-0000-0000-000000000006',
   'lesson-4', 'Circuit Diagram Quiz',
   ARRAY['Power', 'Ground', 'Components'],
   4, FALSE, NULL),
  ('03060000-0000-0000-0000-000000000005', '02000000-0000-0000-0000-000000000006',
   'challenge', 'Blink Logic Challenge',
   ARRAY[]::TEXT[], 5, TRUE, NULL);

-- Week 7 — Traffic Light & Sensors
INSERT INTO curriculum_lessons (id, module_id, slug, title, topics, sort_order, is_challenge, time_limit_seconds) VALUES
  ('03070000-0000-0000-0000-000000000001', '02000000-0000-0000-0000-000000000007',
   'lesson-1', 'Traffic Light Logic',
   ARRAY['Sequence', 'Timing', 'States'],
   1, FALSE, NULL),
  ('03070000-0000-0000-0000-000000000002', '02000000-0000-0000-0000-000000000007',
   'lesson-2', 'Sensor Decision Tree',
   ARRAY['Distance', 'if/else', 'Safe choices'],
   2, FALSE, NULL),
  ('03070000-0000-0000-0000-000000000003', '02000000-0000-0000-0000-000000000007',
   'lesson-3', 'Sensor Science',
   ARRAY['Ultrasonic sensors', 'Echoes', 'Distance'],
   3, FALSE, NULL),
  ('03070000-0000-0000-0000-000000000004', '02000000-0000-0000-0000-000000000007',
   'challenge', 'Safe Crossing Challenge',
   ARRAY[]::TEXT[], 4, TRUE, NULL);

-- Week 8 — Final Projects & Showcase
INSERT INTO curriculum_lessons (id, module_id, slug, title, topics, sort_order, is_challenge, time_limit_seconds) VALUES
  ('03080000-0000-0000-0000-000000000001', '02000000-0000-0000-0000-000000000008',
   'submission', 'Submit Your Project',
   ARRAY['Project documentation', 'Photo evidence', 'Video demonstration'],
   1, FALSE, NULL);

-- ─── Lesson Activities ────────────────────────────────────────
-- Each row is the full activity payload (matches LessonActivity union type).

-- Week 1, Lesson 1: quiz
INSERT INTO lesson_activities (id, lesson_id, activity_type, configuration, sort_order) VALUES
  ('04010100-0000-0000-0000-000000000001', '03010000-0000-0000-0000-000000000001',
   'quiz', '{
     "questions": [
       {"question": "What is a computer?", "options": ["A type of food", "An electronic device that processes data", "A musical instrument", "A piece of furniture"], "correctIndex": 1},
       {"question": "Which of these is a type of computer?", "options": ["Toaster", "Laptop", "Refrigerator", "Bicycle"], "correctIndex": 1},
       {"question": "Which of these is an everyday use of computers?", "options": ["Cooking food", "Sending emails", "Washing clothes", "Planting trees"], "correctIndex": 1},
       {"question": "A smartphone is a type of computer.", "options": ["True", "False"], "correctIndex": 0},
       {"question": "What does a computer need to work?", "options": ["Only electricity", "Hardware and software", "Only the internet", "Only a keyboard"], "correctIndex": 1}
     ]
   }', 0);

-- Week 1, Lesson 2: drag-label (Parts of a Computer)
INSERT INTO lesson_activities (id, lesson_id, activity_type, configuration, sort_order) VALUES
  ('04010200-0000-0000-0000-000000000001', '03010000-0000-0000-0000-000000000002',
   'drag-label', '{
     "instruction": "Drag each label to the correct part of the computer.",
     "zones": [
       {"id": "monitor", "label": "Monitor"}, {"id": "keyboard", "label": "Keyboard"},
       {"id": "mouse", "label": "Mouse"}, {"id": "cpu", "label": "CPU"},
       {"id": "printer", "label": "Printer"}, {"id": "speakers", "label": "Speakers"}
     ],
     "items": [
       {"id": "label-monitor", "label": "Monitor", "zone": "monitor"},
       {"id": "label-keyboard", "label": "Keyboard", "zone": "keyboard"},
       {"id": "label-mouse", "label": "Mouse", "zone": "mouse"},
       {"id": "label-cpu", "label": "CPU", "zone": "cpu"},
       {"id": "label-printer", "label": "Printer", "zone": "printer"},
       {"id": "label-speakers", "label": "Speakers", "zone": "speakers"}
     ]
   }', 0);

-- Week 1, Lesson 3: drag-classify (Input vs Output)
INSERT INTO lesson_activities (id, lesson_id, activity_type, configuration, sort_order) VALUES
  ('04010300-0000-0000-0000-000000000001', '03010000-0000-0000-0000-000000000003',
   'drag-classify', '{
     "instruction": "Classify each device as an Input or Output device.",
     "zones": [{"id": "input", "label": "Input Devices"}, {"id": "output", "label": "Output Devices"}],
     "items": [
       {"id": "mouse", "label": "Mouse", "zone": "input"},
       {"id": "keyboard", "label": "Keyboard", "zone": "input"},
       {"id": "scanner", "label": "Scanner", "zone": "input"},
       {"id": "printer", "label": "Printer", "zone": "output"},
       {"id": "speakers", "label": "Speakers", "zone": "output"},
       {"id": "monitor", "label": "Monitor", "zone": "output"}
     ]
   }', 0);

-- Week 1, Lesson 4: drag-classify (Hardware vs Software)
INSERT INTO lesson_activities (id, lesson_id, activity_type, configuration, sort_order) VALUES
  ('04010400-0000-0000-0000-000000000001', '03010000-0000-0000-0000-000000000004',
   'drag-classify', '{
     "instruction": "Classify each item as Hardware or Software.",
     "zones": [{"id": "hardware", "label": "Hardware"}, {"id": "software", "label": "Software"}],
     "items": [
       {"id": "mouse", "label": "Mouse", "zone": "hardware"},
       {"id": "keyboard", "label": "Keyboard", "zone": "hardware"},
       {"id": "monitor", "label": "Monitor", "zone": "hardware"},
       {"id": "windows", "label": "Windows", "zone": "software"},
       {"id": "msword", "label": "Microsoft Word", "zone": "software"},
       {"id": "chrome", "label": "Chrome", "zone": "software"}
     ]
   }', 0);

-- Week 1, Lesson 5: quiz (Computer Care)
INSERT INTO lesson_activities (id, lesson_id, activity_type, configuration, sort_order) VALUES
  ('04010500-0000-0000-0000-000000000001', '03010000-0000-0000-0000-000000000005',
   'quiz', '{
     "questions": [
       {"question": "What is the correct way to turn off a computer?", "options": ["Pull the plug from the wall", "Press and hold the power button", "Use the Shut Down option in the menu", "Close the lid and walk away"], "correctIndex": 2},
       {"question": "What should you avoid near a computer?", "options": ["Books", "Liquids", "Pens", "Headphones"], "correctIndex": 1},
       {"question": "How should you clean a computer screen?", "options": ["With water and soap", "With a soft, dry cloth", "With a wet towel", "You should never clean it"], "correctIndex": 1},
       {"question": "What happens if you pull cables roughly?", "options": ["Nothing, cables are strong", "It can damage the cable and port", "It makes the computer faster", "It charges the computer"], "correctIndex": 1},
       {"question": "Why is it important to take care of your computer?", "options": ["So it looks pretty", "So it lasts longer and works properly", "So you can sell it", "It is not important"], "correctIndex": 1}
     ]
   }', 0);

-- Week 1, Challenge: drag-label (Computer Detective)
INSERT INTO lesson_activities (id, lesson_id, activity_type, configuration, sort_order) VALUES
  ('04010600-0000-0000-0000-000000000001', '03010000-0000-0000-0000-000000000006',
   'drag-label', '{
     "instruction": "Race against the clock! Drag each label onto the correct computer part.",
     "zones": [
       {"id": "monitor", "label": "Monitor"}, {"id": "keyboard", "label": "Keyboard"},
       {"id": "mouse", "label": "Mouse"}, {"id": "cpu", "label": "CPU"},
       {"id": "printer", "label": "Printer"}, {"id": "speakers", "label": "Speakers"}
     ],
     "items": [
       {"id": "label-monitor", "label": "Monitor", "zone": "monitor"},
       {"id": "label-keyboard", "label": "Keyboard", "zone": "keyboard"},
       {"id": "label-mouse", "label": "Mouse", "zone": "mouse"},
       {"id": "label-cpu", "label": "CPU", "zone": "cpu"},
       {"id": "label-printer", "label": "Printer", "zone": "printer"},
       {"id": "label-speakers", "label": "Speakers", "zone": "speakers"}
     ]
   }', 0);

-- Week 2, Lesson 1: keyboard
INSERT INTO lesson_activities (id, lesson_id, activity_type, configuration, sort_order) VALUES
  ('04020100-0000-0000-0000-000000000001', '03020000-0000-0000-0000-000000000001',
   'keyboard', '{"instruction": "Press the highlighted key on the keyboard to continue. Try to get them all right!"}', 0);

-- Week 2, Lesson 2: typing-test
INSERT INTO lesson_activities (id, lesson_id, activity_type, configuration, sort_order) VALUES
  ('04020200-0000-0000-0000-000000000001', '03020000-0000-0000-0000-000000000002',
   'typing-test', '{"instruction": "Type the text shown below as quickly and accurately as you can."}', 0);

-- Week 2, Lesson 3: rich-text-editor
INSERT INTO lesson_activities (id, lesson_id, activity_type, configuration, sort_order) VALUES
  ('04020300-0000-0000-0000-000000000001', '03020000-0000-0000-0000-000000000003',
   'rich-text-editor', '{
     "mission": "Create a birthday invitation using bold, italic, and underline formatting. Add a bulleted list of party activities.",
     "requiredFormats": ["bold", "italic", "underline", "bullet"]
   }', 0);

-- Week 2, Lesson 4: slide-editor
INSERT INTO lesson_activities (id, lesson_id, activity_type, configuration, sort_order) VALUES
  ('04020400-0000-0000-0000-000000000001', '03020000-0000-0000-0000-000000000004',
   'slide-editor', '{"instruction": "Create a 3-slide presentation: Slide 1 — Title, Slide 2 — Content, Slide 3 — Thank You."}', 0);

-- Week 2, Lesson 5: quiz (Presentation Skills)
INSERT INTO lesson_activities (id, lesson_id, activity_type, configuration, sort_order) VALUES
  ('04020500-0000-0000-0000-000000000001', '03020000-0000-0000-0000-000000000005',
   'quiz', '{
     "questions": [
       {"question": "What makes a good presentation slide?", "options": ["Lots of small text", "Clear headings and short points", "No images at all", "Only pictures"], "correctIndex": 1},
       {"question": "How many words should a slide have?", "options": ["As many as possible", "Only a few key points", "An entire paragraph", "No words, just colours"], "correctIndex": 1},
       {"question": "Why should you use images in a presentation?", "options": ["To fill empty space", "To help explain your ideas visually", "Because text is boring", "You should never use images"], "correctIndex": 1},
       {"question": "What font size is best for slide headings?", "options": ["8pt", "12pt", "24pt or larger", "100pt"], "correctIndex": 2},
       {"question": "What should you avoid on a slide?", "options": ["Pictures", "Too much text", "A title", "Colours"], "correctIndex": 1}
     ]
   }', 0);

-- Week 2, Challenge: quiz (Office Skills Challenge)
INSERT INTO lesson_activities (id, lesson_id, activity_type, configuration, sort_order) VALUES
  ('04020600-0000-0000-0000-000000000001', '03020000-0000-0000-0000-000000000006',
   'quiz', '{
     "questions": [
       {"question": "Which key combination makes text bold?", "options": ["Ctrl + I", "Ctrl + B", "Ctrl + U", "Ctrl + P"], "correctIndex": 1},
       {"question": "What does WPM stand for?", "options": ["Words Per Month", "Words Per Minute", "Writing Per Moment", "Work Per Minute"], "correctIndex": 1},
       {"question": "Which of these is NOT a formatting option in Word?", "options": ["Bold", "Italic", "Compile", "Underline"], "correctIndex": 2},
       {"question": "How many slides should a basic presentation have at minimum?", "options": ["1", "2", "3", "10"], "correctIndex": 2},
       {"question": "What is the home row on a keyboard?", "options": ["The top row of letters", "ASDF JKL;", "The number row", "The space bar row"], "correctIndex": 1}
     ]
   }', 0);

-- Week 3, Lesson 1: python-runner
INSERT INTO lesson_activities (id, lesson_id, activity_type, configuration, sort_order) VALUES
  ('04030100-0000-0000-0000-000000000001', '03030000-0000-0000-0000-000000000001',
   'python-runner', '{
     "instruction": "Run the code below to see how a DataFrame looks.",
     "initialCode": "import pandas as pd\n\ndata = {\n    \"name\": [\"Jane\", \"Brian\", \"Amina\"],\n    \"score\": [78, 84, 91]\n}\n\ndf = pd.DataFrame(data)\nprint(df)"
   }', 0);

-- Week 3, Lesson 2: python-runner
INSERT INTO lesson_activities (id, lesson_id, activity_type, configuration, sort_order) VALUES
  ('04030200-0000-0000-0000-000000000001', '03030000-0000-0000-0000-000000000002',
   'python-runner', '{
     "instruction": "Let us plot the scores of the students. Click Run to see the chart.",
     "initialCode": "import pandas as pd\nimport matplotlib.pyplot as plt\n\ndata = {\n    \"name\": [\"Jane\", \"Brian\", \"Amina\"],\n    \"score\": [78, 84, 91]\n}\n\ndf = pd.DataFrame(data)\ndf.plot.bar(x=\"name\", y=\"score\")\nplt.title(\"Student Scores\")\nplt.show()"
   }', 0);

-- Week 3, Challenge: python-runner
INSERT INTO lesson_activities (id, lesson_id, activity_type, configuration, sort_order) VALUES
  ('04030300-0000-0000-0000-000000000001', '03030000-0000-0000-0000-000000000003',
   'python-runner', '{
     "instruction": "Create a DataFrame with columns \"Item\" and \"Cost\" and plot a bar chart.",
     "initialCode": "# Write your code here"
   }', 0);

-- Week 4, Lesson 1: scenario-question
INSERT INTO lesson_activities (id, lesson_id, activity_type, configuration, sort_order) VALUES
  ('04040100-0000-0000-0000-000000000001', '03040000-0000-0000-0000-000000000001',
   'scenario-question', '{
     "scenario": "You receive a message from someone you don''t know asking for your password. What should you do?",
     "options": ["Send the password", "Ignore/report the message", "Ask for their password", "Share it with friends"],
     "correctIndex": 1
   }', 0);

-- Week 4, Lesson 2: external-link (Canva)
INSERT INTO lesson_activities (id, lesson_id, activity_type, configuration, sort_order) VALUES
  ('04040200-0000-0000-0000-000000000001', '03040000-0000-0000-0000-000000000002',
   'external-link', '{
     "title": "Open Canva",
     "url": "https://canva.com",
     "instruction": "Create a simple poster design using Canva, then return here and mark as complete."
   }', 0);

-- Week 4, Lesson 3: html-preview
INSERT INTO lesson_activities (id, lesson_id, activity_type, configuration, sort_order) VALUES
  ('04040300-0000-0000-0000-000000000001', '03040000-0000-0000-0000-000000000003',
   'html-preview', '{
     "instruction": "Modify the HTML and CSS below to see live changes.",
     "initialHtml": "<h1>My Poster</h1>\n<p>Welcome to my design.</p>",
     "initialCss": "h1 {\n    color: blue;\n    font-size: 32px;\n}"
   }', 0);

-- Week 5, Lesson 1: quiz (What Is AI?)
INSERT INTO lesson_activities (id, lesson_id, activity_type, configuration, sort_order) VALUES
  ('04050100-0000-0000-0000-000000000001', '03050000-0000-0000-0000-000000000001',
   'quiz', '{
     "questions": [
       {"question": "What is a good way to use an AI helper?", "options": ["Ask it to do all your work secretly", "Use it for ideas, then check and improve the answer", "Share private passwords with it", "Believe every answer without thinking"], "correctIndex": 1},
       {"question": "What should you avoid putting in a prompt?", "options": ["A clear question", "Your home address or password", "The topic you are studying", "The format you want"], "correctIndex": 1},
       {"question": "Why should you check an AI answer?", "options": ["AI can sometimes make mistakes", "AI answers are always perfect", "Checking is impossible", "It makes the computer slower"], "correctIndex": 0}
     ]
   }', 0);

-- Week 5, Lesson 2: ai-chat
INSERT INTO lesson_activities (id, lesson_id, activity_type, configuration, sort_order) VALUES
  ('04050200-0000-0000-0000-000000000001', '03050000-0000-0000-0000-000000000002',
   'ai-chat', '{
     "instruction": "Try a learning question. Include a topic, what you need help with, and the format you want. Never share private information.",
     "starterPrompt": "Explain the water cycle in three short bullet points for a student."
   }', 0);

-- Week 5, Lesson 3: quiz (Improve a Prompt)
INSERT INTO lesson_activities (id, lesson_id, activity_type, configuration, sort_order) VALUES
  ('04050300-0000-0000-0000-000000000001', '03050000-0000-0000-0000-000000000003',
   'quiz', '{
     "questions": [
       {"question": "Which prompt is clearest?", "options": ["Tell me stuff", "Help", "Explain how plants make food in four simple steps for a Grade 6 student", "Do my homework"], "correctIndex": 2},
       {"question": "What can you add when an answer is too difficult?", "options": ["Ask for simpler words and an example", "Share a password", "Give up immediately", "Ask for a secret"], "correctIndex": 0}
     ]
   }', 0);

-- Week 5, Challenge: quiz (Prompt Builder Challenge)
INSERT INTO lesson_activities (id, lesson_id, activity_type, configuration, sort_order) VALUES
  ('04050400-0000-0000-0000-000000000001', '03050000-0000-0000-0000-000000000004',
   'quiz', '{
     "questions": [
       {"question": "Choose the best learning prompt.", "options": ["Do everything for me", "Explain fractions using a pizza example in five short sentences", "Here is my password, help me", "Tell me the answer"], "correctIndex": 1},
       {"question": "Which detail makes a prompt more useful?", "options": ["The audience and desired format", "A private phone number", "Nothing at all", "A random password"], "correctIndex": 0},
       {"question": "After using AI, what should you do?", "options": ["Check the answer and make it your own", "Copy it without reading", "Share personal details", "Assume it cannot be wrong"], "correctIndex": 0}
     ]
   }', 0);

-- Week 6, Lesson 1: python-runner (Boolean Logic)
INSERT INTO lesson_activities (id, lesson_id, activity_type, configuration, sort_order) VALUES
  ('04060100-0000-0000-0000-000000000001', '03060000-0000-0000-0000-000000000001',
   'python-runner', '{
     "instruction": "Run the code, then change the LED state and observe the output.",
     "initialCode": "led_on = True\nprint(\"LED on:\", led_on)\n\nled_on = False\nprint(\"LED on:\", led_on)"
   }', 0);

-- Week 6, Lesson 2: python-runner (Blink Logic)
INSERT INTO lesson_activities (id, lesson_id, activity_type, configuration, sort_order) VALUES
  ('04060200-0000-0000-0000-000000000001', '03060000-0000-0000-0000-000000000002',
   'python-runner', '{
     "instruction": "Use Python to describe a blinking LED sequence. This is programming logic, not Arduino code.",
     "initialCode": "states = [\"ON\", \"OFF\", \"ON\", \"OFF\"]\nfor state in states:\n    print(\"LED\", state)"
   }', 0);

-- Week 6, Lesson 3: wokwi-embed
INSERT INTO lesson_activities (id, lesson_id, activity_type, configuration, sort_order) VALUES
  ('04060300-0000-0000-0000-000000000001', '03060000-0000-0000-0000-000000000003',
   'wokwi-embed', '{
     "title": "Wokwi Arduino blink simulation",
     "instruction": "Explore this Wokwi circuit simulation. Wokwi runs the circuit separately; Python is not used to run Arduino code.",
     "src": "https://wokwi.com/projects/344892214309536340"
   }', 0);

-- Week 6, Lesson 4: quiz (Circuit Diagram Quiz)
INSERT INTO lesson_activities (id, lesson_id, activity_type, configuration, sort_order) VALUES
  ('04060400-0000-0000-0000-000000000001', '03060000-0000-0000-0000-000000000004',
   'quiz', '{
     "questions": [
       {"question": "What does an LED do in a circuit?", "options": ["It gives off light", "It stores passwords", "It measures distance", "It types code"], "correctIndex": 0},
       {"question": "Why does a simple LED circuit need a complete path?", "options": ["So electricity can flow", "So it can connect to Wi-Fi", "To make Python run", "To upload a video"], "correctIndex": 0}
     ]
   }', 0);

-- Week 6, Challenge: python-runner (Blink Logic Challenge)
INSERT INTO lesson_activities (id, lesson_id, activity_type, configuration, sort_order) VALUES
  ('04060500-0000-0000-0000-000000000001', '03060000-0000-0000-0000-000000000005',
   'python-runner', '{
     "instruction": "Create a sequence that prints both \"ON\" and \"OFF\". Python checks your logic only.",
     "initialCode": "# Write your blink sequence here\n"
   }', 0);

-- Week 7, Lesson 1: python-runner (Traffic Light Logic)
INSERT INTO lesson_activities (id, lesson_id, activity_type, configuration, sort_order) VALUES
  ('04070100-0000-0000-0000-000000000001', '03070000-0000-0000-0000-000000000001',
   'python-runner', '{
     "instruction": "Run this traffic-light sequence, then adjust the order. This models logic in Python.",
     "initialCode": "for light in [\"RED\", \"GREEN\", \"YELLOW\"]:\n    print(light)"
   }', 0);

-- Week 7, Lesson 2: python-runner (Sensor Decision Tree)
INSERT INTO lesson_activities (id, lesson_id, activity_type, configuration, sort_order) VALUES
  ('04070200-0000-0000-0000-000000000001', '03070000-0000-0000-0000-000000000002',
   'python-runner', '{
     "instruction": "Test different distances and see the safe decision.",
     "initialCode": "distance = 15\n\nif distance < 10:\n    print(\"STOP\")\nelif distance < 20:\n    print(\"SLOW\")\nelse:\n    print(\"GO\")"
   }', 0);

-- Week 7, Lesson 3: youtube-embed (Sensor Science)
INSERT INTO lesson_activities (id, lesson_id, activity_type, configuration, sort_order) VALUES
  ('04070300-0000-0000-0000-000000000001', '03070000-0000-0000-0000-000000000003',
   'youtube-embed', '{
     "title": "How ultrasonic sensors work",
     "instruction": "Watch the demonstration, then explain how an ultrasonic sensor uses sound to estimate distance.",
     "videoId": "ZejQOX69K5M"
   }', 0);

-- Week 7, Challenge: python-runner (Safe Crossing Challenge)
INSERT INTO lesson_activities (id, lesson_id, activity_type, configuration, sort_order) VALUES
  ('04070400-0000-0000-0000-000000000001', '03070000-0000-0000-0000-000000000004',
   'python-runner', '{
     "instruction": "Set distance, then print STOP when it is below 10, SLOW below 20, otherwise GO.",
     "initialCode": "distance = 15\n# Write your decision tree here\n"
   }', 0);

-- Week 8, Submission: external-link (Final Projects)
INSERT INTO lesson_activities (id, lesson_id, activity_type, configuration, sort_order) VALUES
  ('04080100-0000-0000-0000-000000000001', '03080000-0000-0000-0000-000000000001',
   'external-link', '{
     "title": "Final Projects & Showcase",
     "url": "/projects",
     "instruction": "Submit a photo of your project and an optional YouTube link. Every submission is reviewed before it appears in the public showcase."
   }', 0);
