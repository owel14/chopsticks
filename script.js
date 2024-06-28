// Wait for the DOM to load before initializing the game
document.addEventListener("DOMContentLoaded", () => {
  const gameManager = new GameManager();
  const uiManager = new UIManager(gameManager);
  const draggableManager = new DraggableManager(gameManager, uiManager);

  gameManager.setUIManager(uiManager);
  gameManager.setDraggableManager(draggableManager);

  gameManager.initializeGame();
});

class DraggableManager {
  constructor(gameManager, uiManager) {
    this.gameManager = gameManager;
    this.uiManager = uiManager;
    this.draggedElement = null;
    this.zIndexCounter = 1;

    this.initializeDraggableElements();
  }

  // Initialize all draggable elements by making them draggable
  initializeDraggableElements() {
    document
      .querySelectorAll(".draggable:not(.non-draggable)")
      .forEach((element) => {
        this.makeElementDraggable(element);
      });
  }

  // Make an individual element draggable
  makeElementDraggable(element) {
    element.addEventListener("mousedown", (e) => this.startDrag(e, element));
    element.addEventListener("touchstart", (e) => this.startDrag(e, element));
  }

  // Start dragging an element
  startDrag(event, element) {
    event.preventDefault();
    if (
      !this.gameManager.isCurrentPlayerTurn(element.id) ||
      element.classList.contains("non-draggable")
    )
      return;

    this.draggedElement = element;
    const initialMousePos = this.getEventPosition(event);

    const moveHandler = (e) => this.drag(e, element, initialMousePos);
    const endHandler = () => this.endDrag(element, moveHandler, endHandler);

    document.addEventListener("mousemove", moveHandler);
    document.addEventListener("touchmove", moveHandler, { passive: false });
    document.addEventListener("mouseup", endHandler);
    document.addEventListener("touchend", endHandler);

    element.style.zIndex = ++this.zIndexCounter;
  }

  // Handle the dragging of an element
  drag(event, element, initialMousePos) {
    event.preventDefault();
    const currentMousePos = this.getEventPosition(event);
    const deltaX = currentMousePos.x - initialMousePos.x;
    const deltaY = currentMousePos.y - initialMousePos.y;
    element.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

    this.showOverlapPreview(element);
  }

  // End the dragging of an element
  endDrag(element, moveHandler, endHandler) {
    document.removeEventListener("mousemove", moveHandler);
    document.removeEventListener("touchmove", moveHandler);
    document.removeEventListener("mouseup", endHandler);
    document.removeEventListener("touchend", endHandler);

    const [deltaX, deltaY] = this.getElementTranslation(element);
    const changesCommitted = this.commitChangesOnOverlap(element);

    if (changesCommitted) {
      this.uiManager.updateHandPosition(element, deltaX, deltaY);
      this.uiManager.updateAllHands();
    } else {
      element.style.transform = "none";
    }

    this.draggedElement = null;
  }

  // Get the position of the event (mouse or touch)
  getEventPosition(event) {
    return event.touches
      ? { x: event.touches[0].clientX, y: event.touches[0].clientY }
      : { x: event.clientX, y: event.clientY };
  }

  // Get the translation values of the element
  getElementTranslation(element) {
    const transform = element.style.transform;
    const match = transform.match(/translate\((\d+)px,\s*(\d+)px\)/);
    return match ? [parseInt(match[1], 10), parseInt(match[2], 10)] : [0, 0];
  }

  // Show a preview if the dragged element overlaps with another element
  showOverlapPreview(element) {
    let isOverlapping = false;
    document.querySelectorAll(".draggable").forEach((otherElement) => {
      if (
        otherElement !== element &&
        this.isOverlapping(element, otherElement) &&
        //check if other element is equal to 0
        this.gameManager.getHandValue(otherElement.id) !== 0 &&
        //check if the two hands are on the same player
        this.gameManager.parseHandId(element.id)[0] !==
          this.gameManager.parseHandId(otherElement.id)[0]
      ) {
        isOverlapping = true;
        const sum = this.gameManager.calculateSum(element.id, otherElement.id);
        this.uiManager.updateHandPreview(otherElement, sum);
      } else {
        this.uiManager.revertHandPreview(otherElement);
      }
    });

    if (!isOverlapping) {
      this.uiManager.revertAllPreviews();
    }
  }

