import NetInfo from "@react-native-community/netinfo";

export const checkConnection = async () => {
    // return true;

    const state= await NetInfo.fetch();
    return state.isConnected && state.isInternetReachable;
}

 
 
 