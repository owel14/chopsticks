// Wait for the DOM to load before initializing the game
document.addEventListener("DOMContentLoaded", () => {
  const gameManager = new GameManager();
  const uiManager = new UIManager(gameManager);
  const draggableManager = new DraggableManager(gameManager, uiManager);
  gameManager.setUIManager(uiManager);
  gameManager.setDraggableManager(draggableManager);
  gameManager.initializeGame();
});

class GameState {
  constructor() {
    // Initialize the game state with default values
    this.players = {
      player1: { leftHand: 1, rightHand: 1 },
      player2: { leftHand: 1, rightHand: 1 },
    };
    this.startingPlayer = "player2";
    this.currentPlayer = "player2";
    this.isGameOver = false;
  }

  // Get the current player's ID
  getCurrentPlayer() {
    return this.currentPlayer;
  }

  // Create a deep copy of the current game state
  getStateSnapshot() {
    return JSON.parse(JSON.stringify(this.players));
  }

  // Switch the starting player for the next game
  switchStartingPlayer() {
    this.startingPlayer =
      this.startingPlayer === "player1" ? "player2" : "player1";
  }

  // Get the value of a specific hand for a player
  getHandValue(playerId, hand) {
    return this.players[playerId][hand];
  }

  // Set the value of a specific hand for a player
  setHandValue(playerId, hand, value) {
    this.players[playerId][hand] = value;
  }

  // Switch turns between players
  switchTurn() {
    this.currentPlayer =
      this.currentPlayer === "player1" ? "player2" : "player1";
  }

  // Reset the game state to starting conditions
  reset() {
    this.players.player1 = { leftHand: 1, rightHand: 1 };
    this.players.player2 = { leftHand: 1, rightHand: 1 };
    this.currentPlayer = this.startingPlayer;
    this.isGameOver = false;
  }

  // Check if a player has been defeated (both hands at 0)
  isPlayerDefeated(playerId) {
    return (
      this.getHandValue(playerId, "leftHand") === 0 &&
      this.getHandValue(playerId, "rightHand") === 0
    );
  }

  // Check if the game has ended and return the winner if so
  checkGameEnd() {
    const isPlayer1Defeated = this.isPlayerDefeated("player1");
    const isPlayer2Defeated = this.isPlayerDefeated("player2");

    if (isPlayer1Defeated || isPlayer2Defeated) {
      this.isGameOver = true;
      return isPlayer1Defeated ? "player2" : "player1";
    }
    return null;
  }
}

class HandManager {
  constructor(gameState) {
    this.gameState = gameState;
  }

  // Get the value of a specific hand
  getHandValue(handId) {
    const [playerId, hand] = this.parseHandId(handId);
    return this.gameState.getHandValue(playerId, hand);
  }

  // Set the value of a specific hand
  setHandValue(handId, value) {
    const [playerId, hand] = this.parseHandId(handId);
    this.gameState.setHandValue(playerId, hand, value);
  }

  // Parse a hand ID into player ID and hand (left/right)
  parseHandId(handId) {
    const regex = /^(top|bottom)(Left|Right)$/;
    const match = handId.match(regex);
    if (match) {
      const playerPart = match[1];
      const handPart = match[2];
      const playerMap = { top: "player1", bottom: "player2" };
      const handMap = { Left: "leftHand", Right: "rightHand" };
      return [playerMap[playerPart], handMap[handPart]];
    }
    return [undefined, undefined];
  }

  // Calculate the sum of two hands' values
  calculateSum(handId1, handId2) {
    const value1 = this.getHandValue(handId1);
    const value2 = this.getHandValue(handId2);
    return value1 + value2;
  }

  // Get all valid distributions for splitting hands
  getAllValidDistributions(stateSnapeShot) {
    const currentPlayer = this.gameState.getCurrentPlayer();
    const currentLeft = stateSnapeShot[currentPlayer].leftHand;
    const currentRight = stateSnapeShot[currentPlayer].rightHand;

    const total = currentLeft + currentRight;
    return this.generateDistributions(total).filter((distribution) =>
      this.isNewDistribution(distribution, currentLeft, currentRight)
    );
  }

