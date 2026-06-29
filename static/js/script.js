class MemoryGame {
  constructor() {
    this.gameId = null;
    this.level = 1;
    this.maxLevel = 1;
    this.moves = 0;
    this.numPairs = 0;
    this.pairsMatched = 0;
    this.isProcessing = false;
    this.firstCard = null;
    this.secondCard = null;

    // DOM elements
    this.board = document.getElementById("game-board");
    this.levelDisplay = document.getElementById("level-display");
    this.movesDisplay = document.getElementById("moves-display");
    this.pairsDisplay = document.getElementById("pairs-display");
    this.starsDisplay = document.getElementById("stars-display");
    this.lockedMessage = document.getElementById("locked-message");
    this.lockedLevel = document.getElementById("locked-level");

    // Modals
    this.levelModal = document.getElementById("level-modal");
    this.lockedModal = document.getElementById("locked-modal");

    // Bind events
    this.bindEvents();

    // Load progress and start
    this.loadProgress();
  }

  bindEvents() {
    document.getElementById("reset-btn").addEventListener("click", () => {
      this.startNewGame(this.level);
    });

    document.getElementById("prev-btn").addEventListener("click", () => {
      if (this.level > 1) {
        this.level--;
        this.startNewGame(this.level);
      }
    });

    document.getElementById("next-btn").addEventListener("click", () => {
      if (this.level < this.maxLevel) {
        this.level++;
        this.startNewGame(this.level);
      } else if (this.level === this.maxLevel) {
        this.level++;
        this.startNewGame(this.level);
      }
    });

    document.getElementById("next-level-btn").addEventListener("click", () => {
      this.levelModal.classList.remove("show");
      this.level++;
      this.startNewGame(this.level);
    });

    document.getElementById("retry-level-btn").addEventListener("click", () => {
      this.levelModal.classList.remove("show");
      this.startNewGame(this.level);
    });

    document.getElementById("locked-ok-btn").addEventListener("click", () => {
      this.lockedModal.classList.remove("show");
    });

    document
      .getElementById("reset-progress-btn")
      .addEventListener("click", () => {
        if (confirm("Are you sure you want to reset all progress?")) {
          this.resetProgress();
        }
      });

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if (e.key === "r" || e.key === "R") {
        this.startNewGame(this.level);
      }
      if (e.key === "ArrowRight") {
        this.level = Math.min(this.level + 1, this.maxLevel + 1);
        this.startNewGame(this.level);
      }
      if (e.key === "ArrowLeft") {
        if (this.level > 1) {
          this.level--;
          this.startNewGame(this.level);
        }
      }
    });
  }

  async loadProgress() {
    try {
      const response = await fetch("/api/progress");
      const data = await response.json();
      this.maxLevel = data.max_level || 1;
      this.level = this.maxLevel;
      this.startNewGame(this.level);
    } catch (error) {
      console.error("Error loading progress:", error);
      this.maxLevel = 1;
      this.startNewGame(1);
    }
  }

  async resetProgress() {
    try {
      await fetch("/api/reset_progress", { method: "POST" });
      this.maxLevel = 1;
      this.level = 1;
      this.startNewGame(1);
    } catch (error) {
      console.error("Error resetting progress:", error);
    }
  }

  async startNewGame(level) {
    try {
      this.board.innerHTML =
        '<div style="text-align:center;padding:40px;color:#666;">Loading...</div>';

      const response = await fetch("/api/new_game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: level }),
      });

      const data = await response.json();

      if (data.error) {
        this.showLockedMessage(data.error);
        this.level = this.maxLevel;
        this.startNewGame(this.maxLevel);
        return;
      }

      this.gameId = data.game_id;
      this.level = data.level;
      this.maxLevel = data.max_level || 1;
      this.numPairs = data.num_pairs;
      this.moves = 0;
      this.pairsMatched = 0;
      this.isProcessing = false;
      this.firstCard = null;
      this.secondCard = null;

      // Update UI
      this.levelDisplay.textContent = this.level;
      this.movesDisplay.textContent = "0";
      this.pairsDisplay.textContent = `0/${this.numPairs}`;
      this.starsDisplay.textContent = "0";

      this.lockedMessage.style.display = "none";
      this.renderBoard(data.cards, data.grid_rows, data.grid_cols);
      this.levelModal.classList.remove("show");
      this.lockedModal.classList.remove("show");

      document.getElementById("prev-btn").disabled = this.level <= 1;
      document.getElementById("next-btn").disabled = false;
    } catch (error) {
      console.error("Error starting game:", error);
      alert("Failed to start game. Please refresh and try again.");
    }
  }

  renderBoard(cards, rows, cols) {
    this.board.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    this.board.innerHTML = "";

    // Value colors for matched cards
    const valueColors = {
      1: "#B3E5FC",
      2: "#C8E6C9",
      3: "#FFE0B2",
      4: "#E1BEE7",
      5: "#FFCDD2",
      6: "#B2DFDB",
      7: "#F8BBD0",
      8: "#D1C4E9",
      9: "#FFE0B2",
      10: "#B2DFDB",
      11: "#FFECB3",
      12: "#D1C4E9",
    };

    cards.forEach((card, index) => {
      const cardElement = document.createElement("div");
      cardElement.className = "card";
      if (card.flipped) cardElement.classList.add("flipped");
      if (card.matched) cardElement.classList.add("matched");
      cardElement.dataset.index = index;

      // Front (face up)
      const front = document.createElement("div");
      front.className = "card-front";
      const color = valueColors[card.value] || "#A8E6CF";

      // If matched, apply light color
      if (card.matched) {
        front.style.background = color;
        front.style.borderColor = "#4CAF50";
        front.style.color = "#2E7D32";
      } else {
        front.style.borderColor = "#667eea";
        front.style.color = "#333";
      }

      front.textContent = card.value;

      // Back (face down)
      const back = document.createElement("div");
      back.className = "card-back";
      back.textContent = "❓";

      cardElement.appendChild(front);
      cardElement.appendChild(back);

      // Click handler
      cardElement.addEventListener("click", () => this.handleCardClick(index));
      cardElement.addEventListener("touchstart", (e) => {
        e.preventDefault();
        this.handleCardClick(index);
      });

      this.board.appendChild(cardElement);
    });
  }

  async handleCardClick(index) {
    if (this.isProcessing) return;

    const cardElement = this.board.children[index];
    if (!cardElement) return;

    // Can't click flipped or matched cards
    if (
      cardElement.classList.contains("flipped") ||
      cardElement.classList.contains("matched")
    ) {
      return;
    }

    // Check if already two cards flipped
    const flippedCards = this.board.querySelectorAll(
      ".card.flipped:not(.matched)",
    );
    if (flippedCards.length >= 2) return;

    // Flip the card
    cardElement.classList.add("flipped");

    try {
      const response = await fetch("/api/flip_card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game_id: this.gameId,
          card_id: index,
        }),
      });

      const data = await response.json();

      if (data.error) {
        console.error("Error:", data.error);
        return;
      }

      // Update moves
      if (data.moves !== undefined) {
        this.moves = data.moves;
        this.movesDisplay.textContent = this.moves;
      }

      // ===== CHECK IF MATCHED =====
      if (data.matched === true) {
        // Update matched cards with light color
        const matchedCards = data.cards.filter((c) => c.matched);
        this.pairsMatched = matchedCards.length / 2; // Each pair has 2 cards

        // Update display
        this.pairsDisplay.textContent = `${this.pairsMatched}/${this.numPairs}`;

        // Apply light color to matched cards
        matchedCards.forEach((c) => {
          const elem = this.board.children[c.id];
          if (elem) {
            elem.classList.add("matched");
            elem.classList.remove("flipped");

            // Add light color
            const front = elem.querySelector(".card-front");
            const valueColors = {
              1: "#B3E5FC",
              2: "#C8E6C9",
              3: "#FFE0B2",
              4: "#E1BEE7",
              5: "#FFCDD2",
              6: "#B2DFDB",
              7: "#F8BBD0",
              8: "#D1C4E9",
            };
            front.style.background = valueColors[c.value] || "#A8E6CF";
            front.style.borderColor = "#4CAF50";
            front.style.color = "#2E7D32";
          }
        });

        // Show star effect for pair found
        this.showPairFoundAnimation();

        // Check if game complete
        if (data.game_complete) {
          // Calculate stars
          const stars = this.calculateStars();
          this.starsDisplay.textContent = "⭐".repeat(stars) || "⭐";
          this.showLevelComplete(data);
        }
      } else if (data.matched === false) {
        // No match - flip back after delay
        this.isProcessing = true;
        setTimeout(async () => {
          try {
            const resetResponse = await fetch("/api/reset_flipped", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                game_id: this.gameId,
                card1: data.card1,
                card2: data.card2,
              }),
            });

            const resetData = await resetResponse.json();
            if (resetData.success) {
              resetData.cards.forEach((card, idx) => {
                const elem = this.board.children[idx];
                if (elem && !card.matched) {
                  elem.classList.remove("flipped");
                }
              });
            }
            this.isProcessing = false;
          } catch (error) {
            console.error("Error resetting cards:", error);
            this.isProcessing = false;
          }
        }, 800);
      }
    } catch (error) {
      console.error("Error flipping card:", error);
      this.isProcessing = false;
    }
  }

  showPairFoundAnimation() {
    // Create floating "Pair Found!" text
    const msg = document.createElement("div");
    msg.textContent = "✨ Pair Found! ✨";
    msg.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 2rem;
            font-weight: bold;
            color: #4CAF50;
            background: rgba(255,255,255,0.9);
            padding: 15px 30px;
            border-radius: 15px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            z-index: 999;
            animation: matchPop 0.6s ease;
            pointer-events: none;
        `;
    document.body.appendChild(msg);
    setTimeout(() => {
      msg.style.opacity = "0";
      msg.style.transition = "opacity 0.5s ease";
      setTimeout(() => msg.remove(), 500);
    }, 1200);
  }

  calculateStars() {
    // Calculate stars based on moves vs optimal
    const optimalMoves = this.numPairs; // Perfect: each pair in 1 move
    const ratio = this.moves / optimalMoves;

    if (ratio <= 1.2) return 3;
    if (ratio <= 1.8) return 2;
    return 1;
  }

  showLevelComplete(data) {
    const moves = data.moves || this.moves;
    const stars = this.calculateStars();

    document.getElementById("modal-message").textContent =
      `You completed Level ${this.level}! 🎉`;
    document.getElementById("modal-moves").textContent = moves;
    document.getElementById("modal-pairs").textContent =
      `${this.pairsMatched}/${this.numPairs}`;
    document.getElementById("modal-stars-display").textContent = "⭐".repeat(
      stars,
    );

    if (data.max_level) {
      this.maxLevel = data.max_level;
    }

    this.levelModal.classList.add("show");

    if (this.level + 1 > this.maxLevel) {
      document.getElementById("next-level-btn").textContent = "🔒 Locked";
      document.getElementById("next-level-btn").disabled = true;
    } else {
      document.getElementById("next-level-btn").textContent = "➜ Next Level";
      document.getElementById("next-level-btn").disabled = false;
    }
  }

  showLockedMessage(message) {
    const match = message.match(/(\d+)/);
    const levelNum = match ? match[1] : this.maxLevel;
    this.lockedLevel.textContent = levelNum;
    this.lockedMessage.style.display = "block";
    this.lockedMessage.querySelector("span").textContent =
      `🔒 Complete Level ${levelNum} first!`;

    document.getElementById("locked-modal-message").textContent =
      `Complete Level ${levelNum} first to unlock Level ${this.level}!`;
    this.lockedModal.classList.add("show");
  }
}

// Initialize game
document.addEventListener("DOMContentLoaded", () => {
  const game = new MemoryGame();
});
