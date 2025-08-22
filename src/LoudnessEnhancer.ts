import { NativeModules } from 'react-native';

interface LoudnessEnhancerInterface {
    initialize(audioSessionId: number): Promise<boolean>;
    setGain(gainDB: number): Promise<boolean>;
    release(): void;
}

declare module 'react-native' {
    interface NativeModulesStatic {
        LoudnessEnhancerModule: LoudnessEnhancerInterface;
    }
}

export const LoudnessEnhancer = NativeModules.LoudnessEnhancerModule;