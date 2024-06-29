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

  getStateSnapshot() {
    return JSON.parse(JSON.stringify(this.players));
  }

  switchStartingPlayer() {
    this.startingPlayer =
      this.startingPlayer === "player1" ? "player2" : "player1";
  }

  getHandValue(playerId, hand) {
    return this.players[playerId][hand];
  }

  setHandValue(playerId, hand, value) {
    this.players[playerId][hand] = value;
  }

  switchTurn() {
    this.currentPlayer =
      this.currentPlayer === "player1" ? "player2" : "player1";
  }

  reset() {
    this.players.player1 = { leftHand: 1, rightHand: 1 };
    this.players.player2 = { leftHand: 1, rightHand: 1 };
    this.currentPlayer = this.startingPlayer;
    this.isGameOver = false;
  }

  isPlayerDefeated(playerId) {
    return (
      this.getHandValue(playerId, "leftHand") === 0 &&
      this.getHandValue(playerId, "rightHand") === 0
    );
  }

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

  getHandValue(handId) {
    const [playerId, hand] = this.parseHandId(handId);
    return this.gameState.getHandValue(playerId, hand);
  }

  setHandValue(handId, value) {
    const [playerId, hand] = this.parseHandId(handId);
    this.gameState.setHandValue(playerId, hand, value);
  }

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

  calculateSum(handId1, handId2) {
    const value1 = this.getHandValue(handId1);
    const value2 = this.getHandValue(handId2);
    return value1 + value2;
  }

  getAllValidDistributions() {
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

  setBot(botType) {
    switch (botType) {
      case "easy":
        this.currentBot = new randomComputerBot(this.gameManager);
        break;
      case "hard":
        this.currentBot = new basicBot(this.gameManager);
        break;
      default:
        this.currentBot = new randomComputerBot(this.gameManager);
    }
  }

  runComputerBot() {
    if (
      this.gameManager.gameState.getCurrentPlayer() === "player1" &&
      this.currentBot
    ) {
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
  }

  setUIManager(uiManager) {
    this.uiManager = uiManager;
  }

  setBotType(botType) {
    this.botManager.setBot(botType);
  }

  setDraggableManager(draggableManager) {
    this.draggableManager = draggableManager;
  }

  initializeGame() {
    if (this.uiManager) {
      this.uiManager.updateAllHands();
      this.gameState.reset();
      this.botManager.setBot();
    }
  }

  getHandValue(handId) {
    return this.handManager.getHandValue(handId);
  }

  setHandValue(handId, value) {
    this.handManager.setHandValue(handId, value);
    const handElement = document.getElementById(handId);
    if (value === 0) {
      handElement.classList.add("non-draggable");
    } else {
      handElement.classList.remove("non-draggable");
    }
  }

  isCurrentPlayerTurn(handId) {
    const [playerId] = this.handManager.parseHandId(handId);
    return playerId === this.gameState.currentPlayer;
  }

  checkGameEnd() {
    const winner = this.gameState.checkGameEnd();
    if (winner) {
      const winnerText = winner === "player1" ? "Computer" : "You";
      this.uiManager.showGameOverPopup(`${winnerText} win!`);
      return true;
    }
    return false;
  }

  resetGame() {
    this.gameState.switchStartingPlayer();
    this.gameState.reset();
    this.uiManager.resetUI();

    if (this.computerMoveTimeout) {
      clearTimeout(this.computerMoveTimeout);
    }

    if (this.gameState.getCurrentPlayer() === "player1") {
      this.botManager.runComputerBot();
    }
  }

  switchTurn() {
    this.gameState.switchTurn();
    this.uiManager.updateTurnIndicator();
  }

  calculateSum(handId1, handId2) {
    return this.handManager.calculateSum(handId1, handId2);
  }

  getAllValidDistributions() {
    return this.handManager.getAllValidDistributions();
  }

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
        this.gameManager.handManager.parseHandId(element.id)[0] !==
          this.gameManager.handManager.parseHandId(otherElement.id)[0]
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

class UIManager {
  constructor(gameManager) {
    this.gameManager = gameManager;
    this.popupElement = document.getElementById("popupContainer");
    this.messageElement = document.getElementById("winnerMessage");
    this.restartButton = document.getElementById("restartButton");
    this.splitButton = document.getElementById("splitButton");
    this.splitContainer = document.getElementById("splitContainer");
    this.splitCloseButton = document.getElementById("closeSplit");
    this.dropDown = document.getElementById("botType");
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

    this.dropDown.addEventListener("change", (e) => {
      this.gameManager.setBotType(e.target.value);
    });
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

  isValid() {
    const [sourcePlayerId] = this.gameManager.handManager.parseHandId(
      this.sourceHandId
    );
    const [targetPlayerId] = this.gameManager.handManager.parseHandId(
      this.targetHandId
    );
    const sourceValue = this.gameManager.getHandValue(this.sourceHandId);
    const targetValue = this.gameManager.getHandValue(this.targetHandId);

    return (
      sourcePlayerId !== targetPlayerId && sourceValue > 0 && targetValue !== 0
    );
  }

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

  isValid() {
    const validSplits = this.gameManager.getAllValidDistributions();
    return validSplits.some(
      (split) =>
        (split[0] === this.newLeft && split[1] === this.newRight) ||
        (split[0] === this.newRight && split[1] === this.newLeft)
    );
  }

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

  getHandStates(){
    const players = this.gameManager.gameState.getStateSnapshot();
    const player1 = players.player1;
    const player2 = players.player2;
    const player1State = [player1.leftHand, player1.rightHand];
    const player2State = [player2.leftHand, player2.rightHand];
    return [player1State, player2State];
  }  

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

  performComputerMove() {
    const players = this.gameManager.gameState.getStateSnapshot();
    console.log(players)
    const random = Math.floor(Math.random() * 2);
    if (random === 0) {
      this.performSplitMove();
    } else {
      this.performAddMove();
    }
  }

  performSplitMove() {
    const validSplits = this.gameManager.getAllValidDistributions();
    if (validSplits.length === 0 && !this.gameManager.checkGameEnd()) {
      this.performAddMove();
      return;
    }
    const split = validSplits[Math.floor(Math.random() * validSplits.length)];

    const move = new MoveSplit(this.gameManager, split[0], split[1]);
    if (
      move.isValid() &&
      !this.gameManager.checkGameEnd() 
    ) {
      this.animateSplitMove(() => {
        this.gameManager.executeMove(move);
      });
    } else if (
      !this.gameManager.checkGameEnd() 
    ) {
      this.performAddMove();
    }
  }

  performAddMove() {
    const computerHands = ["topLeft", "topRight"];
    const playerHands = ["bottomLeft", "bottomRight"];
    const computerHand = computerHands[Math.floor(Math.random() * 2)];
    const playerHand = playerHands[Math.floor(Math.random() * 2)];

    const move = new MoveAdd(this.gameManager, computerHand, playerHand);
    if (
      move.isValid() &&
      !this.gameManager.checkGameEnd() 
    ) {
      this.animateAddMove(computerHand, playerHand, () => {
        this.gameManager.executeMove(move);
      });
    } else if (
      !this.gameManager.checkGameEnd() 
    ) {
      this.performAddMove();
    }
  }
}

class basicBot extends computerBot {
  constructor(gameManager) {
      super(gameManager);
      this.pyodideReady = this.initializePyodide();
  }

  async initializePyodide() {
      this.pyodide = await loadPyodide();
      const response = await fetch('ai_move.py');
      const pythonCode = await response.text();
      await this.pyodide.runPythonAsync(pythonCode);
  }

  async performComputerMove() {
      await this.pyodideReady;  
      const playerStates = this.gameManager.gameState.getStateSnapshot();
      
      try {
          const move = this.pyodide.runPython(`
              import json
              player_states = json.loads('${JSON.stringify(playerStates)}')
              calculate_move(player_states)
          `).toJs();

          const [moveType, hand1, hand2] = move;

          if (moveType === 'add') {
            const sourceHand = 'top' + hand1.charAt(0).toUpperCase() + hand1.slice(1);
            const targetHand = 'bottom' + hand2.charAt(0).toUpperCase() + hand2.slice(1);
            console.log(sourceHand, targetHand)
              const addMove = new MoveAdd(this.gameManager, sourceHand, targetHand);
              if (addMove.isValid() && !this.gameManager.checkGameEnd()) {
                  this.animateAddMove(sourceHand, targetHand, () => {
                      this.gameManager.executeMove(addMove);
                  });
              }
          } else if (moveType === 'split') {
              // Assuming 'source' represents the new left value and 'target' the new right value
              const splitMove = new MoveSplit(this.gameManager, hand1, hand2);
              if (splitMove.isValid() && !this.gameManager.checkGameEnd()) {
                  this.animateSplitMove(() => {
                      this.gameManager.executeMove(splitMove);
                  });
              }
          }
      } catch (error) {
          console.error('Error executing Python code:', error);
      }
  }
}