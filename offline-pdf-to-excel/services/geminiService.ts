import { ExtractionResult } from "../types";

const processFile = async (): Promise<ExtractionResult> => {
  throw new Error("AI extraction is disabled in this offline version.");
};

export const geminiService = {
  processFile
};