  // Generate all possible distributions for a given total
  generateDistributions(total) {
    const distributions = [];
    for (let i = 0; i <= 4; i++) {
      for (let j = 0; j <= 4; j++) {
        if (i + j === total) {
          const pair = [i, j].sort();
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

  // Check if a distribution is different from the current hand state
  isNewDistribution(distribution, currentLeft, currentRight) {
    const [newLeft, newRight] = distribution;
    return (
      !(newLeft === currentLeft && newRight === currentRight) &&
      !(newLeft === currentRight && newRight === currentLeft)
    );
  }
}

class BotManager {
  constructor(gameManager) {
    this.gameManager = gameManager;
    this.currentBot = null;
  }

  // Set the bot type based on difficulty level
  setBot(botType) {
    switch (botType) {
      case "easy":
        this.currentBot = new randomComputerBot(this.gameManager);
        break;
      case "medium":
        this.currentBot = new MixedBot(this.gameManager);
        break;
      case "hard":
        this.currentBot = new MinimaxBot(this.gameManager, 12);
        break;
      default:
        this.currentBot = new randomComputerBot(this.gameManager);
    }
  }

  // Execute a computer move if it's the computer's turn
  runComputerBot() {
    if (
      this.gameManager.gameState.getCurrentPlayer() === "player1" &&
      this.currentBot
    ) {
      // Add a delay before the computer move for better user experience
      this.gameManager.computerMoveTimeout = setTimeout(() => {
        this.currentBot.performComputerMove();
      }, 1000);
    }
  }
}

class GameManager {
  constructor() {
    this.gameState = new GameState();
    this.handManager = new HandManager(this.gameState);
    this.botManager = new BotManager(this);
    this.uiManager = null;
    this.draggableManager = null;
    this.computerMoveTimeout = null;
    this.previewSplit = null;
    this.stateSnapeShot = null;
  }

  // Set a snapshot of the current game state
  setStateSnapeShot() {
    this.stateSnapeShot = this.gameState.getStateSnapshot();
  }

  // Set the UI manager
  setUIManager(uiManager) {
    this.uiManager = uiManager;
  }

  // Set the preview for a split move
  setPreviewSplit(previewSplit) {
    const [hand1, hand2] = previewSplit.getHands();

    if (previewSplit.isValid()) {
      this.previewSplit = previewSplit;
      this.uiManager.setSplitButtonState(true);
    } else {
      this.previewSplit = null;
      this.uiManager.setSplitButtonState(false);
    }
    this.setHandValue("bottomLeft", hand1);
    this.setHandValue("bottomRight", hand2);
    this.uiManager.updateAllHands();
  }

  // Set the bot type
  setBotType(botType) {
    this.botManager.setBot(botType);
  }

  // Set the draggable manager
  setDraggableManager(draggableManager) {
    this.draggableManager = draggableManager;
  }

  // Initialize the game
  initializeGame() {
    if (this.uiManager) {
      this.stateSnapeShot = this.gameState.getStateSnapshot();
      this.uiManager.updateAllHands();
      this.gameState.reset();
      this.botManager.setBot();
    }
  }

  // Get the value of a specific hand
  getHandValue(handId) {
    return this.handManager.getHandValue(handId);
  }

  // Set the value of a specific hand
  setHandValue(handId, value) {
    this.handManager.setHandValue(handId, value);
    const handElement = document.getElementById(handId);
    if (value === 0) {
      handElement.classList.add("non-draggable");
    } else {
      handElement.classList.remove("non-draggable");
    }
    this.uiManager.updateHandImage(handId);
  }

  // Check if it's the current player's turn
  isCurrentPlayerTurn(handId) {
    const [playerId] = this.handManager.parseHandId(handId);
    return playerId === this.gameState.currentPlayer;
  }

  // Check if the game has ended
  checkGameEnd() {
    const winner = this.gameState.checkGameEnd();
    if (winner) {
      const winnerText = winner === "player1" ? "Computer" : "You";
      this.uiManager.showGameOverPopup(`${winnerText} win!`);
      return true;
    }
    return false;
  }

  // Reset the game
  resetGame(difficulty) {
    this.gameState.switchStartingPlayer();
    this.gameState.reset();
    this.uiManager.resetUI();
    this.setBotType(difficulty);

    if (this.computerMoveTimeout) {
      clearTimeout(this.computerMoveTimeout);
    }

    if (this.gameState.getCurrentPlayer() === "player1") {
      this.botManager.runComputerBot();
    }

    this.setStateSnapeShot();
    this.uiManager.setSplitButtonState(false);
  }

  // Switch turns between players
  switchTurn() {
    this.gameState.switchTurn();
    this.uiManager.updateTurnIndicator();
  }

  // Calculate the sum of two hands
  calculateSum(handId1, handId2) {
    return this.handManager.calculateSum(handId1, handId2);
  }

  // Get all valid distributions for splitting
  getAllValidDistributions() {
    return this.handManager.getAllValidDistributions(this.stateSnapeShot);
  }

  // Execute a move
  executeMove(move) {
    if (move.isValid()) {
      move.execute();
      if (!this.checkGameEnd()) {
        this.switchTurn();
        this.uiManager.updateAllHands();
        if (this.gameState.getCurrentPlayer() === "player1") {
          this.botManager.runComputerBot();
        }
      }
      this.uiManager.updateAllHands();
    }

    this.previewSplit = null;
    this.setStateSnapeShot();
    this.uiManager.setSplitButtonState(false);
  }
}

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
      .querySelectorAll(".draggable:not(.computer)")
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
        this.isOverlapping(element, otherElement)
      ) {
        if (this.canAddHands(element, otherElement)) {
          isOverlapping = true;
          const sum = this.gameManager.calculateSum(
            element.id,
            otherElement.id
          );
          this.uiManager.updateHandPreview(otherElement, sum);
        } else if (this.canSplitHands(element, otherElement)) {
          isOverlapping = true;
          this.updateSplitPreview(element, otherElement);
        }
      }
    });

