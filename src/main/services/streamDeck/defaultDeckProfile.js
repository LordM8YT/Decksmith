function createDefaultDeckProfile() {
  const columns = 5;
  const rows = 3;
  const pixelSize = {
    width: 96,
    height: 96
  };
  const buttons = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;

      buttons.push({
        slotId: `button:${index}`,
        index,
        hidIndex: index,
        row,
        column,
        feedbackType: 'lcd',
        pixelSize
      });
    }
  }

  return {
    id: 'mock:stream-deck-mk2',
    model: 'original-mk2',
    productName: 'Stream Deck MK.2 (Mock Deck)',
    columns,
    rows,
    isMock: true,
    buttons
  };
}

module.exports = {
  createDefaultDeckProfile
};
