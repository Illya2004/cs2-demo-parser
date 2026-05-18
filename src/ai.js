const path = require("path");
require("dotenv").config({
    path: path.resolve(__dirname, "../.env")
});
const OpenAI = require("openai");

const client = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
});

async function generate(data) {

    const completion = await client.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
            {
                role: "system",
                content: `
You are a strict CS2 mechanics coach.

You ONLY analyze positioning mistakes like:
- did_not_clear_angle
- bad peek timing
- overexposure

Rules:
- No general advice
- No economy talk
- No aim theory
- Be short and tactical
                `
            },
            {
                role: "user",
                content: JSON.stringify(data, null, 2)
            }
        ],
        temperature: 0.2
    });

    return completion.choices[0].message.content;
}

module.exports = { generate };