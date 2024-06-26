document.addEventListener("DOMContentLoaded", () => {
  const gameManager = new GameManager();
  const uiManager = new UIManager(gameManager);
  const draggableManager = new DraggableManager(gameManager, uiManager);
  gameManager.setManagers(draggableManager, uiManager);
});
class DraggableManager {
  constructor(gameManager, uiManager) {
    this.currentZIndex = 1;
    this.gameManager = gameManager;
    this.uiManager = uiManager;
    this.draggedElement = null;
    this.initializeDraggableElements();
  }

  initializeDraggableElements() {
    const draggableElements = document.querySelectorAll(".draggable");
    draggableElements.forEach((element) => {
      if (!element.classList.contains("non-draggable")) {
        this.makeElementDraggable(element);
      }
    });
  }

  makeElementDraggable(element) {
    element.addEventListener("mousedown", (e) =>
      this.dragMouseDown(e, element)
    );
    element.addEventListener("touchstart", (e) =>
      this.dragMouseDown(e, element)
    );
  }

  dragMouseDown(e, element) {
    e.preventDefault();
    if (!this.gameManager.isCurrentPlayerTurn(element)) {
      return;
    }

    this.draggedElement = element;
    const initialMousePos = e.touches
      ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
      : { x: e.clientX, y: e.clientY };

    const onMouseMove = (e) => this.elementDrag(e, element, initialMousePos);
    const onMouseUp = () =>
      this.closeDragElement(element, onMouseMove, onMouseUp);

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("touchmove", onMouseMove, { passive: false });
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("touchend", onMouseUp, { passive: false });

    this.currentZIndex++;
    element.style.zIndex = this.currentZIndex;
  }

  elementDrag(e, element, initialMousePos) {
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const deltaX = clientX - initialMousePos.x;
    const deltaY = clientY - initialMousePos.y;
    element.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

    this.showOverlapPreview(element);
  }

  closeDragElement(element, onMouseMove, onMouseUp) {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("touchmove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    document.removeEventListener("touchend", onMouseUp);

    const transformValues = element.style.transform.match(
      /translate\(([^px]*)px, ([^px]*)px\)/
    );
    const deltaX = parseInt(transformValues[1], 10);
    const deltaY = parseInt(transformValues[2], 10);

    const changesCommitted = this.commitChangesOnOverlap(element);
    if (changesCommitted) {
      this.uiManager.updatePosition(element, deltaX, deltaY);
      this.uiManager.updateAllImages();
    } else {
      element.style.transform = "none";
    }

    this.draggedElement = null;
  }

  isSameSide(sourceId, targetId) {
    return (
      (sourceId.startsWith("top") && targetId.startsWith("top")) ||
      (sourceId.startsWith("bottom") && targetId.startsWith("bottom"))
    );
  }

  showOverlapPreview(element) {
    const otherElements = document.querySelectorAll(".draggable");
    let isOverlappingAny = false;

    otherElements.forEach((otherElement) => {
      if (
        otherElement !== element &&
        this.uiManager.isOverlapping(element, otherElement)
      ) {
        isOverlappingAny = true;
        const sum = this.gameManager.calculateSum(element.id, otherElement.id);
        this.uiManager.updatePreview(otherElement, sum);
      } else {
        this.uiManager.revertPreview(otherElement);
      }
    });

    if (!isOverlappingAny) {
      this.uiManager.revertAllPreviews();
    }
  }

  commitChangesOnOverlap(element) {
    let changeCommitted = false;
    const otherElements = document.querySelectorAll(".draggable");
    otherElements.forEach((otherElement) => {
      if (
        otherElement !== element &&
        this.uiManager.isOverlapping(element, otherElement)
      ) {
        const currentMove = new MoveAdd(
          element.id,
          otherElement.id,
          this.gameManager.getValueById(element.id),
          this.gameManager.getValueById(otherElement.id)
        );

        if (currentMove.isValid()) {
          currentMove.execute(this.gameManager);
          changeCommitted = true;
          this.uiManager.clearPreviews();
        }
      }
    });
    this.uiManager.updateAllImages();
    return changeCommitted;
  }
}

class GameManager {
  constructor() {
    this.gameState = {
      player1: { left: 1, right: 1 },
      player2: { left: 1, right: 1 },
      currentPlayer: "player2",
      gameFinished: false,
    };
    this.draggableManager = null;
    this.uiManager = null;
  }

  setManagers(draggableManager, uiManager) {
    this.draggableManager = draggableManager;
    this.uiManager = uiManager;
  }

