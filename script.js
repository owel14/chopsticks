document.addEventListener('DOMContentLoaded', () => {
    const gameManager = new GameManager();
    const draggableManager = new DraggableManager(gameManager);
    gameManager.setDraggableManager(draggableManager); // Set the draggable manager in game manager for resetting UI
});

class DraggableManager {
    constructor(gameManager) {
        this.currentZIndex = 1; // Initialize current highest z-index
        this.previewElements = new Map(); // To track elements being previewed
        this.gameManager = gameManager; // Assign game manager
        this.initializeDraggableElements(); // Initialize draggable elements on page load
    }

    initializeDraggableElements() {
        // Select all elements with class 'draggable' and make them draggable unless they are non-draggable
        const draggableElements = document.querySelectorAll('.draggable');
        draggableElements.forEach(element => {
            if (!element.classList.contains('non-draggable')) {
                this.makeElementDraggable(element);
            }
        });
    }

    makeElementDraggable(element) {
        // Attach mousedown and touchstart event listeners to make element draggable
        element.addEventListener('mousedown', (e) => this.dragMouseDown(e, element));
        element.addEventListener('touchstart', (e) => this.dragMouseDown(e, element));
    }

    dragMouseDown(e, element) {
        e.preventDefault();

        // Check if the element belongs to the current player and has a value greater than 0
        if (!this.isCurrentPlayerTurn(element) || this.gameManager.getValueById(element.id) === 0) {
            return; // Do nothing if it's not the current player's turn or the value is 0
        }

        // Use touch or mouse coordinates
        const initialMousePos = e.touches ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };
        const initialElementPos = this.getElementPosition(element);

        // Define mousemove/touchmove and mouseup/touchend event listeners
        const onMouseMove = (e) => this.elementDrag(e, element, initialMousePos, initialElementPos);
        const onMouseUp = () => this.closeDragElement(element, onMouseMove, onMouseUp);

        // Attach event listeners for dragging and releasing the element
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('touchmove', onMouseMove, { passive: false });
        document.addEventListener('mouseup', onMouseUp);
        document.addEventListener('touchend', onMouseUp, { passive: false });

