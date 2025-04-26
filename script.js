// === Sélection des éléments HTML ===
const uploadForm = document.getElementById("uploadForm");
const fileInput = document.getElementById("fileInput");
const fileName = document.getElementById("fileName");
const errorMessage = document.getElementById("errorMessage");
const summaryContainer = document.getElementById("summaryContainer");
const flashcardsContainer = document.getElementById("flashcardsContainer");
const quizContainer = document.getElementById("quizContainer");
const prevSectionButton = document.getElementById("prevSection");
const nextSectionButton = document.getElementById("nextSection");

// === Variables globales ===
const sections = ["summaryContainer", "flashcardsContainer", "quizContainer"];
let currentSectionIndex = 0;

// === Fonctions utilitaires ===

// Affiche uniquement une section spécifique
function updateSectionVisibility() {
  sections.forEach((sectionId, index) => {
    const section = document.getElementById(sectionId);
    section.style.display = index === currentSectionIndex ? "block" : "none";
  });

  // Gérer l'état des boutons de navigation
  prevSectionButton.disabled = currentSectionIndex === 0;
  nextSectionButton.disabled = currentSectionIndex === sections.length - 1;
}

// Affiche un message d'erreur
function displayError(message) {
  errorMessage.textContent = message;
}

// Réinitialise le message d'erreur
function clearError() {
  errorMessage.textContent = "";
}

// Fonction pour afficher le spinner
function showLoadingSpinner() {
  const loadingSpinner = document.getElementById("loadingSpinner");
  loadingSpinner.style.display = "block"; // Affiche le spinner
}

// Fonction pour masquer le spinner
function hideLoadingSpinner() {
  const loadingSpinner = document.getElementById("loadingSpinner");
  loadingSpinner.style.display = "none"; // Masque le spinner
}

// === Gestionnaire pour la sélection de fichier ===
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (file) {
    fileName.textContent = `Fichier sélectionné : ${file.name}`;
    clearError();
  } else {
    fileName.textContent = "Aucun fichier sélectionné.";
  }
});

// === Gestionnaire pour le résumé ===
uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showLoadingSpinner();

  if (currentSectionIndex !== sections.indexOf("summaryContainer")) {
    currentSectionIndex = sections.indexOf("summaryContainer");
    updateSectionVisibility();
  }

  const file = fileInput.files[0];
  if (!file) {
    displayError("Veuillez sélectionner un fichier.");
    hideLoadingSpinner();
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch("http://localhost:3000/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) throw new Error("Erreur lors de l'envoi du fichier.");

    const data = await response.json();
    console.log("Résumé généré :", data);

    if (data.summary && Array.isArray(data.summary)) {
      summaryContainer.innerHTML = `
        <h2 class="article-title">${data.articleTitle}</h2>
        <ul>
          ${data.summary
            .map(
              (section) => `
            <li>
              <h3>${section.subtitle}</h3>
              <p>${section.content}</p>
            </li>
          `
            )
            .join("")}
        </ul>
      `;
    } else {
      summaryContainer.textContent = "Aucun résumé structuré disponible.";
    }
  } catch (error) {
    console.error(error.message);
    displayError("Une erreur est survenue : " + error.message);
  } finally {
    hideLoadingSpinner();
  }
});

