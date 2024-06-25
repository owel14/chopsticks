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

        // Check if the element belongs to the current player
        if (!this.isCurrentPlayerTurn(element)) {
            return; // Do nothing if it's not the current player's turn
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
                const sum = this.calculateSum(element.id, otherElement.id);
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
                const sum = this.calculateSum(element.id, otherElement.id);
                if (sum !== null) {
                    this.gameManager.updateValueById(otherElement.id, sum >= 5 ? 0 : sum);
                    this.updateUI();
                    changeCommitted = true;
                    // Remove the element from the previewElements map since the change is committed
                    const otherElementImg = otherElement.querySelector('img');
                    if (this.previewElements.has(otherElementImg)) {
                        this.previewElements.delete(otherElementImg);
                    }
                    this.gameManager.checkGameEnd();
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
        // Reset the UI to the default state
        this.updateUI(); // Ensure the UI matches the game state after resetting
        this.resetElementPosition('topLeft');
        this.resetElementPosition('topRight');
        this.resetElementPosition('bottomLeft');
        this.resetElementPosition('bottomRight');
    }

    resetElementPosition(id) {
        const element = document.getElementById(id);
        element.style.left = '';
        element.style.top = '';
        element.style.transform = 'none';
    }

    isOverlapping(el1, el2) {
        // Check if two elements are overlapping
        const rect1 = el1.getBoundingClientRect();
        const rect2 = el2.getBoundingClientRect();
        return !(rect1.right < rect2.left ||
                 rect1.left > rect2.right ||
                 rect1.bottom < rect2.top ||
                 rect1.top > rect2.bottom);
    }

    isCurrentPlayerTurn(element) {
        const currentPlayer = this.gameManager.getCurrentPlayer();
        if (currentPlayer === 'player1') {
            return element.id === 'topLeft' || element.id === 'topRight';
        } else {
            return element.id === 'bottomLeft' || element.id === 'bottomRight';
        }
    }
}

class GameManager {
    constructor() {
        this.gameState = {
            player1: { left: 1, right: 1 },
            player2: { left: 1, right: 1 },
            currentPlayer: 'player1',
            gameFinished: false
        };
        this.draggableManager = null;
    }

    setDraggableManager(draggableManager) {
        this.draggableManager = draggableManager;
    }

    getValueById(id) {
        switch(id) {
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
        switch(id) {
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
            currentPlayer: 'player1',
            gameFinished: false
        };
        this.draggableManager.resetUI();
    }

    checkGameEnd() {
        // Check if the game has ended based on the game state
        if (this.gameState.player1.left === 0 && this.gameState.player1.right === 0) {
            this.gameState.gameFinished = true;
            alert('Player 2 wins!');
        } else if (this.gameState.player2.left === 0 && this.gameState.player2.right === 0) {
            this.gameState.gameFinished = true;
            alert('Player 1 wins!');
        }

        if(this.gameState.gameFinished) {
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
