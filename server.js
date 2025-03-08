require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const path = require("path");
const fs = require("fs");
const { loadVocabulary } = require("./utils"); // 从 utils.js 读取 loadVocabulary
const { generateQuestions } = require("./generate-questions"); // 确保能正确引入 generateQuestions



const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const EXAM_TEMPLATE_PATH = path.join(__dirname, "exam_templates.json");


// 允许的年级范围
const VALID_GRADES = [7, 8, 9];

// 可选难度
const VALID_DIFFICULTIES = ["easy", "medium", "hard"];

// 词汇难度参数
const VOCAB_DIFFICULTY_RATIO = {
    easy: 0.0,
    medium: 0.1,
    hard: 0.3
};

// 句型难度参数
const SENTENCE_COMPLEXITY = {
    easy: "Use simple sentences (subject-verb-object). Avoid complex clauses.",
    medium: "Use compound sentences with 'but', 'and', 'or', 'because'.",
    hard: "Use complex sentences with relative clauses like 'which', 'when', 'who', 'that'."
};

// 加载模拟考试模板
function loadExamTemplate() {
    try {
        const EXAM_TEMPLATE_PATH = path.join(__dirname, "exam_templates.json");
        const data = fs.readFileSync(EXAM_TEMPLATE_PATH, "utf-8");
        console.log("📂 Successfully loaded exam_templates.json!");
        return JSON.parse(data);
    } catch (error) {
        console.error("❌ Error loading exam template:", error);
        return null;
    }
}


// 加载词汇 JSON 并返回匹配的词汇列表
app.get("/get-vocabulary", (req, res) => {
    try {
        const { grade, vocabDifficulty = "medium" } = req.query;

        if (!grade) {
            return res.status(400).json({ error: "Missing 'grade' parameter" });
        }

        const vocabularyList = loadVocabulary(parseInt(grade), vocabDifficulty);
        res.json({ grade, vocabDifficulty, vocabularyList });
    } catch (error) {
        console.error("❌ Error loading vocabulary:", error);
        res.status(500).json({ error: "Failed to load vocabulary" });
    }
});


// 生成试题 API
app.post("/generate-questions", async (req, res) => {
    try {
        const { grade, questionType, number, vocabDifficulty, sentenceDifficulty, inferenceDifficulty } = req.body;

        if (!VALID_GRADES.includes(grade)) {
            return res.status(400).json({ error: "Invalid grade. Choose from 7, 8, or 9." });
        }

        if (!VALID_DIFFICULTIES.includes(vocabDifficulty) || !VALID_DIFFICULTIES.includes(sentenceDifficulty) || !VALID_DIFFICULTIES.includes(inferenceDifficulty)) {
            return res.status(400).json({ error: "Invalid difficulty level. Choose from easy, medium, or hard." });
        }

        // **加载词汇表**
        const vocabularyList = loadVocabulary(grade, vocabDifficulty);
        const vocabString = vocabularyList.join(", ");

        // **获取句子复杂度**
        const sentenceRule = SENTENCE_COMPLEXITY[sentenceDifficulty];

        let prompt = "";

        if (questionType === "完形填空") {
            prompt = `
            Generate ${number} 200-word cloze test passage for grade ${grade} students.
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
            Your task is to create ${number} short dialogue listening comprehension question for grade ${grade} students.

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
            Your task is to create ${number} long dialogue listening comprehension passage for grade ${grade} students.

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
                model: "gpt-4o",
                messages: [
                    { role: "system", content: "You are an AI English test generator." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7,
            },
            {
                headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" }
            }
        );

        res.json({ questions: response.data.choices[0].message.content });
    } catch (error) {
        console.error("OpenAI API Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to generate questions" });
    }
});

// 生成完整考试
app.post("/generate-exam", async (req, res) => {
    try {
        const { grade, vocabDifficulty = "medium", sentenceDifficulty = "medium", inferenceDifficulty = "medium" } = req.body;

        // 加载考试模板
        const examTemplate = loadExamTemplate();
        if (!examTemplate) {
            return res.status(500).json({ error: "Failed to load exam template" });
        }

        // 加载词汇表
        const vocabularyList = loadVocabulary(grade, vocabDifficulty);
        const examSections = examTemplate.exam_template.sections;
        let examPaper = [];

        for (const section of examSections) {
            console.log(`⏳ 正在生成试卷部分: ${section.name}`);
            const questionType = section.question_type;
            const numQuestions = section.num_questions;
            const questionsPerPassage = section.questions_per_passage || 3; // 默认 3 题

            let sectionQuestions = [];

            if (questionType.includes("听力理解-短对话")) {
                for (let i = 0; i < numQuestions; i++) {
                    const question = await generateQuestions(grade, "听力理解-短对话", 1, vocabularyList, vocabDifficulty, sentenceDifficulty, inferenceDifficulty);
                    sectionQuestions.push(question);
                }
            } else if (questionType.includes("听力理解-长对话")) {
                for (let i = 0; i < numQuestions; i++) {
                    const question = await generateQuestions(grade, "听力理解-长对话", questionsPerPassage, vocabularyList, vocabDifficulty, sentenceDifficulty, inferenceDifficulty);
                    sectionQuestions.push(question);
                }
            } else if (questionType.includes("阅读理解")) {
                for (let i = 0; i < numQuestions; i++) {
                    const question = await generateQuestions(grade, questionType, questionsPerPassage, vocabularyList, vocabDifficulty, sentenceDifficulty, inferenceDifficulty);
                    sectionQuestions.push(question);
                }
            } else {
                for (let i = 0; i < numQuestions; i++) {
                    const question = await generateQuestions(grade, questionType, 1, vocabularyList, vocabDifficulty, sentenceDifficulty, inferenceDifficulty);
                    sectionQuestions.push(question);
                }
            }

            examPaper.push({
                sectionName: section.name,
                questions: sectionQuestions,
            });

            console.log(`✅ 生成完成: ${section.name}, 题目数量: ${numQuestions}`);
        }

        console.log(`🎯 试卷生成完成！`);
        res.json({ examPaper });
    } catch (error) {
        console.error("OpenAI API Error:", error);
        res.status(500).json({ error: "Failed to generate exam" });
    }
});



// 启动服务器
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