  // Commit changes if the dragged element overlaps with another element
  commitChangesOnOverlap(element) {
    let changeCommitted = false;
    document.querySelectorAll(".draggable").forEach((otherElement) => {
      if (
        otherElement !== element &&
        this.isOverlapping(element, otherElement)
      ) {
        const move = new MoveAdd(this.gameManager, element.id, otherElement.id);
        if (move.isValid()) {
          this.gameManager.executeMove(move);
          changeCommitted = true;
          this.uiManager.clearPreviews();
        }
      }
    });
    return changeCommitted;
  }

  // Check if two elements are overlapping
  isOverlapping(el1, el2) {
    const rect1 = el1.getBoundingClientRect();
    const rect2 = el2.getBoundingClientRect();
    return !(
      rect1.right < rect2.left ||
      rect1.left > rect2.right ||
      rect1.bottom < rect2.top ||
      rect1.top > rect2.bottom
    );
  }
}

class GameState {
  constructor() {
    this.players = {
      player1: { leftHand: 1, rightHand: 1 },
      player2: { leftHand: 1, rightHand: 1 },
    };
    this.startingPlayer = "player2";
    this.currentPlayer = "player2";
    this.isGameOver = false;
  }

  getCurrentPlayer() {
    return this.currentPlayer;
  }

  switchStartingPlayer() {
    this.startingPlayer = this.startingPlayer === "player1" ? "player2" : "player1";
  }

  // Get the value of a specific hand for a player
  getHandValue(playerId, hand) {
    return this.players[playerId][hand];
  }

  // Set the value of a specific hand for a player
  setHandValue(playerId, hand, value) {
    this.players[playerId][hand] = value;
  }

  // Switch the current player's turn
  switchTurn() {
    this.currentPlayer =
      this.currentPlayer === "player1" ? "player2" : "player1";
  }

  // Reset the game state
  reset() {
    this.players.player1 = { leftHand: 1, rightHand: 1 };
    this.players.player2 = { leftHand: 1, rightHand: 1 };
    this.currentPlayer = this.startingPlayer;  
    this.isGameOver = false;
  }
}

class GameManager {
  constructor() {
    this.gameState = new GameState();
    this.uiManager = null;
    this.draggableManager = null;
    this.bot = new randomComputerBot(this);
  }

  // Set the UIManager instance
  setUIManager(uiManager) {
    this.uiManager = uiManager;
  }

  // Set the DraggableManager instance
  setDraggableManager(draggableManager) {
    this.draggableManager = draggableManager;
  }

  // Initialize the game
  initializeGame() {
    if (this.uiManager) {
      this.uiManager.updateAllHands();
      this.gameState.reset();
    }
  }

  // Get the value of a hand by its ID
  getHandValue(handId) {
    const [playerId, hand] = this.parseHandId(handId);
    return this.gameState.getHandValue(playerId, hand);
  }

  // Set the value of a hand by its ID
  setHandValue(handId, value) {
    const [playerId, hand] = this.parseHandId(handId);
    this.gameState.setHandValue(playerId, hand, value);

    // If the value is 0, make the hand non-draggable
    const handElement = document.getElementById(handId);
    if (value === 0) {
      handElement.classList.add("non-draggable");
    } else {
      handElement.classList.remove("non-draggable");
    }
  }

  // Parse the hand ID into player ID and hand
  parseHandId(handId) {
    // Define the regex to match and capture the player and hand parts
    const regex = /^(top|bottom)(Left|Right)$/;
    const match = handId.match(regex);

    // Check if the match was successful and extract the parts
    if (match) {
      const playerPart = match[1]; // "top" or "bottom"
      const handPart = match[2]; // "Left" or "Right"
      const playerMap = { top: "player1", bottom: "player2" };
      const handMap = { Left: "leftHand", Right: "rightHand" };
      const playerId = playerMap[playerPart];
      const hand = handMap[handPart];
      return [playerId, hand];
    } else {
      // Handle the case where the handId format is not as expected
      return [undefined, undefined];
    }
  }

  // Check if it is the current player's turn for a given hand
  isCurrentPlayerTurn(handId) {
    const [playerId] = this.parseHandId(handId);
    return playerId === this.gameState.currentPlayer;
  }

  // Check if the game has ended
  checkGameEnd() {
    const isPlayer1Defeated = this.isPlayerDefeated("player1");
    const isPlayer2Defeated = this.isPlayerDefeated("player2");

    if (isPlayer1Defeated || isPlayer2Defeated) {
      this.gameState.isGameOver = true;
      const winner = isPlayer1Defeated ? "You" : "Computer";
      this.uiManager.showGameOverPopup(`${winner} win!`);
      return true;
    }
    return false;
  }

  // Check if a player is defeated
  isPlayerDefeated(playerId) {
    return (
      this.gameState.getHandValue(playerId, "leftHand") === 0 &&
      this.gameState.getHandValue(playerId, "rightHand") === 0
    );
  }

