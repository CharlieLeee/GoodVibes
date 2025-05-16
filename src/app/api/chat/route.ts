
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import Together from 'together-ai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const togetherai = new Together({
  apiKey: process.env.TOGETHER_AI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { message, provider } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }
    if (!provider || (provider !== 'openai' && provider !== 'togetherai')) {
      return NextResponse.json({ error: 'Invalid AI provider specified' }, { status: 400 });
    }

    let aiResponseText = '';

    if (provider === 'openai') {
      if (!process.env.OPENAI_API_KEY) {
        return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
      }
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo', // Or your preferred model
          messages: [{ role: 'user', content: message }],
        });
        aiResponseText = completion.choices[0]?.message?.content?.trim() || '';
      } catch (error) {
        console.error('OpenAI API error:', error);
        return NextResponse.json({ error: 'Error communicating with OpenAI' }, { status: 500 });
      }
    } else if (provider === 'togetherai') {
      if (!process.env.TOGETHER_AI_API_KEY) {
        return NextResponse.json({ error: 'Together AI API key not configured' }, { status: 500 });
      }
      try {
        // Note: Adjust the model based on what Together AI offers and your preference
        // Common models include 'mistralai/Mixtral-8x7B-Instruct-v0.1' or 'togethercomputer/llama-2-7b-chat'
        const response = await togetherai.chat.completions.create({
          model: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
          messages: [{ role: 'user', content: message }],
        });
        aiResponseText = response.choices[0]?.message?.content?.trim() || '';
      } catch (error) {
        console.error('Together AI API error:', error);
        return NextResponse.json({ error: 'Error communicating with Together AI' }, { status: 500 });
      }
    }

    return NextResponse.json({ reply: aiResponseText });

  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
