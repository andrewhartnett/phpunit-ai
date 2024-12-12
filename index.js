// Add this at the very top of index.js
process.removeAllListeners('warning');

import 'dotenv/config';
import OpenAI from "openai";
import { readdir, readFile, stat } from 'fs/promises';
import { join } from 'path';

const openai = new OpenAI()
const basepath = process.argv[2]
const limit = process.argv[3] || 20


const system = `
You're an expert in PHPUnit testing. Scan the code provided and think about suggestions for performance.
The number one goal is to make the unit tests as fast and efficient as possible.
Please respond with suggestions including: remove test file, combine tests, rewrite test.
If you don't think you can make the file faster, suggest nothing.
Keep responses to 2 lines or less. Do not return code examples.

Respond in this format:
- {suggestion 1}
- {suggestion 2}
`

const getSuggestion = async (code) => {
    return await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            { role: "system", content: system },
            {
                role: "user",
                content: code,
            },
        ],
    })
}

async function getAllFiles(dirPath) {
    const files = await readdir(dirPath);
    const allFiles = [];
    
    for (const file of files) {
        const fullPath = join(dirPath, file);
        const stats = await stat(fullPath);
        
        if (stats.isDirectory()) {
            // Recursively get files from subdirectory
            const subDirFiles = await getAllFiles(fullPath);
            allFiles.push(...subDirFiles);
        } else {
            allFiles.push(fullPath);
        }
    }
    
    return allFiles;
}

const getCost = (usage) => {

    const inputTokens = usage.prompt_tokens
    const outputTokens = usage.completion_tokens

    const costInput = inputTokens * (0.15 / 1000000)
    const costOutput = outputTokens * (0.6 / 1000000)

    return costInput + costOutput

}

const go = async (basepath, limit) => {

    const files = await getAllFiles(basepath)
    let totalCost = 0.0

    for (let i = 0; i < files.length; i++) {

        const file = files[i];
    
        const buffer = await readFile(file)
    
        const code = buffer.toString()
    
        const suggestions = await getSuggestion(code)
    
        const output = [
            file.replace(basepath, ''),
            suggestions.choices[0].message.content
        ].join("\n")
    
        console.log(output + "\n")
        totalCost += getCost(suggestions.usage)
    
        if(i > limit){
            break
        }
    }

    console.log(totalCost)
}



go(basepath, limit)