  // Reset the game
  resetGame() {
    this.gameState.switchStartingPlayer();
    this.gameState.reset();
    this.uiManager.resetUI();
    
    // Clear any pending timeouts
    if (this.computerMoveTimeout) {
        clearTimeout(this.computerMoveTimeout);
    }
    
    // Only run the computer bot if it's the computer's turn
    if (this.gameState.currentPlayer === "player1") {
        this.runComputerBot();
    }
}
  // Switch the current player's turn
  switchTurn() {
    console.log("Switching turn");
    this.gameState.switchTurn();
    this.uiManager.updateTurnIndicator();
    console.log(this.gameState.currentPlayer);
  }

  // Calculate the sum of two hands
  calculateSum(handId1, handId2) {
    const value1 = this.getHandValue(handId1);
    const value2 = this.getHandValue(handId2);
    return value1 + value2;
  }

  getAllValidDistributions() {
    //get current players left hand value
    const currentPlayer = this.gameState.getCurrentPlayer();
    const leftHandId = currentPlayer === "player1" ? "topLeft" : "bottomLeft";
    const rightHandId =
      currentPlayer === "player1" ? "topRight" : "bottomRight";
    const currentLeft = this.getHandValue(leftHandId);
    const currentRight = this.getHandValue(rightHandId);
    const total = currentLeft + currentRight;
    return this.generateDistributions(total).filter((distribution) =>
      this.isNewDistribution(distribution, currentLeft, currentRight)
    );
  }

  // Generate all possible distributions of a total value
  generateDistributions(total) {
    const distributions = [];
    for (let i = 0; i <= 4; i++) {
      for (let j = 0; j <= 4; j++) {
        if (i + j === total) {
          const pair = [i, j].sort(); // Sort the pair
          if (
            !distributions.some(
              (existing) => existing[0] === pair[0] && existing[1] === pair[1]
            )
          ) {
            distributions.push(pair);
          }
        }
      }
    }
    return distributions;
  }

  // Check if a distribution is new
  isNewDistribution(distribution, currentLeft, currentRight) {
    const [newLeft, newRight] = distribution;
    return (
      !(newLeft === currentLeft && newRight === currentRight) &&
      !(newLeft === currentRight && newRight === currentLeft)
    );
  }

  //run the computer bot
  runComputerBot() {
    if (this.gameState.currentPlayer === "player1") {
        // Store the timeout ID so we can clear it if needed
        this.computerMoveTimeout = setTimeout(() => {
            const bot = new randomComputerBot(this);
            bot.performComputerMove();
        }, 1000);
    }
}

  // Execute a move if it is valid
  executeMove(move) {
    if (move.isValid()) {
        move.execute();

        if (!this.checkGameEnd()) {
            this.switchTurn();
            this.uiManager.updateAllHands();
            
            // Only run the computer bot if it's the computer's turn
            if (this.gameState.currentPlayer === "player1") {
                this.runComputerBot();
            }
        }
        this.uiManager.updateAllHands();
    }
}
}

class UIManager {
  constructor(gameManager) {
    this.gameManager = gameManager;
    this.popupElement = document.getElementById("popupContainer");
    this.messageElement = document.getElementById("winnerMessage");
    this.restartButton = document.getElementById("restartButton");
    this.splitButton = document.getElementById("splitButton");
    this.splitContainer = document.getElementById("splitContainer");
    this.splitCloseButton = document.getElementById("closeSplit");
    this.previewStates = new Map();

    this.initializeEventListeners();
  }

  // Initialize event listeners for UI elements
  initializeEventListeners() {
    this.restartButton.addEventListener("click", () => {
      this.gameManager.resetGame();
      this.hidePopup();
    });

    this.splitButton.addEventListener("click", () => this.showSplitOptions());
    this.splitCloseButton.addEventListener("click", () =>
      this.hideSplitOptions()
    );
  }

  // Update the turn indicator in the UI
  updateTurnIndicator() {
    const currentPlayer = this.gameManager.gameState.currentPlayer;
    document
      .getElementById("computer")
      .classList.toggle("active-player", currentPlayer === "player1");
    document
      .getElementById("player")
      .classList.toggle("active-player", currentPlayer === "player2");
    
    // Enable split button only for player2 (human player)
    this.setSplitButtonState(currentPlayer === "player2");
  }

  

  // Show the game over popup with a message
  showGameOverPopup(message) {
    this.messageElement.textContent = message;
    this.popupElement.style.display = "flex";
  }