  getValueById(id) {
    switch (id) {
      case "topLeft":
        return this.gameState.player1.left;
      case "topRight":
        return this.gameState.player1.right;
      case "bottomLeft":
        return this.gameState.player2.left;
      case "bottomRight":
        return this.gameState.player2.right;
      default:
        return null;
    }
  }

  updateValueById(id, value) {
    switch (id) {
      case "topLeft":
        this.gameState.player1.left = value;
        break;
      case "topRight":
        this.gameState.player1.right = value;
        break;
      case "bottomLeft":
        this.gameState.player2.left = value;
        break;
      case "bottomRight":
        this.gameState.player2.right = value;
        break;
    }
  }

  resetGame() {
    this.gameState = {
      player1: { left: 1, right: 1 },
      player2: { left: 1, right: 1 },
      currentPlayer: "player2",
      gameFinished: false,
    };
    this.uiManager.resetUI();
  }

  checkGameEnd() {
    if (
      this.gameState.player1.left === 0 &&
      this.gameState.player1.right === 0
    ) {
      this.gameState.gameFinished = true;
      this.uiManager.showPopup("Computer wins!");
    } else if (
      this.gameState.player2.left === 0 &&
      this.gameState.player2.right === 0
    ) {
      this.gameState.gameFinished = true;
      this.uiManager.showPopup("You win!");
    }
  }

  getCurrentPlayer() {
    return this.gameState.currentPlayer;
  }

  getCurrentPlayerHands() {
    return [
      this.gameState[this.gameState.currentPlayer].left,
      this.gameState[this.gameState.currentPlayer].right,
    ];
  }

  setCurrentPlayerHands(left, right) {
    this.gameState[this.gameState.currentPlayer].left = left;
    this.gameState[this.gameState.currentPlayer].right = right;
    this.uiManager.updateAllImages();
    this.switchTurn();
  }

  switchTurn() {
    this.gameState.currentPlayer =
      this.gameState.currentPlayer === "player1" ? "player2" : "player1";
  }

  calculateSum(id1, id2) {
    const value1 = this.getValueById(id1);
    const value2 = this.getValueById(id2);
    return !isNaN(value1) && !isNaN(value2) ? value1 + value2 : null;
  }

  isCurrentPlayerTurn(element) {
    const currentPlayer = this.getCurrentPlayer();
    if (currentPlayer === "player1") {
      return element.id === "topLeft" || element.id === "topRight";
    } else {
      return element.id === "bottomLeft" || element.id === "bottomRight";
    }
  }
}

class UIManager {
  constructor(gameManager) {
    this.gameManager = gameManager;
    this.popupContainer = document.getElementById("popupContainer");
    this.winnerMessage = document.getElementById("winnerMessage");
    this.restartButton = document.getElementById("restartButton");
    this.splitButton = document.getElementById("splitButton");
    this.splitContainer = document.getElementById("splitContainer");
    this.splitCloseButton = document.getElementById("closeSplit");
    this.previewElements = new Map();

    this.restartButton.addEventListener("click", () => {
      this.gameManager.resetGame();
      this.hidePopup();
    });

    this.splitButton.addEventListener("click", () => {
      this.splitContainer.style.display = "flex";
      this.showSplits();
    });

    this.splitCloseButton.addEventListener("click", () => {
      this.splitContainer.style.display = "none";
      this.splitButton.style.display = "flex";
    });
  }

  showSplits() {
    const newMove = new MoveSplit(this.gameManager);
    const validDistributions = newMove.getAllValidDistributions();
    const splitOptions = document.getElementById("splitOptions");
    splitOptions.innerHTML = "";
    for (let i = 0; i < validDistributions.length; i++) {
      const [bag1, bag2] = validDistributions[i];
      const button = document.createElement("button");
      button.innerText = `${bag1} - ${bag2}`;
      button.classList.add("split-option");
      button.addEventListener("click", () => this.handleSplitClick(bag1, bag2));
      splitOptions.appendChild(button);
    }
  }

  handleSplitClick(bag1, bag2) {
    console.log(bag1, bag2);

    //update the current players hands with the new values
    this.gameManager.setCurrentPlayerHands(bag1, bag2);
    this.splitContainer.style.display = "none";

  }

  showPopup(message) {
    this.winnerMessage.textContent = message;
    this.popupContainer.style.display = "flex";
  }

  hidePopup() {
    this.popupContainer.style.display = "none";
  }

