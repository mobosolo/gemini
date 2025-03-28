import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import cors from "cors";
import express from "express";
import * as fs from "node:fs";

// Configuration de l'API Google Generative AI
const genAI = new GoogleGenerativeAI("AIzaSyA9SEWljxScXBVUqfmsU_g_bRwaXl95FrQ");

const schema = {
  description: "Résumé d'un article avec titres",
  type: SchemaType.OBJECT,
  properties: {
    articleTitle: {
      type: SchemaType.STRING,
      description: "Titre de l'article",
      nullable: false,
    },
    summary: {
      type: SchemaType.ARRAY,
      description: "Résumé de l'article",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          subtitle: {
            type: SchemaType.STRING,
            description: "titre de la section",
            nullable: false,
          },
          content: {
            type: SchemaType.STRING,
            description: "Contenu de la section",
            nullable: false,
          },
        },
        required: ["subtitle", "content"],
      },
    },
  },
  required: ["articleTitle", "summary"],
};

const flashcardsSchema = {
  description: "Flashcards générées à partir d'un document",
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      question: {
        type: SchemaType.STRING,
        description: "Question de la flashcard",
        nullable: false,
      },
      answer: {
        type: SchemaType.STRING,
        description: "Réponse de la flashcard",
        nullable: false,
      },
    },
    required: ["question", "answer"],
  },
};

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: schema,
  },
  // systemInstruction:
  //   "Vous êtes un assistant pédagogique spécialisé dans le résumé de documents. Votre rôle est de produire des résumés clairs, structurés et facilement compréhensibles pour des apprenants. Adoptez un langage précis et évitez toute ambiguïté. Si une section contient des notions complexes, expliquez-les simplement pour qu'elles soient accessibles à tous.Votre langage doit être engageant et adapté aux apprenants, en restant simple et pédagogique.",
});

const flashcardsModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: flashcardsSchema,
  },
});

// Fonction pour convertir un fichier en partie générative
function fileToGenerativePart(path, mimeType) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(path)).toString("base64"),
      mimeType,
    },
  };
}

// Fonction principale pour résumer un PDF
async function summarizePDF(pdfPath) {
  try {
    const pdfPart = fileToGenerativePart(pdfPath, "application/pdf");
    const prompt =
      "Résumez le contenu de ce PDF avec des sous-titres claires et organisées.";

    const result = await model.generateContent([prompt, pdfPart]);
    return result.response.text(); // Retourner le texte généré
  } catch (error) {
    console.error(
      "Erreur lors du traitement du PDF ou de la génération du contenu :",
      error
    );
    throw error; // Propager l'erreur pour qu'elle puisse être gérée ailleurs
  }
}

// Fonction pour générer des flashcards à partir d'un PDF
async function generateFlashcards(pdfPath) {
  try {
    const pdfPart = fileToGenerativePart(pdfPath, "application/pdf");
    const prompt =
      "Générez des flashcards basées sur le contenu de ce document. Chaque flashcard doit contenir une question et une réponse concise.";

    const result = await flashcardsModel.generateContent([prompt, pdfPart]);
    return result.response.text(); // Retourner le texte généré
  } catch (error) {
    console.error("Erreur lors de la génération des flashcards :", error);
    throw error; // Propager l'erreur pour qu'elle puisse être gérée ailleurs
  }
}

// Configuration du serveur Express
const app = express();
app.use(cors()); // Activer CORS pour permettre les requêtes depuis le front-end

// Route pour résumer un PDF statique
app.get("/summarize", async (req, res) => {
  try {
    const pdfPath = "C:/Users/user one/OneDrive/Documents/gemini/algo.pdf"; // Chemin du fichier PDF statique
    const summaryText = await summarizePDF(pdfPath); // Appeler la fonction pour générer le résumé
    const summary = JSON.parse(summaryText); // Convertir le texte brut en JSON structuré

    // Vérifier si le résumé est structuré correctement
    if (!summary.articleTitle || !summary.summary) {
      return res.status(500).json({
        error: "Le résumé généré n'est pas structuré correctement.",
      });
    }

    res.json(summary); // Envoyer le résumé structuré au client
  } catch (error) {
    console.error("Erreur lors du résumé :", error);
    res.status(500).json({ error: "Erreur lors du résumé du PDF." });
  }
});

// Route pour générer des flashcards à partir d'un PDF statique
app.get("/flashcards", async (req, res) => {
  try {
    const pdfPath = "C:/Users/user one/OneDrive/Documents/gemini/algo.pdf"; // Chemin du fichier PDF statique
    const flashcardsText = await generateFlashcards(pdfPath); // Appeler la fonction pour générer les flashcards
    const flashcards = JSON.parse(flashcardsText); // Convertir le texte brut en JSON structuré

    // Vérifier si les flashcards sont structurées correctement
    if (!Array.isArray(flashcards) || flashcards.length === 0) {
      return res.status(500).json({
        error: "Les flashcards générées ne sont pas structurées correctement.",
      });
    }

    res.json(flashcards); // Envoyer les flashcards structurées au client
  } catch (error) {
    console.error("Erreur lors de la génération des flashcards :", error);
    res
      .status(500)
      .json({ error: "Erreur lors de la génération des flashcards." });
  }
});

// Démarrer le serveur
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
