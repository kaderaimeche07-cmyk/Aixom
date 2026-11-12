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

// 🧠 نقطة الاتصال الذكية المزدوجة (توزيع الأدوار + حقن سياق العالم والوثيقة)
app.post('/api/chat', async (req, res) => {
    const { prompt, hasImage, world, activeDoc } = req.body;

    if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: "نص الطلب مفقود أو غير صالح." });
    }

    const keyVision = process.env.VISION_API_KEY;
    const keyThinking = process.env.THINKING_API_KEY;

    let activeKey, activeModel, roleDescription;
    const contextNote = `العالم النشط حالياً: (${world || 'العالم الحر'}). الوثيقة النشطة: (${activeDoc || 'لا توجد وثيقة'}).`;

    if (hasImage) {
        activeKey = keyVision || keyThinking;
        activeModel = "Qwen/Qwen3-VL-32B-Instruct";
        roleDescription = `أنت مساعد AXIOM البصري، مختص بقراءة وتحليل الصور والمستندات الهندسية بدقة. ${contextNote}`;
    } else {
        activeKey = keyThinking || keyVision;
        activeModel = "Qwen3-30B-A3B-Thinking";
        roleDescription = `أنت مساعد AXIOM الهندسي والأكاديمي، مختص بالتفكير المنطقي، الحسابات، وكتابة الأكواد. ${contextNote}`;
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
            console.error("Unexpected API Response:", data);
            res.status(502).json({ reply: "⚠️ عذراً، لم يتلقَ المحرك استجابة صالحة من المزود." });
        }
    } catch (error) {
        console.error("Server AI Error:", error);
        res.status(500).json({ error: "تعذر الاتصال بخدمة الذكاء الاصطناعي المزدوجة." });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 AXIOM Dual-Engine Server running on port ${PORT}`);
});
