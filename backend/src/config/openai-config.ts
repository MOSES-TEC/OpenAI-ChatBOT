import OpenAI from "openai"; // Import OpenAI directly

export const configureOpenAI = (): OpenAI => {
  // In v4+, you pass the API key and organization directly to the OpenAI constructor
  if (!process.env.OPEN_AI_SECRET) {
    console.error("OPEN_AI_SECRET environment variable is not set.");
    throw new Error("OpenAI API Key is missing.");
  }
  
  return new OpenAI({
    apiKey: process.env.OPEN_AI_SECRET,
    organization: process.env.OPENAI_ORAGANIZATION_ID, 
  });
};


/*
import { Configuration } from "openai";

export const configureOpenAI = () => {
  const config = new Configuration({
    apiKey: process.env.OPEN_AI_SECRET,
    organization: process.env.OPENAI_ORAGANIZATION_ID,
  });
  return config;
};

*/
