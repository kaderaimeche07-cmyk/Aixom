const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '15mb' }));
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Login.html'));
});

app.post('/api/chat', async (req, res) => {
    const { prompt, hasImage, imageBase64, world, activeDoc, docContent, history } = req.body;

    if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: "نص الطلب مفقود أو غير صالح." });
    }

    const keyVision = process.env.VISION_API_KEY;
    const keyThinking = process.env.THINKING_API_KEY;
    const apiBaseUrl = process.env.AI_API_BASE_URL || "https://api.openai.com/v1/chat/completions";

    let activeKey, activeModel, systemPrompt;
    const worldContext = `العالم النشط حالياً: (${world || 'العالم الحر'}).`;
    const docContext = docContent
        ? `\n\n--- محتوى الوثيقة النشطة (${activeDoc}) ---\n${docContent.slice(0, 14000)}\n--- نهاية الوثيقة ---`
        : (activeDoc ? `\nالوثيقة النشطة حالياً: (${activeDoc}).` : '');

    if (hasImage && imageBase64) {
        activeKey = keyVision || keyThinking;
        activeModel = "Qwen/Qwen3-VL-32B-Instruct";
        systemPrompt = `أنت مساعد AXIOM البصري، مختص بقراءة وتحليل الصور والمخططات الهندسية بدقة وتنظيم. ${worldContext}`;
    } else {
        activeKey = keyThinking || keyVision;
        activeModel = "Qwen3-30B-A3B-Thinking";
        systemPrompt = `أنت مساعد AXIOM الهندسي والأكاديمي، مختص بالتفكير المنطقي، التلخيص المنظم، توليد الاختبارات، والحسابات الهندسية. ${worldContext}${docContext}`;
    }

    if (!activeKey) {
        return res.status(500).json({ error: "مفاتيح الذكاء الاصطناعي غير معرّفة على السيرفر." });
    }

    const recentHistory = Array.isArray(history)
        ? history.slice(-6).map(m => ({
            role: m.role === 'ai' ? 'assistant' : 'user',
            content: String(m.text || '')
        }))
        : [];

    const userMessageContent = (hasImage && imageBase64)
        ? [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageBase64 } }
          ]
        : prompt;

    try {
        const response = await fetch(apiBaseUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${activeKey}`
            },
            body: JSON.stringify({
                model: activeModel,
                messages: [
                    { role: "system", content: systemPrompt },
                    ...recentHistory,
                    { role: "user", content: userMessageContent }
                ],
                temperature: 0.65
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
    console.log(`🚀 AXIOM Dual-Engine Server v2.0 running on port ${PORT}`);
});
