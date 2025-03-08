const axios = require("axios");
const { loadVocabulary, VOCAB_DIFFICULTY_RATIO, SENTENCE_COMPLEXITY } = require("./utils");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function generateQuestions(grade, questionType, number, vocabularyList, vocabDifficulty, sentenceDifficulty, inferenceDifficulty) {
    try {
        const vocabString = vocabularyList.join(", ");
        const sentenceRule = SENTENCE_COMPLEXITY[sentenceDifficulty];

        let prompt = "";
        
        
        if (questionType === "完形填空") {
            prompt = `
            Generate ${number}  200-word cloze test passage for grade ${grade} students.
            Each passage should have **10 blanks**, where **each blank requires a single missing word**.
            Each blank must have **four multiple-choice answer options (A, B, C, D)**.

            **Sentence Complexity:** ${sentenceRule}.

            **Vocabulary Reference:** Use these words as much as possible:
            [${vocabString}]

            **Format:**
            ### **Passage:**
            {Generated passage with 10 blanks, numbered (e.g., "The boy went to the ___ (1) after school.")}

            ### **Questions:**
            1. (1)
              - A) Option 1
              - B) Option 2
              - C) Option 3
              - D) Option 4
            ...
            10. (10)
              - A) Option 1
              - B) Option 2
              - C) Option 3
              - D) Option 4

            **Answer Key:**
            1. Correct Answer
            2. Correct Answer
            ...
            10. Correct Answer
            `;
        }   else if (questionType === "听力理解-短对话") {
            prompt = `
            You are an AI English test generator for students in a public school system.
            Your task is to create ${number}  short dialogue listening comprehension question for grade ${grade} students.

            **Sentence Complexity:** ${sentenceRule}.
            **Vocabulary Complexity:** ${vocabDifficulty}.

            **Each Short Dialogue Listening Comprehension Rules:**
            - Generate a short conversation between two speakers (2-4 sentences).
            - The dialogue should be natural and cover **everyday situations**.
            - Generate **one** multiple-choice question (A, B, C, D).
            - Ensure that the answer choices are **plausible but only one is correct**.

            **Format:**
            ### **Listening Script:**
            {Generated short conversation}

            **Question:**
            1. {Question about the dialogue}
              - A) {Option A}
              - B) {Option B}
              - C) {Option C}
              - D) {Option D}

            **Answer Key:** {Correct Answer}
            `;
        } else if (questionType === "听力理解-长对话") {
            prompt = `
            You are an AI English test generator for students in a public school system.
            Your task is to create ${number}  long dialogue listening comprehension passage for grade ${grade} students.

            **Sentence Complexity:** ${sentenceRule}.
            **Vocabulary Complexity:** ${vocabDifficulty}.

            **Each Long Dialogue Listening Comprehension Rules:**
            - Generate a long conversation (150-250 words) between two speakers.
            - The conversation should be **natural and related to real-life situations** (e.g., school, family, shopping, travel, hobbies).
            - Generate **three** multiple-choice questions (A, B, C, D).
            - Ensure each question tests **different aspects** of the dialogue (e.g., main idea, details, inference).

            **Format:**
            ### **Listening Script:**
            {Generated long conversation}

            **Questions:**
            1. {Question 1 about the dialogue}
              - A) {Option A}
              - B) {Option B}
              - C) {Option C}
              - D) {Option D}

            2. {Question 2 about the dialogue}
              - A) {Option A}
              - B) {Option B}
              - C) {Option C}
              - D) {Option D}

            3. {Question 3 about the dialogue}
              - A) {Option A}
              - B) {Option B}
              - C) {Option C}
              - D) {Option D}

            **Answer Key:**
            1. {Correct Answer for Q1}
            2. {Correct Answer for Q2}
            3. {Correct Answer for Q3}
            `;
        }  else if (questionType === "作文") {
            prompt = `
            You are an AI English writing test generator for students in a public school system.
            Your task is to create ${number} writing task for ${grade} grade students.

            **Difficulty Level:** The difficulty should be appropriate for ${grade} grade students.
            The vocabulary should primarily focus on ${grade} grade words, while also including words from previous grades if necessary.

            **Sentence Complexity:** ${sentenceRule}.
            **Vocabulary Reference:** ${vocabDifficulty}.

            **Writing Task:**
            - Provide a **writing prompt** suitable for grade ${grade}.
            - Generate a **sample essay** (120-300 words depending on the grade level).
            - Ensure it follows good writing structure and vocabulary usage.

            **Format:**
            ### Writing Prompt
            {Generated writing topic}

            ### Sample Essay
            {A well-structured sample essay}
            `;
        } else {
            prompt = `
            Generate ${number} ${questionType} questions for grade ${grade} students.

            **Sentence Complexity:** ${sentenceRule}.
            **Vocabulary Reference:** Use these words as much as possible:
            [${vocabString}]

            **Format:**
            ### Part 1: Questions
            1. {Question 1}
            2. {Question 2}
            ...
            ${number}. {Question N}

            ### Part 2: Answers
            1. {Answer 1}
            2. {Answer 2}
            ...
            ${number}. {Answer N}
            `;
        }

        const response = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
                model: "gpt-4",
                messages: [
                    { role: "system", content: "You are an AI English test generator." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7,
            },
            {
                headers: {
                    Authorization: `Bearer ${OPENAI_API_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );

        return response.data.choices[0].message.content;
    } catch (error) {
        console.error("OpenAI API Error:", error.response?.data || error.message);
        throw new Error("Failed to generate questions");
    }
}

// **导出 generateQuestions**
module.exports = { generateQuestions };