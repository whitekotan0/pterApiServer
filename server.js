// my-ai-server/server.js
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import 'dotenv/config'; 

// --- Настройка ---
const app = express();
const port = 3000;
app.use(cors());
app.use(express.json());

const openai = new OpenAI(); // (Он найдет .env)

// --- Эндпоинт (теперь "умнее") ---
app.post('/api/analyze', async (req, res) => {
  // 👇 (1) ТЕПЕРЬ МЫ ЛОВИМ 2 ВЕЩИ
  const { message, code } = req.body;

  console.log('--- СЕРВЕР ПОЛУЧИЛ ПРОМПТ ---');
  console.log('Сообщение:', message);
  console.log('Код диаграммы:', code);

  try {
    // (a) Cистемный промпт
    const systemPrompt = `Ты - ассистент-программист. Тебе дали диаграмму в виде Mermaid-кода и промпт от юзера.
Твоя задача - ответить на промпт юзера, используя Mermaid-код как КОНТЕКСТ.
Если юзер просит "напиши код", ты пишешь код.
Если юзер просит "доработай", ты отвечаешь на его запрос.
Отвечай в Markdown. Блоки кода оборачивай в \`\`\`python ... \`\`\`.`;

    // (b) Юзерский промпт (теперь "комбо")
    const userPrompt = `
КОНТЕКСТ (ДИАГРАММА):
\`\`\`mermaid
${code}
\`\`\`

ЗАПРОС ЮЗЕРА:
"${message}"
`;

    // (c) Запрос в OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
    });

    const aiResponse = completion.choices[0].message.content;
    console.log('--- AI ОТВЕТИЛ ---');
    
    // (d) Отправляем ответ
    res.json({
      success: true,
      result: aiResponse 
    });

  } catch (error) {
    console.error('--- ОШИБКА OPENAI ---', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при запросе к OpenAI: ' + error.message
    });
  }
});

app.listen(port,"0,0,0,0", () => {
  console.log(`[AI Server] Сервер запущен на http://localhost:${port}`);
});
