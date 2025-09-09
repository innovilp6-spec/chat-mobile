import { sERPrompt } from "../utils/prompts";
import { Audio } from 'react-native-compressor';
import { Recorder } from '@react-native-community/audio-toolkit';

const OPTIMAL_CONFIG = {
    model: "gemini-2.5-flash-lite-preview-06-17",
    compression: {
        maxFileSize: 200, // KB
        bitrate: 64,
        sampleRate: 22050
    },
    rateLimit: {
        requestsPerMinute: 12,
        delayBetweenRequests: 5000
    }
};


const API_KEY2 = "AIzaSyCmyRnnYcyZnc-JW4vmuJX9LjSqwpH4iPM";
const API_KEY = "AIzaSyAHC8t6u8D7i - apswYjwiHc - Ho3zSfMxa0";
// AIzaSyDOcsobzus7RAC5kHsBNIuFaCONysVu0X4



const startRecorder = () => {
    try {
        if (recorder) {
            recorder.stop();
            recorder = null;
        }

        recorder = new Recorder("recording.wav", {
            bitrate: 128000, // Lowered bitrate
            channels: 1,
            sampleRate: 44100, // Standard sample rate
            format: "wav",
            encoder: "pcm",
            quality: 'max'
        });

        recorder.prepare((err, fsPath) => {
            if (err) {
                showToastInfo("Recorder prepare error: " + err, true);
                console.error("Recorder prepare error:", err);
                return;
            }
            setFilePath(fsPath);
            recorder.record((error) => {
                if (error) {
                    console.error('Error starting recording:', error);
                    showToastInfo('Failed to start recording', true);
                } else {
                    showToastInfo("Recording started", false);
                }
            });
        });
    } catch (err) {
        showToastInfo("Error while recording: " + err, true);
        console.error("Recording error:", err);
    }
}

const stopRecorder = () => {
    try {
        if (recorder) {
            recorder.stop((err) => {
                if (err) {
                    showToastInfo("Stop recorder error: " + err, true);
                    console.error("Stop recorder error:", err);
                } else {
                    showToastInfo("Recording stopped", false);
                    // cosole.log("✅ Saved:", filePath);
                }
            });
        }
    } catch (err) {
        showToastInfo("Error while stopping recording: " + err, true);
        throw new Error(`Error while recording: ${err}`);
    }
}


const anayzeAudio = async () => {
    try {
        if (!filePath) {
            showToastInfo('No recorded audio file found', true);
            throw new Error('No recorded audio file found');
        }
        showToastInfo('Analyzing audio...', false);

        // cosole.log('Reading recorded audio from:', filePath);

        // Create temp path for processing
        const tempPath = `${RNFS.CachesDirectoryPath}/temp_audio_${Date.now()}.mp3`;

        // Read the recorded audio file
        const rawAudioData = await RNFS.readFile(filePath, 'base64');
        if (!rawAudioData) {
            showToastInfo('Could not read recorded audio file', true);
            throw new Error('Could not read recorded audio file');
        }

        // Write to temp file for compression
        await RNFS.writeFile(tempPath, rawAudioData, 'base64');
        showToastInfo('Compressing audio...', false);

        // Compress the audio
        // cosole.log('Compressing recorded audio...');
        const compressedPath = await Audio.compress(tempPath, {
            bitrate: OPTIMAL_CONFIG.compression.bitrate * 1000,
            samplerate: OPTIMAL_CONFIG.compression.sampleRate,
            quality: 'medium',
        });

        // Check compressed file size
        const fileSize = await getFileSize(compressedPath);
        // cosole.log('Compressed file size:', fileSize, 'KB');

        // Read the compressed file
        const compressedAudioData = await RNFS.readFile(compressedPath, 'base64');

        // Clean up temporary files
        await RNFS.unlink(tempPath);
        await RNFS.unlink(compressedPath);
        await RNFS.unlink(filePath); // Clean up original recording

        if (!apiKey) {
            showToastInfo('API key not found', true);
            throw new Error('API key not found');
        }

        showToastInfo('Sending audio for emotion analysis...', false);

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: OPTIMAL_CONFIG.model });

        // Add rate limiting delay
        await new Promise(resolve => setTimeout(resolve, OPTIMAL_CONFIG.rateLimit.delayBetweenRequests));

        const res = await model.generateContent([
            sERPrompt,
            {
                inlineData: {
                    data: compressedAudioData,
                    mimeType: "audio/wav"
                }
            }
        ]);

        const result = res.response.text()
            .replace(/```json/i, "")
            .replace(/```/g, "")
            .trim();

        const parsedResponse = JSON.parse(result);
        // cosole.log('Analysis result:', parsedResponse);

        showToastInfo(
            `Emotion: ${parsedResponse.emoji} ${parsedResponse.emotion} (${Math.round(parsedResponse.confidence * 100)}%)`,
            false
        );

        // Clear the filePath state after successful analysis
        setFilePath("");

        return parsedResponse;

    } catch (error) {
        showToastInfo("Emotion analysis error: " + (error.message || error), true);
        console.error("Error while analysing the audio: ", error);
        // Clean up files even if there's an error
        try {
            if (filePath) await RNFS.unlink(filePath);
            setFilePath("");
        } catch (cleanupError) {
            console.error("Error during cleanup:", cleanupError);
            showToastInfo("Error during cleanup:", false);
        }
        return { emotion: "neutral", emoji: "😐", confidence: 0.5 };
    }
}



