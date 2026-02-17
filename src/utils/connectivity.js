import NetInfo from "@react-native-community/netinfo";

/**
 * Utility to check the current network state.
 * Returns true if the device has an active and reachable internet connection.
 */
export const checkConnection = async () => {
    const state = await NetInfo.fetch();
    return state.isConnected && state.isInternetReachable;
};




