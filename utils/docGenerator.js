// Backend/utils/docGenerator.js
const { Document, Packer, Paragraph, TextRun } = require('docx');

const generateQuestionPaperDoc = (questions, title) => {
  const doc = new Document();

  doc.addSection({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: title,
            bold: true,
            size: 28,
          }),
        ],
      }),
      ...questions.split('\n').map(
        (question) =>
          new Paragraph({
            text: question,
          })
      ),
    ],
  });

  return Packer.toBuffer(doc);
};

module.exports = generateQuestionPaperDoc;