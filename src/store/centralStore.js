import { legacy_createStore, applyMiddleware, combineReducers } from "redux";
import demoReducer from "./slices/demoSlice";
// import thunk form "redux-thunk";

const rootReducer= combineReducers({
    demo: demoReducer,
});


export const store= legacy_createStore(rootReducer,applyMiddleware(thunk));


