import * as mammoth from 'mammoth';

export const extractTextFromDocx = async (file: File): Promise<string> => {
  try {
    console.log('Processing DOCX file:', file.name, file.size, file.type);
    const arrayBuffer = await file.arrayBuffer();
    console.log('ArrayBuffer size:', arrayBuffer.byteLength);
    
    // mammoth returns an object with a 'value' property containing the raw text
    const result = await mammoth.extractRawText({ arrayBuffer });
    console.log('Mammoth result:', result.value.substring(0, 50) + '...');
    return result.value;
  } catch (error) {
    console.error('Error parsing DOCX:', error);
    throw new Error('Failed to parse Word document. Please ensure it is a valid .docx file.');
  }
};