        // Increase z-index to ensure this element is on top
        this.currentZIndex++;
        element.style.zIndex = this.currentZIndex;
    }

    elementDrag(e, element, initialMousePos, initialElementPos) {
        e.preventDefault();

        // Use touch or mouse coordinates
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        // Calculate the new position based on mouse/touch movement
        const deltaX = clientX - initialMousePos.x;
        const deltaY = clientY - initialMousePos.y;

        // Update the element's transform property to move it
        element.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

        // Show overlap preview if the element is overlapping another
        this.showOverlapPreview(element);
    }

    closeDragElement(element, onMouseMove, onMouseUp) {
        // Remove event listeners
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('touchmove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.removeEventListener('touchend', onMouseUp);

        // Calculate the final position based on the transform values
        const transformValues = element.style.transform.match(/translate\(([^px]*)px, ([^px]*)px\)/);
        const deltaX = parseInt(transformValues[1], 10);
        const deltaY = parseInt(transformValues[2], 10);

        // Apply final position and reset transform
        element.style.left = `${element.offsetLeft + deltaX}px`;
        element.style.top = `${element.offsetTop + deltaY}px`;

        // Commit changes based on overlap
        const changesCommitted = this.commitChangesOnOverlap(element);
        if (changesCommitted) {
            this.updatePosition(element, deltaX, deltaY);
        } else {
            // Reset transform if no changes were committed
            element.style.transform = 'none';
        }
    }

    updatePosition(element, deltaX, deltaY) {
        // Update the position of the element after committing changes
        element.style.left = `${element.offsetLeft + deltaX}px`;
        element.style.top = `${element.offsetTop + deltaY}px`;
        element.style.transform = 'none';
    }

    getElementPosition(element) {
        // Get the current position of the element
        const rect = element.getBoundingClientRect();
        return { x: rect.left + window.scrollX, y: rect.top + window.scrollY };
    }

    showOverlapPreview(element) {
        // Check for overlap and show preview
        const otherElements = document.querySelectorAll('.draggable');
        let isOverlappingAny = false;

        otherElements.forEach(otherElement => {
            if (otherElement !== element && this.isOverlapping(element, otherElement)) {
                isOverlappingAny = true;
                let sum;

                if (this.isSamePlayer(element, otherElement)) {
                    sum = this.calculateSplitSum(element.id, otherElement.id);
                } else {
                    sum = this.calculateSum(element.id, otherElement.id);
                }
                this.updatePreview(otherElement, sum);
            }
        });

        if (!isOverlappingAny) {
            this.revertPreview();
        }
    }

    calculateSum(id1, id2) {
        // Calculate the sum of values based on the game state
        const value1 = this.gameManager.getValueById(id1);
        const value2 = this.gameManager.getValueById(id2);
        return (!isNaN(value1) && !isNaN(value2)) ? value1 + value2 : null;
    }

    calculateSplitSum(id1, id2) {
        // Calculate the split sum for same player's hands
        const value1 = this.gameManager.getValueById(id1);
        const value2 = this.gameManager.getValueById(id2);
        return (!isNaN(value1) && value1 > 0) ? value2 + 1 : null;
    }

    updatePreview(element, sum) {
        // Update preview image based on sum
        if (sum !== null) {
            const elementImg = element.querySelector('img');
            const originalSrc = elementImg.src;
            elementImg.src = `img/${sum >= 5 ? 0 : sum}.png`;
            if (!this.previewElements.has(elementImg)) {
                this.previewElements.set(elementImg, { src: originalSrc });
            }
        }
    }

    revertPreview() {
        // Revert all preview images to their original state
        this.previewElements.forEach((value, key) => {
            key.src = value.src;
        });
        this.previewElements.clear();
    }

    commitChangesOnOverlap(element) {
        // Commit changes if elements are overlapping
        let changeCommitted = false;
        const otherElements = document.querySelectorAll('.draggable');
        otherElements.forEach(otherElement => {
            if (otherElement !== element && this.isOverlapping(element, otherElement)) {
                const draggedValue = this.gameManager.getValueById(element.id);
                const targetValue = this.gameManager.getValueById(otherElement.id);

                if (this.isSamePlayer(element, otherElement) && draggedValue > 0) {
                    // Decrement dragged element value and increment target element value
                    this.gameManager.updateValueById(element.id, draggedValue - 1);
                    this.gameManager.updateValueById(otherElement.id, targetValue + 1);

                    this.updateUI();
                    changeCommitted = true;
                    this.gameManager.checkGameEnd();
                } else if (this.isDifferentPlayer(element, otherElement) && draggedValue > 0) {
                    // Apply the original sum logic for different player hands
                    const sum = draggedValue + targetValue;
                    this.gameManager.updateValueById(otherElement.id, sum >= 5 ? 0 : sum);
                    this.updateUI();
                    changeCommitted = true;
                    this.gameManager.checkGameEnd();
                }

                // Remove the element from the previewElements map since the change is committed
                const otherElementImg = otherElement.querySelector('img');
                if (this.previewElements.has(otherElementImg)) {
                    this.previewElements.delete(otherElementImg);
                }
            }
        });
        if (changeCommitted) {
            this.gameManager.switchTurn();
        }
        return changeCommitted;
    }

    updateUI() {
        // Update the UI based on the game state
        this.updateElementUI('topLeft');
        this.updateElementUI('topRight');
        this.updateElementUI('bottomLeft');
        this.updateElementUI('bottomRight');
    }

    updateElementUI(id) {
        const element = document.getElementById(id).querySelector('img');
        const value = this.gameManager.getValueById(id);
        element.alt = value;
        element.src = `img/${value}.png`;
    }

    resetUI() {
        // Reset the UI to the initial state
        this.updateUI();
        this.previewElements.clear();
        this.initializeDraggableElements();
    }

    isOverlapping(element1, element2) {
        // Check if two elements are overlapping
        const rect1 = element1.getBoundingClientRect();
        const rect2 = element2.getBoundingClientRect();
        return !(rect1.right < rect2.left ||
            rect1.left > rect2.right ||
            rect1.bottom < rect2.top ||
            rect1.top > rect2.bottom);
    }

    isCurrentPlayerTurn(element) {
        // Check if it's the current player's turn for the given element
        if (this.gameManager.getCurrentPlayer() === 'player1') {
            return element.id === 'topLeft' || element.id === 'topRight';
        } else {
            return element.id === 'bottomLeft' || element.id === 'bottomRight';
        }
    }

    isSamePlayer(element1, element2) {
        // Check if two elements belong to the same player
        const player1Ids = ['topLeft', 'topRight'];
        const player2Ids = ['bottomLeft', 'bottomRight'];
        return (player1Ids.includes(element1.id) && player1Ids.includes(element2.id)) ||
            (player2Ids.includes(element1.id) && player2Ids.includes(element2.id));
    }

    isDifferentPlayer(element1, element2) {
        // Check if two elements belong to different players
        const player1Ids = ['topLeft', 'topRight'];
        const player2Ids = ['bottomLeft', 'bottomRight'];
        return (player1Ids.includes(element1.id) && player2Ids.includes(element2.id)) ||
            (player2Ids.includes(element1.id) && player1Ids.includes(element2.id));
    }
}

