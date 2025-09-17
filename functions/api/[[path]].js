import { GoogleGenAI } from 'https://aistudiocdn.com/@google/genai';

/**
 * معالج دالة Cloudflare Pages للطلبات من نوع POST.
 * يعمل هذا كوسيط آمن لاستدعاءات Google Gemini API.
 */
export async function onRequestPost(context) {
  try {
    // 1. الحصول على مفتاح API من متغيرات البيئة الآمنة في Cloudflare.
    const apiKey = context.env.API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'لم يتم تعيين متغير البيئة API_KEY.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const ai = new GoogleGenAI({ apiKey });

    // 2. الحصول على البيانات من طلب العميل.
    const { prompt, schema, fileContent, fileMimeType } = await context.request.json();

    if (!prompt || !schema) {
      return new Response(JSON.stringify({ error: 'Prompt أو schema مفقود في نص الطلب.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let response;

    // 3. تحديد نوع الاستدعاء (بحث جوجل، متعدد الوسائط، أو قياسي).
    if (schema.useGoogleSearch) {
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] },
      });
    } else if (fileContent && fileMimeType) {
      const textPart = { text: prompt };
      const filePart = {
        inlineData: {
          mimeType: fileMimeType,
          data: fileContent,
        },
      };

      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [textPart, filePart] },
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
        },
      });
    } else {
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
        },
      });
    }
    
    // 4. إرجاع استجابة Gemini إلى العميل.
    const candidates = response.candidates;
    const text = response.text;
    const responsePayload = { text, candidates };

    return new Response(JSON.stringify(responsePayload), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('خطأ في دالة Cloudflare:', error);
    return new Response(JSON.stringify({ error: error.message || 'حدث خطأ داخلي في الخادم.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}