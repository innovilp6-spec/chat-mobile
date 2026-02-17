import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import HomeScreen from './screens/HomeScreen'
import F2FScreen from './screens/F2FScreen';
import { Provider } from 'react-redux';
import { store, persistor } from './store/centralStore';
import { PersistGate } from 'redux-persist/integration/react';
import TempScreen from "./screens/TempScreen";
import LaunchScreen from './screens/LaunchScreen';
import A2AScreen from './screens/A2AScreen';

/**
 * Main Application Component.
 * Sets up Redux Provider, Redux Persist Gate, and React Navigation.
 */
function App() {

  const Stack = createNativeStackNavigator();

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <NavigationContainer>
          <Stack.Navigator initialRouteName='Home'>
            {/* Landing screen with language selection */}
            <Stack.Screen name="Home" component={HomeScreen} options={{
              headerShown: false,
            }} />

            {/* Audio-to-Audio conversation screen */}
            <Stack.Screen name="A2A" component={A2AScreen} options={{
              headerShown: false,
            }} />

            {/* Face-to-Face conversation screen */}
            <Stack.Screen name="F2F" component={F2FScreen} options={{
              headerShown: false,
            }} />

            {/* Utility and debug screens */}
            <Stack.Screen name="temp" component={TempScreen} options={{
              headerShown: false,
            }} />
            <Stack.Screen name="launch" component={LaunchScreen} options={{
              headerShown: false,
            }} />
          </Stack.Navigator>
        </NavigationContainer>
      </PersistGate>
    </Provider>
  )
}

export default App