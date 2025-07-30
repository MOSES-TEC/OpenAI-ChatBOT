import { NextFunction, Request, Response } from "express";
import User from "../models/User.js";
import { configureOpenAI } from "../config/openai-config.js";
import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";


const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const generateChatCompletion = async (req: Request, res: Response, next: NextFunction) => {
    const { message } = req.body;
    
    try {
        const user = await User.findById(res.locals.jwtData.id);

        if (!user) {
            return res.status(401).json({ message: "User not registered or Token has been malfunctioned" });
        }

        // grab chats of user
        // Cast to ChatCompletionMessageParam[] for OpenAI v4 compatibility
        const chats = user.chats.map(({ role, content }) => ({ role, content })) as ChatCompletionMessageParam[];
        chats.push({ content: message, role: "user" });
        user.chats.push({ content: message, role: "user" });

        const openai = configureOpenAI(); 

        let retries = 5;
        let delay = 1000;

        while (retries > 0) {
            try {
                // In v4+, chat completions are accessed via openai.chat.completions.create
                const chatResponse = await openai.chat.completions.create({
                    model: "gpt-3.5-turbo", // Or "gpt-4" if you have access and want to use it
                    messages: chats,
                });

                // The response structure is also slightly different in v4+
                user.chats.push(chatResponse.choices[0].message);
                await user.save();
                return res.status(200).json({ chats: user.chats });

            } catch (error: any) {
                if (error.response && error.response.status === 429) {
                    console.warn(`Rate limit hit. Retrying in ${delay / 1000} seconds... (${retries} retries left)`);
                    await sleep(delay + Math.random() * 500); 
                    delay *= 2;
                    retries--;
                } else {
                    console.error("OpenAI API error:", error.message);
                    return res.status(500).json({ message: "An error occurred while generating chat", cause: error.message });
                }
            }
        }

        return res.status(500).json({ message: "Failed to generate chat after multiple retries due to rate limiting." });

    } catch (error: any) {
        console.log(error);
        return res.status(500).json({ message: "An error occurred while generating chat", cause: error.message });
    }
};


export const sendChatsToUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        //user token check
        const user = await User.findById(res.locals.jwtData.id);
        if (!user) {
            return res.status(401).send("User not registered OR Token malfunctioned");
        }

        if (user._id.toString() !== res.locals.jwtData.id) {
            return res.status(401).send("Permissions didn't match");
        }
        return res.status(200).json({ message: "OK", chats: user.chats });

    } catch (error: any) { 
        console.log(error);
        return res.status(200).json({ message: "ERROR", cause: error.message });
    }
};


export const deleteChats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        //user token check
        const user = await User.findById(res.locals.jwtData.id);
        if (!user) {
            return res.status(401).send("User not registered OR Token malfunctioned");
        }

        if (user._id.toString() !== res.locals.jwtData.id) {
            return res.status(401).send("Permissions didn't match");
        }
        
        //@ts-ignore
        user.chats = [];
        await user.save();
        return res.status(200).json({ message: "OK" });
    } catch (error: any) { 
        console.log(error);
        return res.status(200).json({ message: "ERROR", cause: error.message });
    }
};


/*
import { NextFunction, Request, Response } from "express";
import User from "../models/User.js";
import { configureOpenAI } from "../config/openai-config.js";
import { OpenAIApi, ChatCompletionRequestMessage } from "openai";

// Helper function for exponential backoff retry
// const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const generateChatCompletion = async (req: Request, res: Response, next: NextFunction) => {
    const { message } = req.body;
    
    try {
        const user = await User.findById(res.locals.jwtData.id);

        if (!user) {
            return res.status(401).json({ message: "User not registered or Token has been malfunctioned" });
        }

        // grab chats of user
        const chats = user.chats.map(({ role, content }) => ({ role, content })) as ChatCompletionRequestMessage[];
        chats.push({ content: message, role: "user" });
        user.chats.push({ content: message, role: "user" });

        // send all chats with new one to openAI API
        const config = configureOpenAI();
        const openai = new OpenAIApi(config);

        // let retries = 5; // Number of retries
        // let delay = 1000; // Initial delay in milliseconds (1 second)

        
        // get latest response
        const chatResponse = await openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: chats,
        });
        user.chats.push(chatResponse.data.choices[0].message);
        await user.save();
        return res.status(200).json({ chats: user.chats });

        // while (retries > 0) {
        //     try {
        //         // send all chats with new one to openAI API
        //         const chatResponse = await openai.createChatCompletion({
        //             model: "gpt-3.5-turbo",
        //             messages: chats,
        //         });

        //         user.chats.push(chatResponse.data.choices[0].message);
        //         await user.save();
        //         return res.status(200).json({ chats: user.chats });

        //     } catch (error: any) { // Explicitly type error as 'any' for easier access to response
        //         if (error.response && error.response.status === 429) {
        //             console.warn(`Rate limit hit. Retrying in ${delay / 1000} seconds... (${retries} retries left)`);
        //             await sleep(delay + Math.random() * 500); // Add jitter
        //             delay *= 2; // Exponential backoff
        //             retries--;
        //         } else {
        //             console.error("OpenAI API error:", error.message);
        //             return res.status(500).json({ message: "An error occurred while generating chat", cause: error.message });
        //         }
        //     }
        // }

        // return res.status(500).json({ message: "Failed to generate chat after multiple retries due to rate limiting." });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "An error occurred while generating chat"});
    }

};


export const sendChatsToUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        //user token check
        const user = await User.findById(res.locals.jwtData.id);
        if (!user) {
            return res.status(401).send("User not registered OR Token malfunctioned");
        }

        if (user._id.toString() !== res.locals.jwtData.id) {
            return res.status(401).send("Permissions didn't match");
        }
        return res.status(200).json({ message: "OK", chats: user.chats });

    } catch (error) {
        console.log(error);
        return res.status(200).json({ message: "ERROR", cause: error.message });
    }
};


export const deleteChats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        //user token check
        const user = await User.findById(res.locals.jwtData.id);
        if (!user) {
            return res.status(401).send("User not registered OR Token malfunctioned");
        }

        if (user._id.toString() !== res.locals.jwtData.id) {
            return res.status(401).send("Permissions didn't match");
        }
        
        //@ts-ignore
        user.chats = [];
        await user.save();
        return res.status(200).json({ message: "OK" });
    } catch (error) {
        console.log(error);
        return res.status(200).json({ message: "ERROR", cause: error.message });
    }
};


*/




