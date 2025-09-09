class AIService {
    constructor() {
        this.apiUrl = CONFIG.AI_API_URL;
        this.modelName = CONFIG.MODEL_NAME;
        this.isOnline = false;
        this.useFallback = false;
        this.storiesCache = null;
    }

    async checkConnection() {
        try {
            const testPayload = {
                model: this.modelName,
                messages: [
                    {
                        role: "user",
                        content: "Hi"
                    }
                ],
                max_tokens: 5,
                temperature: 0.1
            };

            const response = await fetch(`${this.apiUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(testPayload)
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('LM Studio connected:', data);
                this.isOnline = true;
                this.useFallback = false;
                return true;
            } else {
                const errorText = await response.text();
                console.error('LM Studio error:', errorText);
            }
        } catch (error) {
            console.error('Connection failed:', error);
        }
        
        this.isOnline = false;
        this.useFallback = true;
        return false;
    }

    async loadStoriesFromFile() {
        if (this.storiesCache) {
            return this.storiesCache;
        }

        try {
            const response = await fetch('/data/stories.json');
            const data = await response.json();

            if (!Array.isArray(data) || data.length === 0) {
                throw new Error('Invalid or empty story data');
            }

            this.storiesCache = data;
            return data;
        } catch (error) {
            console.error('Failed to load stories from file:', error);
            return this.getDefaultStories();
        }
    }

    getDefaultStories() {
        return [
            {
                tale: "กระต่ายกับเต่าแข่งวิ่งกัน กระต่ายวิ่งเร็วแต่ประมาท นอนหลับระหว่างทาง เต่าเดินช้าแต่ไม่หยุดพัก สุดท้ายเต่าชนะการแข่งขัน",
                moral: "ความพยายามและความอดทนย่อมเอาชนะความสามารถที่ขาดความมุ่งมั่น"
            },
            {
                tale: "เด็กชายเลี้ยงแกะ ชอบหลอกชาวบ้านว่ามีหมาป่ามา พอหมาป่ามาจริงๆ ไม่มีใครเชื่อ แกะถูกหมาป่ากิน",
                moral: "คนที่ชอบโกหกจะไม่มีใครเชื่อแม้จะพูดความจริง"
            }
        ];
    }

    async loadRandomStoryFromFile() {
        const stories = await this.loadStoriesFromFile();
        const randomIndex = Math.floor(Math.random() * stories.length);
        return stories[randomIndex];
    }

    async loadFewShotExamples(count = 10) {
        const stories = await this.loadStoriesFromFile();
        const shuffled = [...stories].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    createStoryFewShotPrompt(examples, category, theme) {
        let prompt = "นี่คือตัวอย่างนิทานและข้อคิดที่ดี:\n\n";
        
        examples.forEach((example, index) => {
            prompt += `ตัวอย่างที่ ${index + 1}:\n`;
            prompt += `นิทาน: ${example.tale}\n`;
            prompt += `ข้อคิด: ${example.moral}\n\n`;
        });
        
        prompt += `ตอนนี้ กรุณาเขียนนิทานใหม่ประเภท "${category}" ในหัวข้อ "${theme}" ในรูปแบบเดียวกัน\n`;
        prompt += `ให้ตอบในรูปแบบนี้เท่านั้น:\n`;
        prompt += `นิทาน: [เขียนนิทานสั้นๆ ประมาณ 5-8 ประโยค ที่มีต้น กลาง จบ]\n`;
        prompt += `ข้อคิด: [เขียนข้อคิดที่ได้จากนิทาน 1 ประโยค]\n`;
        
        return prompt;
    }

    parseStoryResponse(content) {
        try {
            const lines = content.split('\n').filter(line => line.trim());
            let tale = '';
            let moral = '';
            
            for (const line of lines) {
                const trimmedLine = line.trim();
                
                if (trimmedLine.startsWith('นิทาน:')) {
                    tale = trimmedLine.substring(6).trim();
                } else if (trimmedLine.startsWith('ข้อคิด:')) {
                    moral = trimmedLine.substring(6).trim();
                }
            }
            
            if (tale && moral) {
                return {
                    tale: tale,
                    moral: moral
                };
            }
            
            throw new Error('Failed to parse story format');
        } catch (error) {
            console.error('Parse error:', error);
            return null;
        }
    }

    async generateStory(category, theme) {
        if (this.useFallback) {
            return await this.getFallbackStory(category, theme);
        }

        const examples = await this.loadFewShotExamples(3);
        
        const systemPrompt = `You are a Thai storyteller for children. You must write stories in Thai language only.
Your stories should follow this exact pattern:
- A short tale (นิทาน) with a clear beginning, middle, and end (5-7 sentences)
- A moral lesson (ข้อคิด) that summarizes the teaching from the story (7-8 sentence)
- Stories should be appropriate for children and educational`;

        const userPrompt = this.createStoryFewShotPrompt(examples, category, theme);
        
        try {
            const payload = {
                model: this.modelName,
                messages: [
                    {
                        role: "system",
                        content: systemPrompt
                    },
                    {
                        role: "user", 
                        content: userPrompt
                    }
                ],
                max_tokens: 500,
                temperature: 0.8,
                top_p: 0.9,
                stream: false
            };

            console.log('Sending story request with few-shot examples');

            const response = await fetch(`${this.apiUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Story generation error:', errorText);
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            console.log('Story response:', data);

            if (data.choices && data.choices[0] && data.choices[0].message) {
                const parsedStory = this.parseStoryResponse(data.choices[0].message.content);
                if (parsedStory) {
                    return parsedStory.tale;
                }
            }
            
            throw new Error('Invalid response format');
        } catch (error) {
            console.error('Error generating story:', error);
            return await this.getFallbackStory(category, theme);
        }
    }

    createQuestionFewShotPrompt(story, storyExamples) {
        let prompt = `ตัวอย่างการสร้างคำถามจากนิทาน:\n\n`;
        
        // Add examples from actual stories
        storyExamples.slice(0, 2).forEach((example, index) => {
            const questionTypes = [
                `ข้อคิดจากนิทานนี้คืออะไร?`,
                `นิทานนี้สอนให้เรารู้ว่าอะไร?`,
                `บทเรียนสำคัญจากเรื่องนี้คืออะไร?`
            ];
            
            prompt += `ตัวอย่างที่ ${index + 1}:\n`;
            prompt += `นิทาน: "${example.tale}"\n`;
            prompt += `คำถาม: ${questionTypes[index % questionTypes.length]}\n`;
            
            // Generate wrong options
            const wrongOptions = this.getWrongMorals(example.moral, storyExamples);
            const allOptions = [...wrongOptions.slice(0, 3), example.moral];
            const shuffled = allOptions.sort(() => 0.5 - Math.random());
            const correctIndex = shuffled.indexOf(example.moral);
            
            shuffled.forEach((option, idx) => {
                const letter = ['ก', 'ข', 'ค', 'ง'][idx];
                prompt += `${letter}. ${option}\n`;
            });
            
            prompt += `ตอบ: ${['ก', 'ข', 'ค', 'ง'][correctIndex]}\n`;
            prompt += `ข้อคิด: ${example.moral}\n\n`;
        });
        
        // Add the actual request
        prompt += `ตอนนี้ จากนิทานนี้: "${story}"\n\n`;
        prompt += `กรุณาสร้างคำถามข้อคิด 1 ข้อ พร้อมตัวเลือก 4 ข้อ ในรูปแบบเดียวกัน:\n`;
        prompt += `คำถาม: [คำถามเกี่ยวกับข้อคิดหรือบทเรียนจากนิทาน]\n`;
        prompt += `ก. [ตัวเลือก 1]\n`;
        prompt += `ข. [ตัวเลือก 2]\n`;
        prompt += `ค. [ตัวเลือก 3]\n`;
        prompt += `ง. [ตัวเลือก 4]\n`;
        prompt += `ตอบ: [ก/ข/ค/ง]\n`;
        prompt += `ข้อคิด: [ข้อคิดที่ถูกต้อง]\n`;
        
        return prompt;
    }

    getWrongMorals(correctMoral, allStories) {
        const allMorals = allStories.map(s => s.moral).filter(m => m !== correctMoral);
        const shuffled = allMorals.sort(() => 0.5 - Math.random());
        
        // If not enough different morals, add some generic ones
        const genericMorals = [
            "ความโลภนำมาซึ่งความพินาศ",
            "ความซื่อสัตย์เป็นสิ่งสำคัญ",
            "ความพยายามนำไปสู่ความสำเร็จ",
            "การให้อภัยเป็นคุณธรรมที่สูงส่ง",
            "ความอดทนเป็นกุญแจสู่ความสำเร็จ",
            "มิตรภาพที่แท้จริงมีค่ามากกว่าทองคำ"
        ].filter(m => m !== correctMoral);
        
        return [...shuffled, ...genericMorals].slice(0, 5);
    }

    async generateQuestion(story, category) {
        if (this.useFallback) {
            return await this.getFallbackQuestion(category);
        }

        const storyExamples = await this.loadFewShotExamples(3);
        
        const systemPrompt = "You are a Thai language teacher creating questions about fables or stories. Reply in Thai only. Format your response exactly as requested.";
        const userPrompt = this.createQuestionFewShotPrompt(story, storyExamples);
        
        try {
            const payload = {
                model: this.modelName,
                messages: [
                    {
                        role: "system",
                        content: systemPrompt
                    },
                    {
                        role: "user",
                        content: userPrompt
                    }
                ],
                max_tokens: 400,
                temperature: 0.3,
                top_p: 0.7,
                stream: false
            };

            console.log('Sending question request with few-shot examples');

            const response = await fetch(`${this.apiUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Question generation error:', errorText);
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            console.log('Question response:', data);

            if (data.choices && data.choices[0] && data.choices[0].message) {
                const content = data.choices[0].message.content;
                return this.parseQuestionResponse(content);
            }
            
            throw new Error('Invalid response format');
        } catch (error) {
            console.error('Error generating question:', error);
            return await this.getFallbackQuestion(category);
        }
    }

    parseQuestionResponse(content) {
        try {
            console.log('Parsing response:', content);
            
            const lines = content.split('\n').filter(line => line.trim());
            let question = '';
            let options = [];
            let correct = 0;
            let moral = '';

            for (const line of lines) {
                const trimmedLine = line.trim();
                
                if (trimmedLine.startsWith('คำถาม:')) {
                    question = trimmedLine.substring(6).trim();
                } else if (trimmedLine.match(/^[ก-ง]\s*\./)) {
                    options.push(trimmedLine.substring(2).trim());
                } else if (trimmedLine.startsWith('ตอบ:')) {
                    const answer = trimmedLine.substring(4).trim().toLowerCase();
                    correct = ['ก', 'ข', 'ค', 'ง'].indexOf(answer.charAt(0));
                } else if (trimmedLine.startsWith('ข้อคิด:')) {
                    moral = trimmedLine.substring(7).trim();
                }
            }

                        if (question && options.length === 4 && correct >= 0 && correct < 4 && moral) {
                return {
                    question: question,
                    options: options,
                    correct: correct,
                    moral: moral
                };
            }

            console.warn('Failed to parse, using default');
            return this.createDefaultQuestion();
        } catch (error) {
            console.error('Parse error:', error);
            return this.createDefaultQuestion();
        }
    }

    async generateQuestionSet(category) {
        const questions = [];
        const themes = STORY_CATEGORIES[category].themes;
        let themeIndex = 0;
        
        for (let i = 0; i < 10; i++) {
            const theme = themes[themeIndex % themes.length];
            themeIndex++;

            try {
                // Update progress
                if (window.updateLoadingProgress) {
                    window.updateLoadingProgress(i, 10, 'กำลังสร้างนิทาน...');
                }

                // Generate story
                const story = await this.generateStory(category, theme);
                
                // Small delay to avoid rate limiting
                await this.delay(1000);
                
                // Update progress
                if (window.updateLoadingProgress) {
                    window.updateLoadingProgress(i, 10, 'กำลังสร้างคำถาม...');
                }

                // Generate question
                const questionData = await this.generateQuestion(story, category);
                
                questions.push({
                    story: {
                        title: `${STORY_CATEGORIES[category].name} - ${theme}`,
                        content: story
                    },
                    question: questionData.question,
                    options: questionData.options,
                    correct: questionData.correct,
                    moral: questionData.moral
                });

                // Update progress
                if (window.updateLoadingProgress) {
                    window.updateLoadingProgress(i + 1, 10, 'เสร็จแล้ว');
                }
                
                // Small delay
                await this.delay(500);
            } catch (error) {
                console.error(`Error generating question ${i + 1}:`, error);
                // Use fallback
                const fallback = await this.getFallbackQuestionSet(category);
                questions.push(fallback[i % fallback.length]);
            }
        }

        return questions;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Fallback methods
    async getFallbackStory(category, theme) {
        const story = await this.loadRandomStoryFromFile();
        return story.tale;
    }

    async getFallbackQuestion(category) {
        const story = await this.loadRandomStoryFromFile();
        const allStories = await this.loadStoriesFromFile();
        
        // Create varied questions based on the moral
        const questionTemplates = [
            "ข้อคิดจากนิทานนี้คืออะไร?",
            "นิทานนี้สอนให้เรารู้ว่าอะไร?",
            "บทเรียนสำคัญจากเรื่องนี้คืออะไร?",
            "เราได้เรียนรู้อะไรจากนิทานนี้?",
            "สิ่งที่นิทานต้องการสื่อคืออะไร?"
        ];
        
        // Generate options that include the correct moral
        const options = this.generateOptionsFromMoral(story.moral, allStories);
        
        return {
            question: questionTemplates[Math.floor(Math.random() * questionTemplates.length)],
            options: options.choices,
            correct: options.correctIndex,
            moral: story.moral,
            fullText: story.tale
        };
    }

    generateOptionsFromMoral(correctMoral, allStories) {
        // Get wrong morals from actual stories
        const wrongMorals = allStories
            .map(s => s.moral)
            .filter(moral => moral !== correctMoral);
        
        // Add some generic wrong morals if needed
        const genericWrongMorals = [
            "ความโลภนำมาซึ่งความพินาศ",
            "ความซื่อสัตย์เป็นสิ่งสำคัญที่สุด",
            "ความพยายามนำไปสู่ความสำเร็จเสมอ",
            "การให้อภัยเป็นคุณธรรมที่สูงส่ง",
            "ความอดทนเป็นกุญแจสู่ความสำเร็จ",
            "มิตรภาพที่แท้จริงมีค่ามากกว่าทองคำ",
            "ความกตัญญูเป็นเครื่องหมายของคนดี",
            "การช่วยเหลือผู้อื่นคือการช่วยเหลือตนเอง",
            "ความถ่อมตนนำมาซึ่งความยิ่งใหญ่",
            "การเรียนรู้จากความผิดพลาดทำให้เราเติบโต"
        ].filter(moral => moral !== correctMoral);
        
        // Combine and shuffle
        const allWrongMorals = [...new Set([...wrongMorals, ...genericWrongMorals])];
        const shuffled = allWrongMorals.sort(() => 0.5 - Math.random());
        const selectedWrong = shuffled.slice(0, 3);
        
        // Add correct answer and shuffle all options
        const allOptions = [...selectedWrong, correctMoral];
        const finalOptions = allOptions.sort(() => 0.5 - Math.random());
        
        return {
            choices: finalOptions,
            correctIndex: finalOptions.indexOf(correctMoral)
        };
    }

    async getFallbackQuestionSet(category) {
        const baseQuestions = [];
        const stories = await this.loadStoriesFromFile();
        
        // Use actual stories from file
        for (let i = 0; i < 10; i++) {
            const story = stories[i % stories.length];
            const question = await this.getFallbackQuestion(category);
            
            baseQuestions.push({
                story: {
                    title: `${STORY_CATEGORIES[category].name} ${i + 1}`,
                    content: story.tale
                },
                question: question.question,
                options: question.options,
                correct: question.correct,
                moral: story.moral
            });
        }

        return baseQuestions;
    }

    createDefaultQuestion() {
        return {
            question: "ข้อคิดจากเรื่องนี้คืออะไร?",
            options: [
                "ความพยายามนำไปสู่ความสำเร็จ",
                "ความซื่อสัตย์เป็นสิ่งสำคัญ",
                "การใช้ปัญญาแก้ปัญหา",
                "มิตรภาพมีค่ามาก"
            ],
            correct: 0,
            moral: "ทุกเรื่องราวมีบทเรียนที่มีค่า"
        };
    }

    // Utility method to get story by index
    async getStoryByIndex(index) {
        const stories = await this.loadStoriesFromFile();
        return stories[index % stories.length];
    }

    // Clear cache method
    clearCache() {
        this.storiesCache = null;
    }

    // Destroy method for cleanup
    destroy() {
        this.isOnline = false;
        this.useFallback = false;
        this.storiesCache = null;
    }
}

// Create instance
const aiService = new AIService();

// Export for use in other modules if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIService;
}