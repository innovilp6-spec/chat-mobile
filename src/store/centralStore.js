import { legacy_createStore, applyMiddleware, combineReducers } from 'redux';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { thunk } from 'redux-thunk';
import demoReducer from './slices/demoSlice';
import translationReducer from './slices/translationSlice';

/**
 * Persistence configuration for Redux Persist.
 * Whitellist ensures only translation settings are saved to AsyncStorage.
 */
const persistConfig = {
    key: 'root',
    storage: AsyncStorage,
    whitelist: ['translation'],
    timeout: 0, // Disable rehydration timeout to prevent "rehydrate for root called after timeout" error
};

/**
 * Combined root reducer for the application.
 */
const rootReducer = combineReducers({
    demo: demoReducer,
    translation: persistReducer(persistConfig, translationReducer),
});

/**
 * Redux store initialized with Thunk middleware for async actions.
 */
export const store = legacy_createStore(rootReducer, applyMiddleware(thunk));

/**
 * Persistor instance for manually controlling state hydration.
 */
export const persistor = persistStore(store);


