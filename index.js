import { GoogleGenerativeAI } from "@google/generative-ai";
import cors from "cors";
import express from "express";
const app = express();
const port = 3000;
const genAI = new GoogleGenerativeAI("AIzaSyA9SEWljxScXBVUqfmsU_g_bRwaXl95FrQ");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const prompt = "explique l'ai";

app.use(cors());
app.get("/analyse", async (req, res) => {
  try {
    const result = await model.generateContentStream(prompt);
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      res.write(chunkText);
    }
    res.end();
  } catch (error) {
    console.error("Erreur lors de la génération:", error);
    res.status(500).send("Erreur lors de la génération du contenu");
  }
});

app.listen(port, () => {
  console.log(`Serveur en cours d'exécution sur http://localhost:${port}`);
});
