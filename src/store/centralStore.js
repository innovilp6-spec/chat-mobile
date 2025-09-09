import { legacy_createStore, applyMiddleware, combineReducers } from 'redux';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { thunk } from 'redux-thunk';
import demoReducer from './slices/demoSlice';
import translationReducer from './slices/translationSlice';

const persistConfig = {
    key: 'root',
    storage: AsyncStorage,
    whitelist: ['translation'] 
};



const rootReducer = combineReducers({
    demo: demoReducer,
    translation: persistReducer(persistConfig, translationReducer),
});

export const store = legacy_createStore(rootReducer, applyMiddleware(thunk));
export const persistor = persistStore(store);


