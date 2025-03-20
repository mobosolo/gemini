import { GoogleGenerativeAI } from "@google/generative-ai";
import express from "express";
import * as fs from "node:fs";
import cors from "cors";

const app = express();
const port = 3000;

app.use(cors());

const genAI = new GoogleGenerativeAI("AIzaSyA9SEWljxScXBVUqfmsU_g_bRwaXl95FrQ");
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  systemInstruction:
    "Vous êtes un assistant éducatif spécialisé dans les résumés. Votre rôle est de résumer des documents PDF complexes en des explications concises mais complètes. Utilisez un langage clair et pédagogique, et incluez des exemples lorsque cela améliore la compréhension. Ne laissez aucun point clé important de côté, et adaptez le ton pour qu'il soit engageant et facile à lire.",
});

function fileToGenerativePart(path, mimeType) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(path)).toString("base64"),
      mimeType,
    },
  };
}

// Définir le chemin du fichier PDF et le type MIME
const prompt =
  "Voici un texte extrait d'un cours au format PDF. Résumez ce texte de manière concise et claire. Assurez-vous de conserver les points clés et d'expliquer les concepts de manière simple et compréhensible pour une personne n'ayant pas lu tout le cours. Structurez votre résumé pour qu'il soit facile à suivre.";
const pdfPart = fileToGenerativePart(
  "C:/Users/user one/OneDrive/Documents/gemini/fich2.pdf", // Chemin du fichier PDF
  "application/pdf" // MIME type pour un fichier PDF
);
app.get("/analyse", async (req, res) => {
  try {
    const result = await model.generateContent([prompt, pdfPart]);
    res.json({ summary: result.response.text() });
  } catch (error) {
    console.error("Erreur lors de la génération :", error);
    res.status(500).json({ error: "Erreur lors de la génération" });
  }
});

app.listen(port, () => {
  console.log(`serveur en cours d'exécution sur http://localhost:${port}`);
});
