# 📚 Story Quest AI

**Story Quest AI** คือเกมนิทานข้อคิดแบบ Interactive ที่ใช้ AI  
ผู้เล่นสามารถเลือกหมวดหมู่ → AI สร้างนิทานใหม่ทันที พร้อมคำถามแบบ Quiz ให้ตอบ  
ทั้งสนุกและได้ข้อคิด เเละมีความท้าทาย

---

## 🚀 ฟีเจอร์หลัก (Features)
- 🤖 **AI Story Generator**: ใช้โมเดล GPT-OSS 20B ผ่าน [LM Studio](https://lmstudio.ai) สร้างนิทานใหม่ทุกครั้งที่เล่น  
- 📂 **Story Categories**: เลือกนิทานจาก 4 หมวดหลัก  
  - 🦊 นิทานสัตว์  
  - 🧚 นิทานคติธรรม  
  - 🦉 นิทานปัญญา  
  - 👫 นิทานมิตรภาพ  
- ❓ **Quiz System**: AI สร้างคำถาม 4 ตัวเลือก เพื่อทดสอบความเข้าใจ  
- 🎮 **Gamification**: มีเลเวล, Gems, Power-ups, Daily Challenge และ Leaderboard  
- 🎨 **Premium Design**: UI สวยงาม มี Particle Background, Animation, Avatar ให้เลือก  

---

## 🛠️ เทคโนโลยี (Tech Stack)
- **Frontend**: HTML + CSS + JavaScript  
- **AI Engine**: LM Studio (Local Inference), GPT-OSS 20B  
- **Data**: `stories.json` (คลังนิทานไทย ~40 เรื่อง)  
- **Storage**: LocalStorage ใช้เก็บ Progress, Gems, Achievements  

---

## 📂 โครงสร้างไฟล์ (File Structure)
story-quest-ai/
├── index.html # หน้าเว็บหลัก
├── styles.css # การออกแบบ UI/UX
├── config.js # การตั้งค่า AI API และ Categories
├── game.js # Logic การเล่นเกม
├── premium.js # ระบบ Premium: Combo, Power-ups, Daily Challenge
├── ai-service.js # ติดต่อกับ AI, สร้างนิทานและคำถาม
├── stories.json # ฐานข้อมูลนิทานตัวอย่าง
