import { NativeModules } from "react-native";

interface NoiseSuppressorInterface {
    initialize(audioSessionId: number): Promise<boolean>;
    release(): void;
    setEnabled(enabled: boolean): Promise<boolean>;
}

declare module 'react-native' {
    interface NativeModulesStatic {
        NoiseSuppressorModule: NoiseSuppressorInterface;
    }
}

export const NoiseSuppressor = NativeModules.NoiseSuppressorModule;