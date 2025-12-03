// Backend/utils/textExtractor.js
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const fs = require('fs');

const extractTextFromPDF = async (filePath) => {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return data.text;
};

const extractTextFromPPT = async (filePath) => {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value;
};

module.exports = { extractTextFromPDF, extractTextFromPPT };