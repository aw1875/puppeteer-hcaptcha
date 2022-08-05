import { path } from '@aw1875/ghost-cursor'
import tf, { Tensor3D } from '@tensorflow/tfjs-node'
import cocossd from '@tensorflow-models/coco-ssd'
import Jimp from 'jimp';

namespace Utils {
    export const random = (start: number, end: number): number => {
        return Math.round(Math.random() * (end - start) + start);
    }

    export const tensor = async (uri: string): Promise<any> => {
        try {
            // // Get image blob
            // const blob = await axios.get(uri, { responseType: 'arraybuffer' })
            //     .then((res) => res.data)
            //     .catch((err) => { throw err; })

            // // Load model
            // const model = await cocossd.load();

            // // Classify image
            // const predictions = await model.detect(tf.node.decodeImage(blob) as Tensor3D, 50, 0.6)
            const buffer = await Jimp.read(uri).then(async (image) => image.getBufferAsync(Jimp.MIME_JPEG))
            const model = await cocossd.load();
            // const tensor = tf.tidy(() => {
            //     return tf.expandDims(tf.node.decodeJpeg(new Uint8Array(buffer), 3))
            // });
            const tensor = tf.node.decodeJpeg(new Uint8Array(buffer), 3)
            const predictions = await model.detect(tensor);
            // const predictions = await model.detect(tf.node.decodeJpeg(buffer), 20, 0.6)

            return predictions;
        } catch (err) {
            console.error(err);
            return null;
        }
    }

    export const isValid = (response: any, request: any): boolean => {
        return response.class.toUpperCase() === request.toUpperCase();
        // if (response.class.toUpperCase() === request.toUpperCase() && response.score > 0.5)
        //     return true;
        // else
        //     return false;
    }

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
