import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import cors from "cors";
import express from "express";
import multer from "multer";
import * as fs from "node:fs";

// Configuration de l'API Google Generative AI
const genAI = new GoogleGenerativeAI("AIzaSyDjP_Lr6HQqOAF_-v7Vhh-OKAQl0SEDuUk");

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

const flashcardSchema = {
  description: "Flashcards générées à partir du document PDF",
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

const quizSchema = {
  description: "Quiz généré à partir du document PDF",
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      question: {
        type: SchemaType.STRING,
        description: "Question du quiz",
        nullable: false,
      },
      options: {
        type: SchemaType.ARRAY,
        description: "Options de réponse pour la question",
        items: {
          type: SchemaType.STRING,
        },
        nullable: false,
      },
      correctAnswer: {
        type: SchemaType.STRING,
        description: "Réponse correcte pour la question",
        nullable: false,
      },
    },
    required: ["question", "options", "correctAnswer"], // Assurez-vous que ces propriétés existent
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

// Fonction pour convertir un fichier en partie générative
function fileToGenerativePart(input, mimeType) {
  let data;
  if (Buffer.isBuffer(input)) {
    // Si l'entrée est un buffer, convertir directement en base64
    data = input.toString("base64");
  } else if (typeof input === "string") {
    // Si l'entrée est un chemin de fichier, lire le fichier
    data = Buffer.from(fs.readFileSync(input)).toString("base64");
  } else {
    throw new TypeError(
      "L'entrée doit être un buffer ou un chemin de fichier."
    );
  }

  return {
    inlineData: {
      data,
      mimeType,
    },
  };
}

// Fonction principale pour résumer un PDF
async function summarizePDF(pdfBuffer) {
  try {
    const pdfPart = fileToGenerativePart(pdfBuffer, "application/pdf");
    const prompt =
      "Résumez le contenu de ce PDF avec des sous-titres clairs et organisés.";

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

async function generateFlashcardsFromPDF(pdfBuffer) {
  try {
    // Convertir le buffer en une partie utilisable par l'API
    const pdfPart = fileToGenerativePart(pdfBuffer, "application/pdf");
    const prompt =
      "Générez des flashcards à partir de ce document PDF. Chaque flashcard doit contenir une question basée sur une notion clé et une réponse concise.";

    const flashcardModel = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: flashcardSchema,
      },
    });

    const result = await flashcardModel.generateContent([prompt, pdfPart]);
    return JSON.parse(result.response.text()); // Retourner les flashcards générées sous forme d'objet JSON
  } catch (error) {
    console.error(
      "Erreur lors de la génération des flashcards à partir du PDF :",
      error
    );
    throw error; // Propager l'erreur pour qu'elle puisse être gérée ailleurs
  }
}

async function generateQuizFromPDF(pdfBuffer) {
  try {
    // Convertir le buffer en une partie utilisable par l'API
    const pdfPart = fileToGenerativePart(pdfBuffer, "application/pdf");
    const prompt =
      "Générez un quiz à partir de ce document PDF. Chaque question doit avoir plusieurs options et une réponse correcte.";

    const quizModel = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: quizSchema, // Utiliser le schéma corrigé
      },
    });

    const result = await quizModel.generateContent([prompt, pdfPart]);
    return JSON.parse(result.response.text()); // Retourner le quiz généré sous forme d'objet JSON
  } catch (error) {
    console.error(
      "Erreur lors de la génération du quiz à partir du PDF :",
      error
    );
    throw error; // Propager l'erreur pour qu'elle puisse être gérée ailleurs
  }
}

// Configuration du serveur Express
const app = express();
app.use(cors()); // Activer CORS pour permettre les requêtes depuis le front-end
app.use(express.json()); // Pour analyser les requêtes JSON

// Configuration de multer pour stocker les fichiers en mémoire
const upload = multer({ storage: multer.memoryStorage() });

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

// Route pour télécharger un fichier et générer un résumé
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file; // Récupérer le fichier téléchargé
    if (!file) {
      return res.status(400).json({ error: "Aucun fichier téléchargé." });
    }

    // Appeler la fonction pour résumer le fichier PDF
    const summaryText = await summarizePDF(file.buffer); // Utiliser le buffer du fichier
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
    res.status(500).json({ error: "Erreur lors du résumé du fichier." });
  }
});

app.post("/generate-flashcards", upload.single("file"), async (req, res) => {
  try {
    const file = req.file; // Récupérer le fichier téléchargé
    if (!file) {
      return res.status(400).json({ error: "Aucun fichier téléchargé." });
    }

    // Utiliser le contenu du fichier en mémoire (req.file.buffer)
    const pdfBuffer = file.buffer;

    // Appeler la fonction pour générer les flashcards à partir du buffer PDF
    const flashcards = await generateFlashcardsFromPDF(pdfBuffer);

    // Vérifier si les flashcards sont structurées correctement
    if (!Array.isArray(flashcards) || flashcards.length === 0) {
      return res.status(500).json({
        error: "Les flashcards générées ne sont pas structurées correctement.",
      });
    }

    res.json({ flashcards }); // Envoyer les flashcards générées au client
  } catch (error) {
    console.error("Erreur lors de la génération des flashcards :", error);
    res
      .status(500)
      .json({ error: "Erreur lors de la génération des flashcards." });
  }
});

app.post("/generate-quiz", upload.single("file"), async (req, res) => {
  try {
    const file = req.file; // Récupérer le fichier téléchargé
    if (!file) {
      return res.status(400).json({ error: "Aucun fichier téléchargé." });
    }

    // Utiliser le contenu du fichier en mémoire (req.file.buffer)
    const pdfBuffer = file.buffer;

    // Appeler la fonction pour générer le quiz à partir du buffer PDF
    const quiz = await generateQuizFromPDF(pdfBuffer);

    // Vérifier si le quiz est structuré correctement
    if (!Array.isArray(quiz) || quiz.length === 0) {
      return res.status(500).json({
        error: "Le quiz généré n'est pas structuré correctement.",
      });
    }

    res.json({ quiz }); // Envoyer le quiz généré au client
  } catch (error) {
    console.error("Erreur lors de la génération du quiz :", error);
    res.status(500).json({ error: "Erreur lors de la génération du quiz." });
  }
});

// Démarrer le serveur
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
