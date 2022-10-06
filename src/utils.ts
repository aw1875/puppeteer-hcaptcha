import { path } from '@aw1875/ghost-cursor'
import tf from '@tensorflow/tfjs-node'
import cocossd from '@tensorflow-models/coco-ssd'
import Jimp from 'jimp';

namespace Utils {

    /**
     * @description Generate random number between two given numbers
     * @param {number} start Start Number
     * @param {number} end Ending Number
     * @returns {number} Randomly generated number
     */
    export const random = (start: number, end: number): number => {
        return Math.round(Math.random() * (end - start) + start);
    }

    /**
     * @description Classify image into predictions
     * @param {string} uri Image uri
     * @returns {Promise<any>} Predictions or null
     */
    export const tensor = async (uri: string): Promise<any> => {
        try {
            const buffer = await Jimp.read(uri).then(async (image) => image.getBufferAsync(Jimp.MIME_JPEG))
            const model = await cocossd.load();
            const tensor = tf.node.decodeJpeg(new Uint8Array(buffer), 3)
            const predictions = await model.detect(tensor);
            return predictions;
        } catch (err) {
            console.error(err);
            return null;
        }
    }

    /**
     * @description Helper function to decide if response is valid based on request
     * @param {any} response Response
     * @param {any} request Request
     * @returns {boolean} True if valid, false otherwise
     */
    export const isValid = (response: any, request: any): boolean => {
        return response.class.toUpperCase() === request.toUpperCase();
    }

    /**
     * @description Helper function to generate random mouse movements for request
     * @returns {any} Array of mouse movements ([x path, y path, timestamp])
     */
    export const mm = (): any => {
        const route = path({
            x: 100, y: 100,
        }, {
            x: 600, y: 700
        })

        const mm: any[] = [];
        route.forEach(({ x, y, timestamp }) => {
            mm.push([x, y, timestamp]);
        })

        return mm;
    }
}

export default Utils;