  updateAllImages() {
    this.updateElementUI("topLeft");
    this.updateElementUI("topRight");
    this.updateElementUI("bottomLeft");
    this.updateElementUI("bottomRight");
  }

  updateElementUI(id) {
    const element = document.getElementById(id).querySelector("img");
    const value = this.gameManager.getValueById(id);
    this.updateElementImage(element, value);
  }

  updateElementImage(element, value) {
    element.src = `img/${value}.png`;
  }

  resetUI() {
    this.updateAllImages();
    this.resetElementPosition("topLeft");
    this.resetElementPosition("topRight");
    this.resetElementPosition("bottomLeft");
    this.resetElementPosition("bottomRight");
  }

  resetElementPosition(id) {
    const element = document.getElementById(id);
    element.style.left = "";
    element.style.top = "";
    element.style.transform = "none";
  }

  getElementPosition(element) {
    const rect = element.getBoundingClientRect();
    return { x: rect.left + window.scrollX, y: rect.top + window.scrollY };
  }

  updatePosition(element, deltaX, deltaY) {
    element.style.left = `${element.offsetLeft + deltaX}px`;
    element.style.top = `${element.offsetTop + deltaY}px`;
    element.style.transform = "none";
  }

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

  updatePreview(element, sum) {
    if (sum !== null) {
      const elementImg = element.querySelector("img");
      if (!this.previewElements.has(elementImg)) {
        this.previewElements.set(elementImg, elementImg.src);
      }
      elementImg.src = `img/${sum >= 5 ? 0 : sum}.png`;
    }
  }

  revertPreview(element) {
    const elementImg = element.querySelector("img");
    if (this.previewElements.has(elementImg)) {
      elementImg.src = this.previewElements.get(elementImg);
      this.previewElements.delete(elementImg);
    }
  }

  revertAllPreviews() {
    this.previewElements.forEach((originalSrc, img) => {
      img.src = originalSrc;
    });
    this.clearPreviews();
  }

  clearPreviews() {
    this.previewElements.clear();
  }
}

class MoveAdd {
  constructor(sourceId, targetId, sourceValue, targetValue) {
    this.sourceId = sourceId;
    this.targetId = targetId;
    this.sourceValue = sourceValue;
    this.targetValue = targetValue;
  }

  isValid() {
    // Check if source and target IDs belong to different players
    const isDifferentPlayers =
      (this.sourceId.startsWith("top") && this.targetId.startsWith("bottom")) ||
      (this.sourceId.startsWith("bottom") && this.targetId.startsWith("top"));

    // Check if source value is greater than 0 and target value is not 0
    const isValidMove =
      isDifferentPlayers && this.sourceValue > 0 && this.targetValue !== 0;

    return isValidMove;
  }

  execute(gameManager) {
    const sum = this.sourceValue + this.targetValue;
    gameManager.updateValueById(this.targetId, sum >= 5 ? 0 : sum);
    gameManager.switchTurn();
    gameManager.checkGameEnd();
  }
}

class MoveSplit {
  constructor(gameManager) {
    this.gameManager = gameManager;
    this.sourceValue = this.gameManager.getCurrentPlayerHands()[0];
    this.targetValue = this.gameManager.getCurrentPlayerHands()[1];

  }



  getAllValidDistributions() {
    const validDistributions = [];
    const totalValue = this.sourceValue + this.targetValue;

    for (let bag1 = 0; bag1 <= 4; bag1++) {
      for (let bag2 = 0; bag2 <= 4; bag2++) {
        if (bag1 + bag2 === totalValue) {
          validDistributions.push([bag1, bag2]);
        }
      }
    }

    const filteredPairs = this.filterPairs(validDistributions);

    return filteredPairs;
  }

  filterPairs(pairs) {
    const seen = new Set();
    const result = [];

    pairs.forEach((pair) => {
      // Sort the pair to ensure [a, b] and [b, a] are treated the same
      const sortedPair = pair.slice().sort();
      const pairString = JSON.stringify(sortedPair);

      if (!seen.has(pairString) && this.checkNewPair(pair)) {
        seen.add(pairString);
        result.push(pair);
      }
    });

    return result;
  }

  checkNewPair(pair) {
    const [val1, val2] = pair;
    const sourceValue = this.sourceValue;
    const targetValue = this.targetValue;
    console.log(val1, val2, sourceValue, targetValue);

    if ((val1 == sourceValue && val2 == targetValue) || (val1 == targetValue && val2 == sourceValue)) {
      return false;
    }
    return true;
  }
  

  execute(gameManager) {}
}
