const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// تفعيل قراءة البيانات
app.use(express.json());

// جعل ملفات المشروع مرئية ومتاحة للربط
app.use(express.static(path.join(__dirname)));

// المسار الرئيسي يفتح صفحة تسجيل الدخول أو لوحة التحكم مباشرة
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Login.html'));
});

app.listen(PORT, () => {
    console.log(`AXIOM Server running on port ${PORT}`);
});