  // Hide the game over popup
  hidePopup() {
    this.popupElement.style.display = "none";
  }

  // Update all hand images in the UI
  updateAllHands() {
    ["topLeft", "topRight", "bottomLeft", "bottomRight"].forEach((handId) => {
      this.updateHandImage(handId);
    });
  }

  // Update the image of a specific hand in the UI
  updateHandImage(handId) {
    const imgElement = document.getElementById(handId).querySelector("img");
    const value = this.gameManager.getHandValue(handId);
    imgElement.src = `img/${value}.png`;
  }

  // Reset the UI to its initial state
  resetUI() {
    this.updateAllHands();
    ["topLeft", "topRight", "bottomLeft", "bottomRight"].forEach((handId) => {
      this.resetHandPosition(handId);
      document.getElementById(handId).classList.remove("non-draggable");
    });
    this.updateTurnIndicator();
  }

  // Reset the position of a specific hand in the UI
  resetHandPosition(handId) {
    const element = document.getElementById(handId);
    element.style.left = "";
    element.style.top = "";
    element.style.transform = "none";
  }

  setSplitButtonState(enabled) {
    this.splitButton.disabled = !enabled;
    this.splitButton.style.opacity = enabled ? "1" : "0.5";
    this.splitButton.style.cursor = enabled ? "pointer" : "not-allowed";
  }

  // Show split options for the current player
  showSplitOptions() {
    const validDistributions = this.gameManager.getAllValidDistributions();
    console.log(validDistributions);
    const splitOptions = document.getElementById("splitOptions");
    splitOptions.innerHTML = "";

    validDistributions.forEach(([bag1, bag2]) => {
      const button = document.createElement("button");
      button.classList.add("split-option");

      const img1 = document.createElement("img");
      img1.src = `img/${bag1}.png`;
      img1.alt = `Hand ${bag1}`;
      button.appendChild(img1);

      const img2 = document.createElement("img");
      img2.src = `img/${bag2}.png`;
      img2.alt = `Hand ${bag2}`;
      button.appendChild(img2);

      button.addEventListener("click", () => this.handleSplitClick(bag1, bag2));
      splitOptions.appendChild(button);
    });

    this.splitContainer.style.display = "flex";
  }

  // Hide the split options
  hideSplitOptions() {
    this.splitContainer.style.display = "none";
    this.splitButton.style.display = "flex";
  }

  // Handle a click on a split option
  handleSplitClick(bag1, bag2) {
    const moveSplit = new MoveSplit(this.gameManager, bag1, bag2);
    if (moveSplit.isValid) {
      console.log(bag1, bag2);
      this.gameManager.executeMove(moveSplit);
      this.hideSplitOptions();
    }
  }

  // Update the position of a hand in the UI
  updateHandPosition(element, deltaX, deltaY) {
    element.style.left = `${element.offsetLeft + deltaX}px`;
    element.style.top = `${element.offsetTop + deltaY}px`;
    element.style.transform = "none";
  }

  // Update the hand preview during dragging
  updateHandPreview(element, sum) {
    if (sum !== null) {
      const elementImg = element.querySelector("img");
      if (!this.previewStates.has(elementImg)) {
        this.previewStates.set(elementImg, elementImg.src);
      }
      elementImg.src = `img/${sum >= 5 ? 0 : sum}.png`;
    }
  }

  // Revert the hand preview to its original state
  revertHandPreview(element) {
    const elementImg = element.querySelector("img");
    if (this.previewStates.has(elementImg)) {
      elementImg.src = this.previewStates.get(elementImg);
      this.previewStates.delete(elementImg);
    }
  }

  // Revert all previews to their original states
  revertAllPreviews() {
    this.previewStates.forEach((originalSrc, img) => {
      img.src = originalSrc;
    });
    this.clearPreviews();
  }

  // Clear all preview states
  clearPreviews() {
    this.previewStates.clear();
  }
}

class Move {
  constructor(gameManager) {
    this.gameManager = gameManager;
  }

  isValid() {
    return true;
  }

  execute() {
    return true;
  }
}

class MoveAdd extends Move {
  constructor(gameManager, sourceHandId, targetHandId) {
    super(gameManager);
    this.sourceHandId = sourceHandId;
    this.targetHandId = targetHandId;
  }

  // Check if the move is valid
  isValid() {
    const [sourcePlayerId] = this.gameManager.parseHandId(this.sourceHandId);
    const [targetPlayerId] = this.gameManager.parseHandId(this.targetHandId);
    const sourceValue = this.gameManager.getHandValue(this.sourceHandId);
    const targetValue = this.gameManager.getHandValue(this.targetHandId);

    return (
      sourcePlayerId !== targetPlayerId && sourceValue > 0 && targetValue !== 0
    );
  }

