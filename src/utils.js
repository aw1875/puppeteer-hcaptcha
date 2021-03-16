// Randomize function
function rdn(start, end) {
  return Math.round(Math.random() * (end - start) + start);
}

// Random true/false function
function randomTrueFalse() {
  return rdn(0, 1) ? "true" : "false";
}

// Generate UUID
function uuid(a) {
  return a
    ? (a ^ ((Math.random() * 16) >> (a / 4))).toString(16)
    : ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, uuid);
}

// Generate random Mouse Movements
function getMouseMovements(timestamp) {
  let lastMovement = timestamp;
  const motionCount = rdn(1000, 10000);
  const mouseMovements = [];
  for (let i = 0; i < motionCount; i++) {
    lastMovement += rdn(0, 10);
    mouseMovements.push([rdn(0, 500), rdn(0, 500), lastMovement]);
  }
  return mouseMovements;
}

module.exports = { rdn, randomTrueFalse, uuid, getMouseMovements };
