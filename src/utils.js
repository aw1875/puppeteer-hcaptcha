const { path } = require("ghost-cursor");
const tf = require('@tensorflow/tfjs-node');
const cocoSsd = require('@tensorflow-models/coco-ssd');
const fetch = require('node-fetch');

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
 * @description Tensforflow Image Recognition Function
 * @param {*} imgURL 
 * @returns Predictions array
 */
const tensor = async (imgURL) => {
  try {
    const blob = await fetch(imgURL)
      .then((res) => res.buffer())
      .catch((err) => console.log(err));

    // Load the model.
    const model = await cocoSsd.load();

    // Classify the image.
    const predictions = await model.detect(tf.node.decodeImage(blob))

    return predictions
  } catch {
    return null;
  }
}

/**
 * @description Generate mouse movements
 * @returns Mouse Movements array
 */
const mm = () => {
  const from = { x: 100, y: 100 }
  const to = { x: 600, y: 700 }

  const route = path(from, to);

  const mm = [];
  route.forEach((i) => {
    mm.push([i.x, i.y, i.timestamp]);
  })

  return mm;
}

module.exports = { rdn, tensor, mm };