  // Execute the move
  execute() {
    const sourceValue = this.gameManager.getHandValue(this.sourceHandId);
    const targetValue = this.gameManager.getHandValue(this.targetHandId);
    const sum = sourceValue + targetValue;
    this.gameManager.setHandValue(this.targetHandId, sum >= 5 ? 0 : sum);
  }
}

class MoveSplit extends Move {
  constructor(gameManager, newLeft, newRight) {
    super(gameManager);
    this.newLeft = newLeft;
    this.newRight = newRight;
  }

  // Check if a split is valid
  isValid() {
    const validSplits = this.gameManager.getAllValidDistributions();
    return (
      validSplits.some(
        (split) => split[0] === this.newLeft && split[1] === this.newRight
      ) ||
      validSplits.some(
        (split) => split[0] === this.newRight && split[1] === this.newLeft
      )
    );
  }

  // Execute a split
  execute() {
    if (this.isValid()) {
      const currentPlayer = this.gameManager.gameState.getCurrentPlayer();
      const leftHandId = currentPlayer === "player1" ? "topLeft" : "bottomLeft";
      const rightHandId =
        currentPlayer === "player1" ? "topRight" : "bottomRight";
      this.gameManager.setHandValue(leftHandId, this.newLeft);
      this.gameManager.setHandValue(rightHandId, this.newRight);
    }
  }
}

class computerBot {
  constructor(gameManager) {
    this.gameManager = gameManager;
  }
  performComputerMove() {}

  performSplitMove() {}

  performAddMove() {}

  animateAddMove(sourceHand, targetHand, callback) {
    const sourceElement = document.getElementById(sourceHand);
    const targetClass =
      targetHand === "bottomRight"
        ? "move-towards-bottom-left"
        : "move-towards-bottom-right";

    sourceElement.classList.add(targetClass);

    setTimeout(() => {
      sourceElement.classList.remove(targetClass);
      callback();
    }, 500);
  }

  animateSplitMove(callback) {
    const leftHand = document.getElementById("topLeft");
    const rightHand = document.getElementById("topRight");

    leftHand.classList.add("move-towards-center");
    rightHand.classList.add("move-towards-center");

    setTimeout(() => {
      leftHand.classList.remove("move-towards-center");
      rightHand.classList.remove("move-towards-center");
      leftHand.classList.add("move-away-from-center");
      rightHand.classList.add("move-away-from-center");

      setTimeout(() => {
        leftHand.classList.remove("move-away-from-center");
        rightHand.classList.remove("move-away-from-center");
        callback();
      }, 500);
    }, 500);
  }
}

class randomComputerBot extends computerBot {
  constructor(gameManager) {
    super(gameManager);
  }

  // perform an add move for the computer from a random legal hand on computer side to another random legal hand on player side
  performComputerMove() {
    const random = Math.floor(Math.random() * 2);
    if (random === 0) {
      this.performSplitMove();
    } else {
      this.performAddMove();
    }
  }

  performSplitMove() {
    const validSplits = this.gameManager.getAllValidDistributions();
    const split = validSplits[Math.floor(Math.random() * validSplits.length)];
    if(validSplits.length === 0 && !this.gameManager.checkGameEnd()){
      this.performAddMove();
      return;
    }
    const move = new MoveSplit(this.gameManager, split[0], split[1]);
    if (move.isValid() && !this.gameManager.checkGameEnd() && this.gameManager.gameState.currentPlayer === "player1"){
      this.animateSplitMove(() => {
        this.gameManager.executeMove(move);
      });
    } else if (!this.gameManager.checkGameEnd() && this.gameManager.gameState.currentPlayer === "player1") {
      this.performAddMove();
    }
  }

  performAddMove() {
    const computerHands = ["topLeft", "topRight"];
    const playerHands = ["bottomLeft", "bottomRight"];
    const computerHand = computerHands[Math.floor(Math.random() * 2)];
    const playerHand = playerHands[Math.floor(Math.random() * 2)];
    const move = new MoveAdd(this.gameManager, computerHand, playerHand);
    if (move.isValid() && !this.gameManager.checkGameEnd() && this.gameManager.gameState.currentPlayer === "player1"){
      this.animateAddMove(computerHand, playerHand, () => {
        this.gameManager.executeMove(move);
      });
    } else if (!this.gameManager.checkGameEnd() && this.gameManager.gameState.currentPlayer === "player1") {
      this.performAddMove();
    }
  }
}
