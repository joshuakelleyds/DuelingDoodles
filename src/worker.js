import constants from "./constants";
import { pipeline, env, RawImage } from "@xenova/transformers";

// Disable local models
env.allowLocalModels = false;

// Define model factories
// Ensures only one model is created of each type
class Singleton {
    static task = null;
    static model = null;
    static quantized = null;
    static instance = null;

    constructor(tokenizer, model, quantized) {
        this.tokenizer = tokenizer;
        this.model = model;
        this.quantized = quantized;
    }

    static async getInstance(progress_callback = null) {
        if (this.instance === null) {
            this.instance = pipeline(this.task, this.model, {
                quantized: this.quantized,
                progress_callback,
            });
        }
        return this.instance;
    }
}

self.addEventListener("message", async (event) => {
    const message = event.data;

    if (message.action === 'load') {
        // Load the image classification model when the 'load' action is received
        await ImageClassificationPipelineSingleton.getInstance();
        self.postMessage({ status: "ready" });
        return;
    }

    // Convert RGBA image to grayscale based on the alpha channel
    const data = new Uint8ClampedArray(message.image.data.length / 4);
    for (let i = 0; i < data.length; ++i) {
        data[i] = message.image.data[i * 4 + 3];
    }

    // Create a RawImage object from the grayscale data
    const img = new RawImage(data, message.image.width, message.image.height, 1);

    // Classify the image
    let result = await classify(img);
    if (result === null) return;

    // Send the classification result back to the main thread
    self.postMessage({
        status: "result",
        task: "image-classification",
        data: result,
    });
});

class ImageClassificationPipelineSingleton extends Singleton {
    static task = "image-classification";
    static model = `Xenova/${constants.DEFAULT_MODEL}`;
    static quantized = constants.DEFAULT_QUANTIZED;
}

const classify = async (image) => {
    // Get an instance of the image classification model
    let classifier = await ImageClassificationPipelineSingleton.getInstance();

    // Run the image classification
    let output = await classifier(image, {
        topk: 0, // Return all classes
    }).catch((error) => {
        // If an error occurs during classification, send an error message to the main thread
        self.postMessage({
            status: "error",
            task: "image-classification",
            data: error,
        });
        return null;
    });

    return output;
};