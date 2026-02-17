import { NativeModules } from "react-native";

/**
 * Interface for the native Android NoiseSuppressor functionality.
 * Reduces background noise during microphone capture.
 */
interface NoiseSuppressorInterface {
    /**
     * Initializes the suppressor for a specific audio session.
     * @param audioSessionId The ID of the audio session (0 for global capture).
     */
    initialize(audioSessionId: number): Promise<boolean>;

    /**
     * Clean up native references.
     */
    release(): void;

    /**
     * Toggles the suppression effect.
     * @param enabled True to enable, false to disable.
     */
    setEnabled(enabled: boolean): Promise<boolean>;
}

declare module 'react-native' {
    interface NativeModulesStatic {
        NoiseSuppressorModule: NoiseSuppressorInterface;
    }
}

/**
 * Exported native module for background noise reduction.
 */
export const NoiseSuppressor = NativeModules.NoiseSuppressorModule;