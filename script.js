// script.js
document.addEventListener('DOMContentLoaded', () => {
    new DraggableManager();
});

class DraggableManager {
    constructor() {
        this.currentZIndex = 1; // Initialize current highest z-index
        this.previewElements = new Map(); // To track elements being previewed
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

        // Use touch or mouse coordinates
        const initialMousePos = e.touches ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };
        const initialElementPos = this.getElementPosition(element);

        // Define mousemove/touchmove and mouseup/touchend event listeners
        const onMouseMove = (e) => this.elementDrag(e, element, initialMousePos, initialElementPos);
        const onMouseUp = () => this.closeDragElement(element, onMouseMove, onMouseUp);

        // Attach event listeners for dragging and releasing the element
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('touchmove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        document.addEventListener('touchend', onMouseUp);

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
                const elementImg = element.querySelector('img');
                const otherElementImg = otherElement.querySelector('img');
                const sum = this.calculateSum(elementImg.alt, otherElementImg.alt);
                this.updatePreview(otherElementImg, sum);
            }
        });

        if (!isOverlappingAny) {
            this.revertPreview();
        }
    }

    calculateSum(alt1, alt2) {
        // Calculate the sum of alt attributes (assumes numeric values)
        const value1 = parseInt(alt1, 10);
        const value2 = parseInt(alt2, 10);
        return (!isNaN(value1) && !isNaN(value2)) ? value1 + value2 : null;
    }

    updatePreview(elementImg, sum) {
        // Update preview image based on sum
        if (sum !== null) {
            const originalSrc = elementImg.src;
            const originalAlt = elementImg.alt;
            elementImg.src = `img/${sum >= 5 ? 0 : sum}.png`;
            if (!this.previewElements.has(elementImg)) {
                this.previewElements.set(elementImg, { src: originalSrc, alt: originalAlt });
            }
        }
    }

    revertPreview() {
        // Revert all preview images to their original state
        this.previewElements.forEach((value, key) => {
            key.src = value.src;
            key.alt = value.alt;
        });
        this.previewElements.clear();
    }

    commitChangesOnOverlap(element) {
        // Commit changes if elements are overlapping
        let changeCommitted = false;
        const otherElements = document.querySelectorAll('.draggable');
        otherElements.forEach(otherElement => {
            if (otherElement !== element && this.isOverlapping(element, otherElement)) {
                const elementImg = element.querySelector('img');
                const otherElementImg = otherElement.querySelector('img');
                const sum = this.calculateSum(elementImg.alt, otherElementImg.alt);
                if (sum !== null) {
                    otherElementImg.src = `img/${sum >= 5 ? 0 : sum}.png`;
                    otherElementImg.alt = sum >= 5 ? '0' : sum.toString();
                    changeCommitted = true;
                    // Remove the element from the previewElements map since the change is committed
                    if (this.previewElements.has(otherElementImg)) {
                        this.previewElements.delete(otherElementImg);
                    }
                }
            }
        });
        return changeCommitted;
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
}
