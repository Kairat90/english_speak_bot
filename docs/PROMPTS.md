# Примеры промптов для Gemini

Все промпты возвращают **строго JSON**. Системный промпт задаётся в `src/common/constants/prompts.ts`.

## Системный промпт

```
You are an expert English language teacher assistant.
Always respond in valid JSON format only. No markdown, no explanations outside JSON.
User's native language is Russian — use Russian for explanations and recommendations.
Be encouraging but strict in evaluation.
```

---

## 1. Генерация словаря

**Тип:** `GENERATE_VOCABULARY`

**Вход:** уровень CEFR, количество слов

**Выход:**
```json
{
  "words": [
    {
      "word": "accomplish",
      "transcription": "/əˈkʌmplɪʃ/",
      "translation": "достигать, выполнять",
      "example": "She accomplished her goals.",
      "partOfSpeech": "verb"
    }
  ]
}
```

---

## 2. Оценка Vocabulary

**Тип:** `EVALUATE_VOCABULARY`

**Вход:** слово, ожидаемый ответ, ответ пользователя, тип задания

**Выход:**
```json
{
  "score": 85,
  "passed": true,
  "errors": [],
  "recommendations": ["Попробуйте использовать слово в разных контекстах"],
  "correctedAnswer": "достигать"
}
```

**Порог прохождения:** 70

---

## 3. Генерация Grammar-задания

**Тип:** `GENERATE_GRAMMAR_TASK`

**Выход:**
```json
{
  "topic": "Past Simple",
  "instruction": "Поставьте глагол в правильную форму Past Simple",
  "question": "Yesterday I ___ (go) to the cinema with my friends.",
  "hint": "Неправильный глагол go"
}
```

---

## 4. Оценка Grammar

**Тип:** `EVALUATE_GRAMMAR`

**Выход:**
```json
{
  "score": 100,
  "passed": true,
  "errors": [],
  "recommendations": [],
  "correctedAnswer": "Yesterday I went to the cinema with my friends."
}
```

---

## 5. Speaking — генерация темы

**Тип:** `GENERATE_SPEAKING_TOPIC`

**Выход:**
```json
{
  "topic": "My last vacation",
  "prompt": "Расскажите о вашем последнем отпуске. Где вы были? Что вам понравилось?",
  "expectedDuration": 45,
  "keyVocabulary": ["vacation", "travel", "enjoy", "visit", "experience"]
}
```

---

## 6. Speaking — анализ речи

**Тип:** `ANALYZE_SPEAKING`

**Выход:**
```json
{
  "score": 72,
  "passed": true,
  "fluency": 70,
  "vocabulary": 75,
  "grammar": 68,
  "relevance": 80,
  "completeness": 65,
  "errors": [
    {
      "wrong": "I goed to Paris",
      "correct": "I went to Paris",
      "explanation": "Неправильная форма глагола go в Past Simple"
    }
  ],
  "recommendations": ["Повторите неправильные глаголы Past Simple"],
  "correctedAnswer": "Last summer I went to Paris. I visited the Eiffel Tower and enjoyed French cuisine."
}
```

**Порог прохождения:** 70

---

## 7. Listening — генерация

**Тип:** `GENERATE_LISTENING`

**Выход:**
```json
{
  "text": "Hello, my name is Sarah. I work as a teacher in London. I love reading books and traveling.",
  "mode": "transcribe",
  "questions": [
    {
      "question": "Где работает Sarah?",
      "expectedAnswer": "London"
    }
  ]
}
```

---

## 8. Listening — оценка

**Тип:** `EVALUATE_LISTENING`

**Выход:**
```json
{
  "score": 65,
  "passed": false,
  "errors": [
    {
      "wrong": "Sarah works as a doctor",
      "correct": "Sarah works as a teacher",
      "explanation": "В аудио сказано teacher, а не doctor"
    }
  ],
  "recommendations": ["Слушайте внимательнее ключевые слова профессии"],
  "correctedAnswer": "Hello, my name is Sarah. I work as a teacher in London."
}
```

---

## 9. Персональный план обучения

**Тип:** `GENERATE_LEARNING_PLAN`

**Вход:** профиль пользователя (имя, цель, время, навыки)

**Выход:**
```json
{
  "title": "План для начинающего: фокус на говорении",
  "description": "Учитывая вашу цель — работа за рубежом, рекомендуем уделить больше внимания speaking и vocabulary.",
  "focusAreas": [
    { "skill": "SPEAKING", "priority": 5, "reason": "Самый низкий уровень среди навыков" },
    { "skill": "VOCABULARY", "priority": 4, "reason": "Необходим для speaking" }
  ],
  "weeklyGoals": [
    { "skill": "SPEAKING", "tasksPerWeek": 5 },
    { "skill": "VOCABULARY", "tasksPerWeek": 7 },
    { "skill": "GRAMMAR", "tasksPerWeek": 3 }
  ]
}
```

---

## 10. Ежедневное задание

**Тип:** `GENERATE_DAILY_CHALLENGE`

**Выход:**
```json
{
  "title": "Утренний челлендж: Mixed Skills",
  "tasks": [
    {
      "type": "VOCABULARY",
      "content": { "words": 3 },
      "instruction": "Выучите 3 новых слова уровня A2"
    },
    {
      "type": "GRAMMAR",
      "content": { "topic": "articles" },
      "instruction": "Выполните упражнение на артикли"
    }
  ]
}
```

---

## Рекомендации по промптам

1. **responseMimeType: application/json** — используется в `AiCoreService` для принудительного JSON.
2. **Fallback-парсинг** — `parseGeminiJson()` извлекает JSON из markdown-блоков.
3. **Логирование** — все запросы/ответы сохраняются в `AiFeedback`.
4. **Адаптация** — при `averageScore < 60` за 5 заданий снижать сложность в промпте.
5. **A/B тесты** — хранить `promptType` + `version` для анализа качества.
