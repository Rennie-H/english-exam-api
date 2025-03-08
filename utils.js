const fs = require("fs");
const path = require("path");

const VOCABULARY_PATH = path.join(__dirname, "vocabulary.json");

const VOCAB_DIFFICULTY_RATIO = {
    easy: 0.0,     // 0% 高年级词汇
    medium: 0.1,   // 10% 高年级词汇
    hard: 0.3      // 30% 高年级词汇
};

const SENTENCE_COMPLEXITY = {
    easy: "Use simple sentences (subject-verb-object). Avoid complex clauses.",
    medium: "Use compound sentences with 'but', 'and', 'or', 'because'.",
    hard: "Use complex sentences with relative clauses like 'which', 'when', 'who', 'that'."
};


function loadVocabulary(grade, vocabDifficulty) {
    try {
        const data = fs.readFileSync(VOCABULARY_PATH, "utf-8");
        const vocabData = JSON.parse(data);

        console.log("📂 Successfully loaded vocabulary.json!"); // 确保文件被读取

        // **按年级分类词汇**
        let gradeDict = {};
        vocabData.forEach(entry => {
            if (!gradeDict[entry.Grade]) {
                gradeDict[entry.Grade] = [];
            }
            gradeDict[entry.Grade].push(entry.Word);
        });

        // **确保每个年级的词汇不超过 100 个**
        for (let g in gradeDict) {
            gradeDict[g] = gradeDict[g].sort(() => 0.5 - Math.random()).slice(0, 100);
        }

        // **词汇划分**
        const mainVocab = gradeDict[grade] || []; // 本年级词汇
        const lowVocab = Object.keys(gradeDict)
            .filter(g => g < grade)
            .flatMap(g => gradeDict[g]); // 低年级词汇
        const highVocab = Object.keys(gradeDict)
            .filter(g => g > grade)
            .flatMap(g => gradeDict[g]); // 高年级词汇

        // **确定高年级单词占比**
        const highWordRatio = VOCAB_DIFFICULTY_RATIO[vocabDifficulty];
        const totalWords = 100;
        const highWordCount = Math.round(totalWords * highWordRatio);
        const mainWordCount = totalWords - highWordCount;

        // **从本年级词汇优先抽取**
        let selectedMainVocab = mainVocab.sort(() => 0.5 - Math.random()).slice(0, mainWordCount);
        if (selectedMainVocab.length < mainWordCount) {
            selectedMainVocab = selectedMainVocab.concat(
                lowVocab.sort(() => 0.5 - Math.random()).slice(0, mainWordCount - selectedMainVocab.length)
            );
        }

        // **随机选取高年级词汇**
        const selectedHighVocab = highVocab.sort(() => 0.5 - Math.random()).slice(0, highWordCount);

        // **最终词汇表**
        const finalVocab = [...selectedMainVocab, ...selectedHighVocab];

        return finalVocab;
    } catch (error) {
        console.error("❌ Error loading vocabulary:", error);
        return [];
    }
}

module.exports = { loadVocabulary, VOCAB_DIFFICULTY_RATIO, SENTENCE_COMPLEXITY };