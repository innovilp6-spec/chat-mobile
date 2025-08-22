import { ToastAndroid } from "react-native";
import Tts from "react-native-tts";


export const showToastCommingSoon= (module,speak)=>{
    const message= `${module} is comming Soon`;
    ToastAndroid.showWithGravity(message, ToastAndroid.SHORT,ToastAndroid.TOP);
    if(speak)Tts.speak(message);
}

export const showToastInfo= (info,speak)=>{
    ToastAndroid.showWithGravity(info,ToastAndroid.SHORT,ToastAndroid.TOP);
    if(speak)Tts.speak(info);
}