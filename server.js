const express = require('express');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Login.html'));
});

// 🧠 نقطة الاتصال الذكية المزدوجة (توزيع الأدوار بين المفتاحين)
app.post('/api/chat', async (req, res) => {
    const { prompt, hasImage } = req.body;

    // جلب المفتاحين والنموذجين من متغيرات البيئة السحابية
    const keyVision = process.env.VISION_API_KEY;      // مفتاح نموذج الرؤية والـ OCR
    const keyThinking = process.env.THINKING_API_KEY;  // مفتاح نموذج التفكير العميق والبرمجة

    // اختيار المفتاح والنموذج المناسب بناءً على طبيعة الطلب
    let activeKey, activeModel, roleDescription;

    if (hasImage) {
        // دور نموذج الرؤية: تحليل الصور، المخططات، الوثائق البصرية
        activeKey = keyVision || keyThinking; // احتياطي في حال لم يُعرف الأول
        activeModel = "Qwen/Qwen3-VL-32B-Instruct";
        roleDescription = "أنت مساعد AXIOM البصري، مختص بقراءة وتحليل الصور والمستندات الهندسية بدقة.";
    } else {
        // دور نموذج التفكير العميق: البرمجة، الحسابات الهندسية، التحليل المنطقي
        activeKey = keyThinking || keyVision;
        activeModel = "Qwen3-30B-A3B-Thinking";
        roleDescription = "أنت مساعد AXIOM الهندسي والأكاديمي، مختص بالتفكير المنطقي، الحسابات، وكتابة الأكواد.";
    }

    if (!activeKey) {
        return res.status(500).json({ error: "مفاتيح الذكاء الاصطناعي غير معرّفة بشكل صحيح على السيرفر." });
    }

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${activeKey}`
            },
            body: JSON.stringify({
                model: activeModel,
                messages: [
                    { role: "system", content: roleDescription },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7
            })
        });

        const data = await response.json();
        if (data.choices && data.choices.length > 0) {
            res.json({ 
                reply: data.choices[0].message.content, 
                engineUsed: activeModel 
            });
        } else {
            res.json({ reply: "⚠️ عذراً، لم يتلقَ المحرك استجابة صالحة." });
        }
    } catch (error) {
        console.error("Server AI Error:", error);
        res.status(500).json({ error: "تعذر الاتصال بخدمة الذكاء الاصطناعي المزدوجة." });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 AXIOM Dual-Engine Server running on port ${PORT}`);
});
