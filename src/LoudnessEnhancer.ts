import { NativeModules } from 'react-native';

/**
 * Interface for the native Android LoudnessEnhancer functionality.
 * Allows increasing audio output gain at the OS level.
 */
interface LoudnessEnhancerInterface {
    /**
     * Connects the enhancer to a specific Android audio session.
     * @param audioSessionId The ID of the audio session (0 for global).
     */
    initialize(audioSessionId: number): Promise<boolean>;

    /**
     * Sets the target gain in decibels.
     * @param gainDB Target boost in dB (typically 0-30).
     */
    setGain(gainDB: number): Promise<boolean>;

    /**
     * Releases native resources.
     */
    release(): void;
}

declare module 'react-native' {
    interface NativeModulesStatic {
        LoudnessEnhancerModule: LoudnessEnhancerInterface;
    }
}

/**
 * Exported native module for audio amplification.
 */
export const LoudnessEnhancer = NativeModules.LoudnessEnhancerModule;