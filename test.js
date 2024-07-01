overlapSamePlayer(element, otherElement) { 
    return this.gameManager.handManager.parseHandId(element.id)[0] ===
    this.gameManager.handManager.parseHandId(otherElement.id)[0];
  }


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