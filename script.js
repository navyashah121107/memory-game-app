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
        // Try to go to next level (will show locked)
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
        if (
          confirm(
            "Are you sure you want to reset all progress? All levels will be locked except Level 1.",
          )
        ) {
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
      this.level = this.maxLevel; // Start at the highest unlocked level
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
      // Show loading state
      this.board.innerHTML =
        '<div style="text-align:center;padding:40px;color:#666;">Loading...</div>';

      const response = await fetch("/api/new_game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: level }),
      });

      const data = await response.json();

      // Check if level is locked
      if (data.error) {
        this.showLockedMessage(data.error);
        // Reset to valid level
        this.level = this.maxLevel;
        this.startNewGame(this.maxLevel);
        return;
      }

      // Update game state
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

      // Hide locked message
      this.lockedMessage.style.display = "none";

      // Render board
      this.renderBoard(data.cards, data.grid_rows, data.grid_cols);

      // Close modals
      this.levelModal.classList.remove("show");
      this.lockedModal.classList.remove("show");

      // Update button states
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

    // Get value colors
    const valueColors = {
      1: "#FF6B6B",
      2: "#4ECDC4",
      3: "#45B7D1",
      4: "#96CEB4",
      5: "#FFEAA7",
      6: "#DDA0DD",
      7: "#FF8A5C",
      8: "#A29BFE",
      9: "#FD79A8",
      10: "#00B894",
      11: "#FDCB6E",
      12: "#6C5CE7",
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
      const color = valueColors[card.value] || "#667eea";
      front.style.borderColor = color;
      front.style.color = color;
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
    // Prevent clicks during processing or game over
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

      // Check if matched
      if (data.matched === true) {
        // Update matched cards
        const matchedCards = data.cards.filter((c) => c.matched);
        matchedCards.forEach((c) => {
          const elem = this.board.children[c.id];
          if (elem) {
            elem.classList.add("matched");
            elem.classList.remove("flipped");
          }
        });

        // Update pairs
        this.pairsMatched = matchedCards.length;
        this.pairsDisplay.textContent = `${this.pairsMatched}/${this.numPairs}`;

        // Check if game complete
        if (data.game_complete) {
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
              // Unflip the cards
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

  showLevelComplete(data) {
    const moves = data.moves || this.moves;
    document.getElementById("modal-message").textContent =
      `You completed Level ${this.level} in ${moves} moves! 🎉`;
    document.getElementById("modal-moves").textContent = moves;
    document.getElementById("modal-pairs").textContent = this.numPairs;

    // Update max level
    if (data.max_level) {
      this.maxLevel = data.max_level;
    }

    this.levelModal.classList.add("show");

    // Check if next level is unlocked
    if (this.level + 1 > this.maxLevel) {
      document.getElementById("next-level-btn").textContent = "🔒 Locked";
      document.getElementById("next-level-btn").disabled = true;
    } else {
      document.getElementById("next-level-btn").textContent = "➜ Next Level";
      document.getElementById("next-level-btn").disabled = false;
    }
  }

  showLockedMessage(message) {
    // Extract level number from message
    const match = message.match(/(\d+)/);
    const levelNum = match ? match[1] : this.maxLevel;
    this.lockedLevel.textContent = levelNum;
    this.lockedMessage.style.display = "block";
    this.lockedMessage.querySelector("span").textContent =
      `🔒 Complete Level ${levelNum} first!`;

    // Show locked modal
    document.getElementById("locked-modal-message").textContent =
      `Complete Level ${levelNum} first to unlock Level ${this.level}!`;
    this.lockedModal.classList.add("show");
  }
}

// Initialize game
document.addEventListener("DOMContentLoaded", () => {
  const game = new MemoryGame();
});