const getFileSize = async (filePath) => {
    const stat = await RNFS.stat(filePath);
    return stat.size / 1024; // Convert to KB
};



// const audioFile = require('../assets/sad-hindi-song-piano-ambience-383331.mp3');

// const copyAudioFile = async () => {
//     try {
//         const exists = await RNFS.exists(destinationAudioPath);
//         if (!exists) {
//             // Get the absolute path to the source file
//             const absolutePath = RNFS.MainBundlePath + '/' + sourceAudioPath;
//             // cosole.log('Copying from:', absolutePath);
//             // cosole.log('Copying to:', destinationAudioPath);

//             await RNFS.copyFile(absolutePath, destinationAudioPath);
//             // cosole.log('Audio file copied successfully');
//         } else {
//             // cosole.log('Audio file already exists in destination');
//         }
//     } catch (error) {
//         console.error('Error copying audio file:', error);
//     }
// };





Array.prototype.myReduce= function(cb,initVal){
    
    let acc=initVal;
    for(let i=0;i<this.length;i++){
        acc= cb(acc,this[i],i,this);
    }
    return acc;
}

Function.prototype.myBind= function(thisContext,...args){

    thisContext= thisContext=== null || thisContext===undefined? globalThis: thisContext;
    let cb= this;
    return (...extra)=>{
        return cb.call(thisContext,...args, ...extra);
    }
}



Array.prototype.myFlat= function(depth=1){
    if(depth===0) return this;
    let res= [];
    for(let i=0;i<this.length;i++){
        if(Array.isArray(this[i])){
            res= res.concat(this[i].myFlat(depth-1));
        }
        else res.push(this[i]);
    }
    return res;
}


Object.deepCopy= function(obj){
    if(!obj) return Object(obj);

    if(["number", "float", "string"].includes(typeof obj))
        return obj;

    if (obj instanceof Map) {
        let res = new Map();
        obj = Array.from(obj);
        for(let [key,val] in obj){
            res.set(key,val);
        }
        return res;
    }

    if(obj instanceof Set){
        let res= new Set();
        obj= Array.from(obj);
        obj.forEach(item => {
            res.add(Object.deepCopy(item));
        });
        return res;
    }

    if(obj instanceof Date){
        let res= new Date(obj);
        return res;
    }

    if(obj instanceof RegExp){
        let res= new RegExp(obj);
        return res;
    }

    if(Array.isArray(obj)){
        let res=[];
        for(let i=0;i<obj.length;i++){
            res.push(Object.deepCopy(obj[i]));
        }
        return res;
    }

    let res= {};

    for(let key in obj){
        res[key]= Object.deepCopy(obj[key]);
    }
    return res;

}




class LRUCache{
    constructor(limit=5){
        this.cache= new Map();
        this.limit= limit;
    }

    get(key){
        if(!this.cache.has(key)) return null;
        let val= this.cache.get(key);
        this.cache.delete(key);
        this.cache.set(key,val);
        return val;
    }

    set(key,val){
        if(this.cache.has(key)) this.cache.delete(key);
        this.cache.set(key,val);
        if(this.cache.size>this.limit){
            let oldestKey= this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
    }
}