class GameManager {
    constructor() {
        this.gameState = {
            player1: { left: 1, right: 1 },
            player2: { left: 1, right: 1 },
            currentPlayer: 'player2',
            gameFinished: false
        };
        this.draggableManager = null;
        this.popupContainer = document.getElementById('popupContainer');
        this.winnerMessage = document.getElementById('winnerMessage');
        this.restartButton = document.getElementById('restartButton');
        
        this.restartButton.addEventListener('click', () => {
            this.resetGame();
            this.hidePopup();
        });
    }

    showPopup(message) {
        this.winnerMessage.textContent = message;
        this.popupContainer.style.display = 'flex';
    }

    hidePopup() {
        this.popupContainer.style.display = 'none';
    }

    setDraggableManager(draggableManager) {
        this.draggableManager = draggableManager;
    }

    getValueById(id) {
        switch (id) {
            case 'topLeft':
                return this.gameState.player1.left;
            case 'topRight':
                return this.gameState.player1.right;
            case 'bottomLeft':
                return this.gameState.player2.left;
            case 'bottomRight':
                return this.gameState.player2.right;
            default:
                return null;
        }
    }

    updateValueById(id, value) {
        switch (id) {
            case 'topLeft':
                this.gameState.player1.left = value;
                break;
            case 'topRight':
                this.gameState.player1.right = value;
                break;
            case 'bottomLeft':
                this.gameState.player2.left = value;
                break;
            case 'bottomRight':
                this.gameState.player2.right = value;
                break;
            default:
                break;
        }
    }

    resetGame() {
        // Reset the game state and UI
        this.gameState = {
            player1: { left: 1, right: 1 },
            player2: { left: 1, right: 1 },
            currentPlayer: 'player2',
            gameFinished: false
        };
        this.draggableManager.resetUI();
    }

    checkGameEnd() {
        // Check if the game has ended based on the game state
        if (this.gameState.player1.left === 0 && this.gameState.player1.right === 0) {
            this.gameState.gameFinished = true;
            this.showPopup('Computer wins!');
        } else if (this.gameState.player2.left === 0 && this.gameState.player2.right === 0) {
            this.gameState.gameFinished = true;
            this.showPopup('Player wins!');
        }

        if (this.gameState.gameFinished) {
            this.resetGame();
        }
    }

    getCurrentPlayer() {
        return this.gameState.currentPlayer;
    }

    switchTurn() {
        this.gameState.currentPlayer = this.gameState.currentPlayer === 'player1' ? 'player2' : 'player1';
    }
}