// === Gestionnaire pour les flashcards ===
document
  .getElementById("generateFlashcards")
  .addEventListener("click", async () => {
    showLoadingSpinner();

    if (currentSectionIndex !== sections.indexOf("flashcardsContainer")) {
      currentSectionIndex = sections.indexOf("flashcardsContainer");
      updateSectionVisibility();
    }

    const file = fileInput.files[0];
    if (!file) {
      displayError("Veuillez sélectionner un fichier.");
      hideLoadingSpinner();
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(
        "http://localhost:3000/generate-flashcards",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok)
        throw new Error("Erreur lors de la génération des flashcards.");

      const { flashcards } = await response.json();
      console.log("Flashcards générées :", flashcards);

      flashcardsContainer.innerHTML = `
        <div id="flashcardContent" class="flashcard-content">
          <h3 class="flashcard-question">${flashcards[0].question}</h3>
          <p class="flashcard-answer" style="display: none;">${flashcards[0].answer}</p>
        </div>
        <div class="navigation">
          <button id="prevFlashcard" class="nav-btn" disabled>Précédent</button>
          <button id="nextFlashcard" class="nav-btn">Suivant</button>
        </div>
      `;

      let currentFlashcardIndex = 0;

      const showFlashcard = (index) => {
        const flashcardContent = document.getElementById("flashcardContent");
        const questionElement = flashcardContent.querySelector(
          ".flashcard-question"
        );
        const answerElement =
          flashcardContent.querySelector(".flashcard-answer");

        // Mettre à jour le contenu de la question et de la réponse
        questionElement.textContent = flashcards[index].question;
        answerElement.textContent = flashcards[index].answer;

        // Masquer la réponse par défaut
        answerElement.style.display = "none";

        // Ajouter un gestionnaire d'événement pour afficher la réponse
        questionElement.onclick = () => {
          answerElement.style.display = "block";
        };

        // Gérer l'état des boutons de navigation
        document.getElementById("prevFlashcard").disabled = index === 0;
        document.getElementById("nextFlashcard").disabled =
          index === flashcards.length - 1;
      };

      document.getElementById("prevFlashcard").addEventListener("click", () => {
        if (currentFlashcardIndex > 0) {
          currentFlashcardIndex--;
          showFlashcard(currentFlashcardIndex);
        }
      });

      document.getElementById("nextFlashcard").addEventListener("click", () => {
        if (currentFlashcardIndex < flashcards.length - 1) {
          currentFlashcardIndex++;
          showFlashcard(currentFlashcardIndex);
        }
      });

      showFlashcard(currentFlashcardIndex);
    } catch (error) {
      console.error(error.message);
      displayError("Une erreur est survenue : " + error.message);
    } finally {
      hideLoadingSpinner();
    }
  });

// === Gestionnaire pour le quiz ===
document.getElementById("generateQuiz").addEventListener("click", async () => {
  showLoadingSpinner();

  if (currentSectionIndex !== sections.indexOf("quizContainer")) {
    currentSectionIndex = sections.indexOf("quizContainer");
    updateSectionVisibility();
  }

  const file = fileInput.files[0];
  if (!file) {
    displayError("Veuillez sélectionner un fichier.");
    hideLoadingSpinner();
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch("http://localhost:3000/generate-quiz", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) throw new Error("Erreur lors de la génération du quiz.");

    const { quiz } = await response.json();
    console.log("Quiz généré :", quiz);

    quizContainer.innerHTML = quiz
      .map(
        (questionObj, index) => `
        <div class="quiz-question">
          <h3>Question ${index + 1}: ${questionObj.question}</h3>
          <ul class="quiz-options">
            ${questionObj.options
              .map((option) => `<li>${option}</li>`)
              .join("")}
          </ul>
        </div>
      `
      )
      .join("");

    document.querySelectorAll(".quiz-options li").forEach((option, i) => {
      option.addEventListener("click", () => {
        const questionObj = quiz[Math.floor(i / quiz[0].options.length)];
        if (option.textContent === questionObj.correctAnswer) {
          option.style.backgroundColor = "#d4edda";
        } else {
          option.style.backgroundColor = "#f8d7da";
        }
      });
    });
  } catch (error) {
    console.error(error.message);
    displayError("Une erreur est survenue : " + error.message);
  } finally {
    hideLoadingSpinner();
  }
});

// === Navigation horizontale ===
prevSectionButton.addEventListener("click", () => {
  if (currentSectionIndex > 0) {
    currentSectionIndex--;
    updateSectionVisibility();
  }
});

nextSectionButton.addEventListener("click", () => {
  if (currentSectionIndex < sections.length - 1) {
    currentSectionIndex++;
    updateSectionVisibility();
  }
});

// Initialisation
updateSectionVisibility();

function showContainer(containerId) {
  // Masquer tous les conteneurs
  [summaryContainer, flashcardsContainer, quizContainer].forEach(
    (container) => {
      container.style.display = "none";
    }
  );

  // Afficher uniquement le conteneur spécifié
  const container = document.getElementById(containerId);
  if (container) {
    container.style.display = "block";
  }
}
