import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import HomeScreen from './screens/HomeScreen'
import F2FScreen from './screens/F2FScreen';
import { Provider } from 'react-redux';
import { store, persistor } from './store/centralStore';
import { PersistGate } from 'redux-persist/integration/react';
import TempScreen from "./screens/TempScreen";
function App() {

  const Stack = createNativeStackNavigator();

  return (
    <PersistGate persistor={persistor}>
      <Provider store={store}>
        <NavigationContainer>
          <Stack.Navigator initialRouteName='Home'>
            <Stack.Screen name="Home" component={HomeScreen} options={{
              headerShown: false,
            }} />
            <Stack.Screen name="F2F" component={F2FScreen} options={{
              headerShown: false,
            }} />
            <Stack.Screen name="temp" component={TempScreen} options={{
              headerShown: false,
            }} />
          </Stack.Navigator>
        </NavigationContainer>
      </Provider>
    </PersistGate>
  )
}

export default App