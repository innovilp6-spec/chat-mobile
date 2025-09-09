import { Children, createContext, useState } from "react";


export const demoContext = createContext();

export default function DemoProvider({ children }){
    const [data, setData] = useState("");

    return (
        <demoContext.Provider value={{ data, setData }}>
            {children}
        </demoContext.Provider>
    )
}

// keystore_password: omnichat_rni

/**
 * usage
 * 
 * 1. Adding to the context of applicaito
 * import DemoProvider from "../demoContext";
 * 
 * <DemoProvider>
 * <App/>
 * </DemoProvier>
 * 
 * 2. use in component
 * 
 * 
 * import {useContext} from "react"
 * import {demoContext} from "../demoContext";
 *
 *  const {data, setData}= useContext(demoContext); 
 */