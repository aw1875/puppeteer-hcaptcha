const { path } = require("ghost-cursor");

/**
 * @description Randomize Function
 * @param {*} start
 * @param {*} end
 * @returns Random int between start and end time
 */
function rdn(start, end) {
    return Math.round(Math.random() * (end - start) + start);
}

/**
 * @description Generate mouse movements
 * @returns Mouse Movements array
 */
const mm = () => {
    const from = { x: 100, y: 100 };
    const to = { x: 600, y: 700 };

    const route = path(from, to);

    const mm = [];
    route.forEach((i) => {
        mm.push([i.x, i.y, i.timestamp]);
    });

    return mm;
};

module.exports = { rdn, tensor, mm };
