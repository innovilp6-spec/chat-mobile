import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import HomeScreen from './src/screens/HomeScreen'
import F2FScreen from './src/screens/F2FScreen';

function App() {

  const Stack = createNativeStackNavigator();

  return (
    // <Provider store={store}>
      <NavigationContainer>
        <Stack.Navigator initialRouteName='Home'>
          <Stack.Screen name="Home" component={HomeScreen} options={{
            headerShown: false,
          }} />
        <Stack.Screen name="F2F" component={F2FScreen} options={{
          headerShown: false,
        }} />
        </Stack.Navigator>
      </NavigationContainer>
    // </Provider>
  )
}

export default App