    if (!isOverlapping) {
      this.uiManager.revertAllPreviews();
    }
  }

  // Commit changes if there's an overlap after dragging
  commitChangesOnOverlap(element) {
    let changeCommitted = false;

    document.querySelectorAll(".draggable").forEach((otherElement) => {
      if (
        otherElement !== element &&
        this.isOverlapping(element, otherElement)
      ) {
        if (this.canAddHands(element, otherElement)) {
          changeCommitted = this.executeAddMove(element, otherElement);
        } else if (this.canSplitHands(element, otherElement)) {
          changeCommitted = this.executeSplitMove(element, otherElement);
        }
      }
    });

    return changeCommitted;
  }

  // Check if hands can be added
  canAddHands(element, otherElement) {
    return (
      !this.isSamePlayer(element, otherElement) &&
      this.gameManager.getHandValue(otherElement.id) !== 0 &&
      this.gameManager.previewSplit === null
    );
  }

  // Check if hands can be split
  canSplitHands(element, otherElement) {
    return (
      this.isSamePlayer(element, otherElement) &&
      this.gameManager.getHandValue(otherElement.id) !== 4
    );
  }

  // Check if two elements belong to the same player
  isSamePlayer(element1, element2) {
    const player1 = this.gameManager.handManager.parseHandId(element1.id)[0];
    const player2 = this.gameManager.handManager.parseHandId(element2.id)[0];
    return player1 === player2;
  }

  // Update the preview for a split move
  updateSplitPreview(element, otherElement) {
    const elementValue = this.gameManager.getHandValue(element.id);
    const otherElementValue = this.gameManager.getHandValue(otherElement.id);
    this.uiManager.updateHandPreview(element, elementValue - 1);
    this.uiManager.updateHandPreview(otherElement, otherElementValue + 1);
  }

  // Execute an add move
  executeAddMove(element, otherElement) {
    const move = new MoveAdd(this.gameManager, element.id, otherElement.id);
    if (move.isValid()) {
      this.gameManager.executeMove(move);
      this.uiManager.clearPreviews();
      return true;
    }
    return false;
  }

  // Execute a split move
  executeSplitMove(element, otherElement) {
    const split = this.createSplitMove(element, otherElement);
    if (split) {
      this.gameManager.setPreviewSplit(split);
      this.uiManager.clearPreviews();
      return true;
    }
    return false;
  }

  // Create a split move
  createSplitMove(element, otherElement) {
    const elementValue = this.gameManager.getHandValue(element.id);
    const otherElementValue = this.gameManager.getHandValue(otherElement.id);
    const isLeftHand =
      this.gameManager.handManager.parseHandId(element.id)[1] === "leftHand";

    return isLeftHand
      ? new MoveSplit(this.gameManager, elementValue - 1, otherElementValue + 1)
      : new MoveSplit(
          this.gameManager,
          otherElementValue + 1,
          elementValue - 1
        );
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

class UIManager {
  constructor(gameManager) {
    this.gameManager = gameManager;
    this.popupElement = document.getElementById("popupContainer");
    this.messageElement = document.getElementById("winnerMessage");
    this.restartButton = document.getElementById("restartButton");
    this.splitButton = document.getElementById("splitButton");
    this.infobox = document.getElementById("info-box");
    this.infoButton = document.getElementById("info-button");
    this.closeInfo = document.getElementById("closeInfo");
    this.winPopup = document.getElementById("youWinPopup");
    this.winnerMessage = document.getElementById("winnerMessage");
    this.playAgainButton = document.getElementById("playAgainButton");
    this.previewStates = new Map();

    this.initializeEventListeners();
  }

  // Initialize event listeners for UI elements
  initializeEventListeners() {
    this.restartButton.addEventListener("click", () => {
      const selectedDifficulty = document.querySelector(
        'input[name="radDifficulty"]:checked'
      );
      this.gameManager.resetGame(selectedDifficulty.value);
      this.hidePopup();
    });

    this.splitButton.addEventListener("click", () => this.handleSplitClick());

    this.infoButton.addEventListener("click", () => {
      this.infobox.style.display = "flex";
    });

    this.closeInfo.addEventListener("click", () => {
      this.infobox.style.display = "none";
    });

    this.playAgainButton.addEventListener("click", () => {
      this.hideWinnerPopup();
    });
  }

  hideWinnerPopup() {
    this.winPopup.style.display = "none";
    this.popupElement.style.display = "flex";
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
    this.winnerMessage.textContent = message;
    this.winPopup.style.display = "flex";
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

    // Set draggable status based on hand value
    if (value === 0) {
      document.getElementById(handId).classList.add("non-draggable");
    } else {
      document.getElementById(handId).classList.remove("non-draggable");
    }
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

  handleSplitClick() {
    const moveSplit = this.gameManager.previewSplit;
    if (moveSplit.isValid) {
      this.gameManager.executeMove(moveSplit);
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

      if (sum >= 5 || sum === 0) {
        element.classList.add("non-draggable");
      } else {
        element.classList.remove("non-draggable");
      }
    }
  }

  // Revert all previews to their original states
  revertAllPreviews() {
    this.previewStates.forEach((originalSrc, img) => {
      img.src = originalSrc;
      const handId = img.parentElement.id;
      const value = this.gameManager.getHandValue(handId);
      if (value === 0) {
        img.parentElement.classList.add("non-draggable");
      } else {
        img.parentElement.classList.remove("non-draggable");
      }
    });
    this.clearPreviews();
  }
  // Clear all preview states
  clearPreviews() {
    this.previewStates.clear();
  }
}

class MoveAdd {
  constructor(gameManager, sourceHandId, targetHandId) {
    this.gameManager = gameManager;     
    this.sourceHandId = sourceHandId;   // ID of the hand performing the action
    this.targetHandId = targetHandId;   // ID of the hand receiving the action
  }

  // Check if the move is valid
  isValid() {
    // Parse the player IDs from the hand IDs
    const [sourcePlayerId] = this.gameManager.handManager.parseHandId(
      this.sourceHandId
    );
    const [targetPlayerId] = this.gameManager.handManager.parseHandId(
      this.targetHandId
    );

    // Get the current values of the source and target hands
    const sourceValue = this.gameManager.getHandValue(this.sourceHandId);
    const targetValue = this.gameManager.getHandValue(this.targetHandId);

    // A move is valid if:
    // 1. The source and target belong to different players
    // 2. The source hand has a non-zero value
    // 3. The target hand is not already "dead" (value of 0)
    return (
      sourcePlayerId !== targetPlayerId && sourceValue > 0 && targetValue !== 0
    );
  }

  // Execute the move
  execute() {
    // Get the current values of the source and target hands
    const sourceValue = this.gameManager.getHandValue(this.sourceHandId);
    const targetValue = this.gameManager.getHandValue(this.targetHandId);

    // Calculate the sum of the two hand values
    const sum = sourceValue + targetValue;

    // Set the new value of the target hand
    // If the sum is 5 or greater, the hand "dies" (becomes 0)
    // Otherwise, it takes on the sum value
    this.gameManager.setHandValue(this.targetHandId, sum >= 5 ? 0 : sum);
  }
}

class MoveSplit {
  constructor(gameManager, newLeft, newRight) {
    this.gameManager = gameManager;
    this.newLeft = newLeft;
    this.newRight = newRight;
  }

  // Get the new hand values after the split
  getHands() {
    return [this.newLeft, this.newRight];
  }

  // Check if the split move is valid
  isValid() {
    const validSplits = this.gameManager.getAllValidDistributions();
    return validSplits.some(
      (split) =>
        (split[0] === this.newLeft && split[1] === this.newRight) ||
        (split[0] === this.newRight && split[1] === this.newLeft)
    );
  }

  // Execute the split move
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

  // Get the current state of both players' hands
  getHandStates() {
    const players = this.gameManager.gameState.getStateSnapshot();
    const player1 = players.player1;
    const player2 = players.player2;
    const player1State = [player1.leftHand, player1.rightHand];
    const player2State = [player2.leftHand, player2.rightHand];
    return [player1State, player2State];
  }

  // Animate an add move
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

  // Animate a split move
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

  // Main method to perform a random computer move
  performComputerMove() {
    const players = this.gameManager.gameState.getStateSnapshot();
    // Randomly choose between a split move or an add move
    const random = Math.floor(Math.random() * 2);
    if (random === 0) {
      this.performSplitMove();
    } else {
      this.performAddMove();
    }
  }

  // Perform a random split move
  performSplitMove() {
    // Get all valid split moves
    const validSplits = this.gameManager.getAllValidDistributions();
    
    // If no valid splits are available, perform an add move instead
    if (validSplits.length === 0 && !this.gameManager.checkGameEnd()) {
      this.performAddMove();
      return;
    }
    
    // Choose a random split from the valid splits
    const split = validSplits[Math.floor(Math.random() * validSplits.length)];

    // Create and execute the split move
    const move = new MoveSplit(this.gameManager, split[0], split[1]);
    if (move.isValid() && !this.gameManager.checkGameEnd()) {
      // Animate the split move and then execute it
      this.animateSplitMove(() => {
        this.gameManager.executeMove(move);
      });
    } else if (!this.gameManager.checkGameEnd()) {
      // If the split move is invalid, try an add move instead
      this.performAddMove();
    }
  }

  // Perform a random add move
  performAddMove() {
    // Define the possible hands for the computer and player
    const computerHands = ["topLeft", "topRight"];
    const playerHands = ["bottomLeft", "bottomRight"];
    
    // Choose a random hand for the computer and player
    const computerHand = computerHands[Math.floor(Math.random() * 2)];
    const playerHand = playerHands[Math.floor(Math.random() * 2)];

    // Create and execute the add move
    const move = new MoveAdd(this.gameManager, computerHand, playerHand);
    if (move.isValid() && !this.gameManager.checkGameEnd()) {
      // Animate the add move and then execute it
      this.animateAddMove(computerHand, playerHand, () => {
        this.gameManager.executeMove(move);
      });
    } else if (!this.gameManager.checkGameEnd()) {
      // If the add move is invalid, try again with a different random move
      this.performAddMove();
    }
  }
}

class MixedBot extends computerBot {
  constructor(gameManager) {
    super(gameManager);
    this.randomBot = new randomComputerBot(gameManager);
    this.minimaxBot = new MinimaxBot(gameManager, 4);
  }

  performComputerMove() {
    const random = Math.floor(Math.random() * 10);
    if (random < 4) {
      this.randomBot.performComputerMove();
    } else {
      this.minimaxBot.performComputerMove();
    }
  }
}

class MinimaxBot extends computerBot {
  constructor(gameManager, depth) {
    super(gameManager);
    this.depth = depth; // Maximum depth for the minimax algorithm
  }

  // Main method to perform the computer's move
  performComputerMove() {
    // Get the current game state
    const state = {
      player1: this.gameManager.gameState.getStateSnapshot().player1,
      player2: this.gameManager.gameState.getStateSnapshot().player2,
      isPlayer1Turn: true, // The bot is always player1
    };
    // Find the best move using minimax algorithm
    const bestMove = this.minimax(state, this.depth, true);

    if (!bestMove.move) {
      return;
    }

    // Execute the best move
    if (bestMove.move.type === "add") {
      const sourceHand =
        "top" +
        bestMove.move.from.charAt(0).toUpperCase() +
        bestMove.move.from.slice(1);
      const targetHand =
        "bottom" +
        bestMove.move.to.charAt(0).toUpperCase() +
        bestMove.move.to.slice(1);
      const addMove = new MoveAdd(this.gameManager, sourceHand, targetHand);
      if (addMove.isValid() && !this.gameManager.checkGameEnd()) {
        this.animateAddMove(sourceHand, targetHand, () => {
          this.gameManager.executeMove(addMove);
        });
      }
    } else if (bestMove.move.type === "split") {
      const splitMove = new MoveSplit(
        this.gameManager,
        bestMove.move.left,
        bestMove.move.right
      );
      if (splitMove.isValid() && !this.gameManager.checkGameEnd()) {
        this.animateSplitMove(() => {
          this.gameManager.executeMove(splitMove);
        });
      }
    }
  }

  // Minimax algorithm with alpha-beta pruning
  minimax(
    state,
    depth,
    isMaximizingPlayer,
    alpha = -Infinity,
    beta = Infinity
  ) {
    // Base case: return the evaluation if depth is 0 or game is over
    if (depth === 0 || this.isGameOver(state)) {
      return { score: this.evaluateState(state) };
    }

    const moves = this.getAllPossibleMoves(state);
    let bestMove = null;

    if (isMaximizingPlayer) {
      let maxEval = -Infinity;
      for (const move of moves) {
        const newState = this.applyMove(state, move);
        const evaluation = this.minimax(
          newState,
          depth - 1,
          false,
          alpha,
          beta
        ).score;
        if (evaluation > maxEval) {
          maxEval = evaluation;
          bestMove = move;
        }
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) {
          break; // Beta cutoff
        }
      }
      return { move: bestMove, score: maxEval };
    } else {
      let minEval = Infinity;
      for (const move of moves) {
        const newState = this.applyMove(state, move);
        const evaluation = this.minimax(
          newState,
          depth - 1,
          true,
          alpha,
          beta
        ).score;
        if (evaluation < minEval) {
          minEval = evaluation;
          bestMove = move;
        }
        beta = Math.min(beta, evaluation);
        if (beta <= alpha) {
          break; // Alpha cutoff
        }
      }
      return { move: bestMove, score: minEval };
    }
  }

  // Check if the game is over (one player has no fingers left)
  isGameOver(state) {
    return (
      (state.player1.leftHand === 0 && state.player1.rightHand === 0) ||
      (state.player2.leftHand === 0 && state.player2.rightHand === 0)
    );
  }

  // Evaluate the current state of the game
  evaluateState(state) {
    const { player1, player2, isPlayer1Turn } = state;

    // Check for immediate win or loss
    if (this.isPlayerDefeated(player2)) return 100;
    if (this.isPlayerDefeated(player1)) return -100;

    let score = 0;

    // Evaluate vulnerable states
    score += this.evaluateVulnerableState(player1, player2, isPlayer1Turn);

    // Evaluate winning potential
    score += this.evaluateWinningPotential(player1, player2, isPlayer1Turn);

    return score;
  }

  // Check if a player is defeated (has no fingers left)
  isPlayerDefeated(player) {
    return player.leftHand === 0 && player.rightHand === 0;
  }

  // Get the total number of fingers for a player
  getTotalFingers(player) {
    return player.leftHand + player.rightHand;
  }

  // Check if a player is in a vulnerable state (1 or fewer total fingers)
  isVulnerable(player) {
    return this.getTotalFingers(player) <= 1;
  }

  // Evaluate the state based on player vulnerability
  evaluateVulnerableState(player1, player2, isPlayer1Turn) {
    let score = 0;
    const botVulnerable = this.isVulnerable(player1);
    const opponentVulnerable = this.isVulnerable(player2);

    if (botVulnerable && !opponentVulnerable) {
      score -= 10;
    } else if (opponentVulnerable && !botVulnerable) {
      score += 10;
    }

    // Adjust score based on whose turn it is
    return isPlayer1Turn ? -score : score;
  }

  // Check if a player can win in the next move
  canWinNextMove(attacker, defender) {
    const totalFingers = this.getTotalFingers(attacker);
    return (
      (defender.leftHand === 0 && totalFingers + defender.rightHand > 4) ||
      (defender.rightHand === 0 && totalFingers + defender.leftHand > 4)
    );
  }

  // Evaluate the winning potential of the current state
  evaluateWinningPotential(player1, player2, isPlayer1Turn) {
    if (isPlayer1Turn && this.canWinNextMove(player1, player2)) {
      return 100;
    } else if (!isPlayer1Turn && this.canWinNextMove(player2, player1)) {
      return -100;
    }
    return 0;
  }

  // Generate all possible moves for the current state
  getAllPossibleMoves(state) {
    const moves = [];
    const player = state.isPlayer1Turn ? state.player1 : state.player2;
    const opponent = state.isPlayer1Turn ? state.player2 : state.player1;

    const addedStates = new Set();

    // Helper function to add move if it results in a new state
    const addMoveIfUnique = (move) => {
      const newState = this.applyMove(state, move);
      const stateKey = this.getSymmetricStateKey(newState);
      if (!addedStates.has(stateKey)) {
        moves.push(move);
        addedStates.add(stateKey);
      }
    };

    // Generate add moves
    if (player.leftHand !== 0) {
      if (opponent.leftHand !== 0)
        addMoveIfUnique({ type: "add", from: "left", to: "left" });
      if (opponent.rightHand !== 0)
        addMoveIfUnique({ type: "add", from: "left", to: "right" });
    }
    if (player.rightHand !== 0) {
      if (opponent.leftHand !== 0)
        addMoveIfUnique({ type: "add", from: "right", to: "left" });
      if (opponent.rightHand !== 0)
        addMoveIfUnique({ type: "add", from: "right", to: "right" });
    }

    // Generate split moves
    const totalFingers = player.leftHand + player.rightHand;
    for (let left = 0; left <= Math.floor(totalFingers / 2); left++) {
      const right = totalFingers - left;
      if (
        right >= 0 &&
        right <= 4 &&
        // new unique state that is not symmetrical to original
        left !== player.leftHand &&
        right !== player.rightHand &&
        left !== player.rightHand &&
        right !== player.leftHand
      ) {
        addMoveIfUnique({ type: "split", left, right });
      }
    }

    return moves;
  }

  // Get a unique key for a state, considering symmetry
  getSymmetricStateKey(state) {
    const p1 = this.getSymmetricHandKey(state.player1);
    const p2 = this.getSymmetricHandKey(state.player2);
    return `${p1}|${p2}|${state.isPlayer1Turn}`;
  }

  // Get a unique key for a player's hands, considering symmetry
  getSymmetricHandKey(player) {
    const hands = [player.leftHand, player.rightHand].sort();
    return hands.join(",");
  }

  // Apply a move to the current state and return the new state
  applyMove(state, move) {
    const newState = JSON.parse(JSON.stringify(state));
    const player = newState.isPlayer1Turn ? newState.player1 : newState.player2;
    const opponent = newState.isPlayer1Turn
      ? newState.player2
      : newState.player1;

    if (move.type === "add") {
      const sourceValue = player[move.from + "Hand"];
      const targetValue = opponent[move.to + "Hand"];
      opponent[move.to + "Hand"] =
        sourceValue + targetValue >= 5 ? 0 : sourceValue + targetValue;
    } else if (move.type === "split") {
      player.leftHand = move.left;
      player.rightHand = move.right;
    }

    // Switch turns
    newState.isPlayer1Turn = !newState.isPlayer1Turn;

    return newState;
  }
}
